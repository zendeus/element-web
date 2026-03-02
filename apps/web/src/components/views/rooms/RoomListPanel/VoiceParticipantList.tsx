/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, useContext, useMemo, type JSX } from "react";
import type { RoomMember } from "matrix-js-sdk/src/matrix";
import { ContextMenu, MenuItem } from "@vector-im/compound-web";
import UserProfileIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-profile";
import { ChatIcon, MentionIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { useCall, useParticipatingMembers } from "../../../../hooks/useCall";
import type { Call } from "../../../../models/Call";
import MemberAvatar from "../../avatars/MemberAvatar";
import dis from "../../../../dispatcher/dispatcher";
import { Action } from "../../../../dispatcher/actions";
import { type ComposerInsertPayload } from "../../../../dispatcher/payloads/ComposerInsertPayload";
import { TimelineRenderingType } from "../../../../contexts/RoomContext";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import { DirectoryMember, startDmOnFirstMessage } from "../../../../utils/direct-messages";

const MAX_PARTICIPANTS = 8;

interface VoiceParticipantRowProps {
    member: RoomMember;
}

const VoiceParticipantRow: React.FC<VoiceParticipantRowProps> = ({ member }) => {
    const cli = useContext(MatrixClientContext);
    const isSelf = member.userId === cli.getUserId();

    const onViewProfile = useCallback(() => {
        dis.dispatch({
            action: Action.ViewUser,
            member,
            push: true,
        });
    }, [member]);

    const onSendMessage = useCallback(() => {
        const startDmUser = new DirectoryMember({
            user_id: member.userId,
            display_name: member.rawDisplayName,
            avatar_url: member.getMxcAvatarUrl() ?? undefined,
        });
        startDmOnFirstMessage(cli, [startDmUser]);
    }, [cli, member]);

    const onMention = useCallback(() => {
        dis.dispatch<ComposerInsertPayload>({
            action: Action.ComposerInsert,
            userId: member.userId,
            timelineRenderingType: TimelineRenderingType.Room,
        });
    }, [member.userId]);

    return (
        <ContextMenu
            title="Participant options"
            showTitle={false}
            hasAccessibleAlternative={false}
            trigger={
                <div className="mx_VoiceParticipantRow">
                    <MemberAvatar member={member} size="20px" hideTitle />
                    <span className="mx_VoiceParticipantRow_name">{member.name}</span>
                </div>
            }
        >
            <MenuItem Icon={UserProfileIcon} label="View Profile" onSelect={onViewProfile} />
            {!isSelf && <MenuItem Icon={ChatIcon} label="Send Message" onSelect={onSendMessage} />}
            {!isSelf && <MenuItem Icon={MentionIcon} label="Mention" onSelect={onMention} />}
        </ContextMenu>
    );
};

interface InnerListProps {
    call: Call;
}

/**
 * Inner component that uses hooks requiring a non-null Call.
 * Separated to satisfy React's rules of hooks (no conditional hook calls).
 */
const VoiceParticipantListInner: React.FC<InnerListProps> = ({ call }) => {
    const members = useParticipatingMembers(call);

    // Deduplicate members by userId (hook repeats per device)
    const uniqueMembers = useMemo(() => {
        const seen = new Set<string>();
        return members.filter((m) => {
            if (seen.has(m.userId)) return false;
            seen.add(m.userId);
            return true;
        });
    }, [members]);

    if (uniqueMembers.length === 0) return null;

    const visible = uniqueMembers.slice(0, MAX_PARTICIPANTS);
    const overflow = uniqueMembers.length - MAX_PARTICIPANTS;

    return (
        <div className="mx_VoiceParticipantList">
            {visible.map((member) => (
                <VoiceParticipantRow key={member.userId} member={member} />
            ))}
            {overflow > 0 && (
                <span className="mx_VoiceParticipantList_overflow">+{overflow} more</span>
            )}
        </div>
    );
};

interface VoiceParticipantListProps {
    roomId: string;
}

/**
 * Discord-style voice channel participant list.
 * Shows avatars + names of users currently connected to a call in the given room.
 */
export const VoiceParticipantList: React.FC<VoiceParticipantListProps> = ({ roomId }): JSX.Element | null => {
    const call = useCall(roomId);
    if (!call) return null;
    return <VoiceParticipantListInner call={call} />;
};
