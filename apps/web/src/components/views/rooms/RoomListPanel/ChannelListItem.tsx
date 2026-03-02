/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { memo, type ReactNode } from "react";
import {
    useViewModel,
    NotificationDecoration,
    RoomListItemContextMenu,
    type RoomItemViewModel,
} from "@element-hq/web-shared-components";

import { VoiceParticipantList } from "./VoiceParticipantList";

interface ChannelListItemProps {
    /** Per-room view model from RoomListViewViewModel.getRoomItemViewModel() */
    vm: RoomItemViewModel;
    /** Whether this room is the currently active/selected room */
    isSelected: boolean;
    /** Category type icon (e.g. # for text, headphones for voice) */
    categoryIcon: ReactNode;
}

/**
 * Individual channel/room entry in the categorized sidebar.
 * Slack-style comfortable density (~44px) with type icon, name, preview, and notification badge.
 */
export const ChannelListItem: React.FC<ChannelListItemProps> = memo(function ChannelListItem({
    vm,
    isSelected,
    categoryIcon,
}) {
    const item = useViewModel(vm);

    const className = `mx_ChannelListItem${isSelected ? " mx_ChannelListItem_selected" : ""}${item.isBold ? " mx_ChannelListItem_bold" : ""}`;

    const hasCall = !!item.notification.callType;

    return (
        <RoomListItemContextMenu vm={vm}>
            <div className="mx_ChannelListItem_wrapper">
                <button
                    className={className}
                    role="option"
                    aria-selected={isSelected}
                    onClick={vm.onOpenRoom}
                    title={item.name}
                >
                    <span className="mx_ChannelListItem_icon" aria-hidden="true">
                        {categoryIcon}
                    </span>
                    <span className="mx_ChannelListItem_name">{item.name}</span>
                    {item.messagePreview && (
                        <span className="mx_ChannelListItem_preview">{item.messagePreview}</span>
                    )}
                    <NotificationDecoration {...item.notification} />
                </button>
                {hasCall && <VoiceParticipantList roomId={item.id} />}
            </div>
        </RoomListItemContextMenu>
    );
});
