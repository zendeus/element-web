/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, type JSX } from "react";
import { Button, InlineSpinner } from "@vector-im/compound-web";
import ChatIcon from "@vector-im/compound-design-tokens/assets/web/icons/chat";

import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { Action } from "../../../../dispatcher/actions";
import type { ISuggestedRoom } from "../../../../stores/spaces";
import { _t } from "../../../../languageHandler";

interface SuggestedRoomItemProps {
    room: ISuggestedRoom;
    onJoin: (roomId: string) => Promise<void>;
    isJoining: boolean;
}

/**
 * A dimmed entry for a suggested room in the space.
 * On click, opens the room preview. Shows a "Join" button on hover.
 */
export function SuggestedRoomItem({ room, onJoin, isJoining }: SuggestedRoomItemProps): JSX.Element {
    const handleClick = useCallback(() => {
        defaultDispatcher.dispatch({
            action: Action.ViewRoom,
            room_id: room.room_id,
            oob_data: {
                name: room.name || room.canonical_alias || room.room_id,
                avatarUrl: room.avatar_url,
            },
            via_servers: room.viaServers,
        });
    }, [room]);

    const handleJoinClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onJoin(room.room_id);
        },
        [room.room_id, onJoin],
    );

    return (
        <div
            className="mx_SuggestedRoomItem"
            role="option"
            aria-label={`${room.name || room.canonical_alias || room.room_id} (suggested)`}
            onClick={handleClick}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <span className="mx_SuggestedRoomItem_icon" aria-hidden="true">
                <ChatIcon width="16" height="16" />
            </span>
            <span className="mx_SuggestedRoomItem_name">
                {room.name || room.canonical_alias || room.room_id}
            </span>
            <span className="mx_SuggestedRoomItem_actions">
                {isJoining ? (
                    <InlineSpinner />
                ) : (
                    <Button size="sm" kind="secondary" onClick={handleJoinClick}>
                        {_t("room_list|join_button")}
                    </Button>
                )}
            </span>
        </div>
    );
}
