/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type IEventRelation, type MatrixEvent, type Room, THREAD_RELATION_TYPE } from "matrix-js-sdk/src/matrix";
import {
    AttachmentIcon,
    LockOffIcon,
    LockSolidIcon,
    MicOnIcon,
    SendSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { Tooltip } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import type ResizeNotifier from "../../../utils/ResizeNotifier";
import { type RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { E2EStatus } from "../../../utils/ShieldUtils";
import SendMessageComposer, { type SendMessageComposer as SendMessageComposerClass } from "./SendMessageComposer";
import E2EIcon from "./E2EIcon";
import ReplyPreview from "./ReplyPreview";
import { UserIdentityWarning } from "./UserIdentityWarning";
import { EmojiButton } from "./EmojiButton";
import VoiceRecordComposerTile from "./VoiceRecordComposerTile";
import AccessibleButton from "../elements/AccessibleButton";
import ContentMessages from "../../../ContentMessages";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { type ComposerInsertPayload } from "../../../dispatcher/payloads/ComposerInsertPayload";
import { VoiceRecordingStore } from "../../../stores/VoiceRecordingStore";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { RecordingState } from "../../../audio/VoiceRecording";
import type { VoiceMessageRecording } from "../../../audio/VoiceMessageRecording";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import type EditorModel from "../../../editor/model";
import { chromeFileInputFix } from "../../../utils/BrowserWorkarounds";
import { useDispatcher } from "../../../hooks/useDispatcher";
import { useScopedRoomContext } from "../../../contexts/ScopedRoomContext.tsx";

interface ThreadMessageComposerProps {
    room: Room;
    resizeNotifier: ResizeNotifier;
    relation?: IEventRelation;
    replyToEvent?: MatrixEvent;
    permalinkCreator?: RoomPermalinkCreator;
    e2eStatus?: E2EStatus;
}

const ThreadMessageComposer: React.FC<ThreadMessageComposerProps> = ({
    room,
    resizeNotifier,
    relation,
    replyToEvent,
    permalinkCreator,
    e2eStatus,
}) => {
    const { timelineRenderingType, canSendMessages, tombstone } = useScopedRoomContext(
        "timelineRenderingType",
        "canSendMessages",
        "tombstone",
    );

    const composerRef = useRef<SendMessageComposerClass>(null);
    const voiceRef = useRef<VoiceRecordComposerTile>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isComposerEmpty, setIsComposerEmpty] = useState(true);
    const [haveRecording, setHaveRecording] = useState(false);

    // Track voice recording state via VoiceRecordingStore
    const relationEventId = relation?.event_id;
    useEffect(() => {
        const voiceRecordingId = VoiceRecordingStore.getVoiceRecordingId(room, relation);
        let currentRecording: VoiceMessageRecording | undefined;

        const onRecordingStarted = (): void => {
            setHaveRecording(true);
        };

        const updateRecording = (): void => {
            if (currentRecording) {
                currentRecording.off(RecordingState.Started, onRecordingStarted);
            }
            const recording = VoiceRecordingStore.instance.getActiveRecording(voiceRecordingId);
            currentRecording = recording;

            if (recording) {
                recording.on(RecordingState.Started, onRecordingStarted);
                if (recording.hasRecording && !recording.isRecording) {
                    setHaveRecording(true);
                }
            } else {
                setHaveRecording(false);
            }
        };

        VoiceRecordingStore.instance.on(UPDATE_EVENT, updateRecording);
        updateRecording();

        return () => {
            VoiceRecordingStore.instance.off(UPDATE_EVENT, updateRecording);
            if (currentRecording) {
                currentRecording.off(RecordingState.Started, onRecordingStarted);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room, relationEventId]);

    // Handle upload_file action from keyboard shortcut (Ctrl+U dispatched by ThreadView)
    useDispatcher(dis, (payload) => {
        if (payload.action === "upload_file" && payload.context === timelineRenderingType) {
            onUploadClick();
        }
    });

    // Notify resize when reply preview appears/disappears
    useEffect(() => {
        if (replyToEvent) {
            const timer = window.setTimeout(() => {
                resizeNotifier.notifyTimelineHeightChanged();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [replyToEvent, resizeNotifier]);

    const onChange = useCallback((model: EditorModel): void => {
        setIsComposerEmpty(model.isEmpty);
    }, []);

    const addEmoji = useCallback(
        (emoji: string): boolean => {
            dis.dispatch<ComposerInsertPayload>({
                action: Action.ComposerInsert,
                text: emoji,
                timelineRenderingType: timelineRenderingType,
            });
            return true;
        },
        [timelineRenderingType],
    );

    const sendMessage = useCallback(async (): Promise<void> => {
        if (haveRecording && voiceRef.current) {
            await voiceRef.current.send();
            return;
        }
        composerRef.current?.sendMessage();
    }, [haveRecording]);

    const onUploadClick = useCallback((): void => {
        if (MatrixClientPeg.safeGet().isGuest()) {
            dis.dispatch({ action: "require_registration" });
            return;
        }
        fileInputRef.current?.click();
    }, []);

    const onFileInputChange = useCallback(
        (ev: React.ChangeEvent<HTMLInputElement>): void => {
            if (!ev.target.files?.length) return;
            ContentMessages.sharedInstance().sendContentListToRoom(
                Array.from(ev.target.files),
                room.roomId,
                relation,
                replyToEvent,
                MatrixClientPeg.safeGet(),
                timelineRenderingType,
            );
            ev.target.value = "";
        },
        [room.roomId, relation, replyToEvent, timelineRenderingType],
    );

    const onRecordClick = useCallback((): void => {
        voiceRef.current?.onRecordStartEndClick();
    }, []);

    // No-op: sticker picker is not shown in thread composer
    const toggleStickerPickerOpen = useCallback(() => {}, []);

    const placeholder = useMemo((): string => {
        if (replyToEvent) {
            if (relation?.rel_type === THREAD_RELATION_TYPE.name && e2eStatus) {
                return _t("composer|placeholder_thread_encrypted");
            } else if (relation?.rel_type === THREAD_RELATION_TYPE.name) {
                return _t("composer|placeholder_thread");
            }
        }
        return e2eStatus ? _t("composer|placeholder_encrypted") : _t("composer|placeholder");
    }, [replyToEvent, relation, e2eStatus]);

    const canSend = canSendMessages && !tombstone;
    const showSendButton = canSend && (!isComposerEmpty || haveRecording);

    // E2E icon
    let e2eIcon: JSX.Element | null = null;
    if (e2eStatus === E2EStatus.Normal) {
        e2eIcon = (
            <Tooltip label={_t("composer|placeholder_encrypted")}>
                <LockSolidIcon
                    aria-label={_t("composer|placeholder_encrypted")}
                    width="12px"
                    height="12px"
                    color="var(--cpd-color-icon-success-primary)"
                    className="mx_ThreadMessageComposer_e2eIcon"
                />
            </Tooltip>
        );
    } else if (e2eStatus === E2EStatus.Warning) {
        e2eIcon = (
            <E2EIcon status={e2eStatus} className="mx_ThreadMessageComposer_e2eIcon" size={12} />
        );
    } else if (!e2eStatus) {
        e2eIcon = (
            <Tooltip label={_t("composer|room_unencrypted")}>
                <LockOffIcon
                    aria-label={_t("composer|room_unencrypted")}
                    width="12px"
                    height="12px"
                    color="var(--cpd-color-icon-tertiary)"
                    className="mx_ThreadMessageComposer_e2eIcon"
                />
            </Tooltip>
        );
    }

    if (!canSend) {
        return (
            <div className="mx_ThreadMessageComposer">
                <div className="mx_ThreadMessageComposer_divider" />
                <div className="mx_ThreadMessageComposer_noperm">{_t("composer|no_perms_notice")}</div>
            </div>
        );
    }

    return (
        <div className="mx_ThreadMessageComposer">
            <div className="mx_ThreadMessageComposer_divider" />

            <UserIdentityWarning room={room} key={room.roomId} />

            <ReplyPreview replyToEvent={replyToEvent} permalinkCreator={permalinkCreator} />

            <div className="mx_ThreadMessageComposer_editor">
                {e2eIcon}
                <SendMessageComposer
                    ref={composerRef}
                    room={room}
                    placeholder={placeholder}
                    relation={relation}
                    replyToEvent={replyToEvent}
                    onChange={onChange}
                    disabled={haveRecording}
                    toggleStickerPickerOpen={toggleStickerPickerOpen}
                />
            </div>

            {/* Voice recording UI — renders nothing when not active */}
            <VoiceRecordComposerTile ref={voiceRef} room={room} relation={relation} replyToEvent={replyToEvent} />

            <div className="mx_ThreadMessageComposer_toolbar">
                <EmojiButton addEmoji={addEmoji} className="mx_ThreadMessageComposer_toolbarBtn" />
                <AccessibleButton
                    className="mx_ThreadMessageComposer_toolbarBtn"
                    onClick={onUploadClick}
                    title={_t("common|attachment")}
                >
                    <AttachmentIcon />
                </AccessibleButton>
                {!haveRecording && (
                    <AccessibleButton
                        className="mx_ThreadMessageComposer_toolbarBtn"
                        onClick={onRecordClick}
                        title={_t("composer|voice_message_button")}
                    >
                        <MicOnIcon />
                    </AccessibleButton>
                )}
                <div className="mx_ThreadMessageComposer_toolbar_spacer" />
                {showSendButton && (
                    <AccessibleButton
                        className="mx_ThreadMessageComposer_sendBtn"
                        onClick={sendMessage}
                        title={
                            haveRecording ? _t("composer|send_button_voice_message") : _t("composer|send_button_title")
                        }
                        data-testid="thread-sendmessagebtn"
                    >
                        <SendSolidIcon />
                    </AccessibleButton>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                multiple
                onClick={chromeFileInputFix}
                onChange={onFileInputChange}
            />
        </div>
    );
};

export default ThreadMessageComposer;
