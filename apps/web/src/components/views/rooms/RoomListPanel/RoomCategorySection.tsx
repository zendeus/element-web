/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, useEffect, useState, type JSX, type ReactNode } from "react";
import { ChevronRightIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import OverflowHorizontalIcon from "@vector-im/compound-design-tokens/assets/web/icons/overflow-horizontal";
import HomeIcon from "@vector-im/compound-design-tokens/assets/web/icons/home";
import SettingsIcon from "@vector-im/compound-design-tokens/assets/web/icons/settings";
import UserAddIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-add";
import type { RoomListViewModel } from "@element-hq/web-shared-components";
import { IconButton, Menu, MenuItem } from "@vector-im/compound-web";

import { ChannelListItem } from "./ChannelListItem";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { RoomNotificationStateStore } from "../../../../stores/notifications/RoomNotificationStateStore";
import { NotificationLevel } from "../../../../stores/notifications/NotificationLevel";
import { NotificationStateEvents } from "../../../../stores/notifications/NotificationState";
import SpaceStore from "../../../../stores/spaces/SpaceStore";
import defaultDispatcher from "../../../../dispatcher/dispatcher";

interface RoomCategorySectionProps {
    /** Category identifier for localStorage persistence (static CategoryId or dynamic subspace room ID) */
    id: string;
    /** Display label for the category header */
    label: string;
    /** Icon to show next to each room in this category */
    categoryIcon: ReactNode;
    /** Room IDs belonging to this category */
    roomIds: string[];
    /** The room list view model (to get per-room VMs) */
    vm: RoomListViewModel;
    /** Currently selected room ID */
    selectedRoomId?: string;
    /** Whether this category represents a subspace */
    isSubspace?: boolean;
    /** The subspace room ID (when isSubspace is true) */
    spaceId?: string;
}

const STORAGE_PREFIX = "mx_category_collapsed_";

function getInitialCollapsed(id: string): boolean {
    try {
        return localStorage.getItem(`${STORAGE_PREFIX}${id}`) === "true";
    } catch {
        return false;
    }
}

function useNotificationCount(roomIds: string[]): number {
    const matrixClient = useMatrixClientContext();
    const [count, setCount] = useState(() => computeCount(roomIds, matrixClient));

    useEffect(() => {
        const handlers: Array<() => void> = [];
        const states = roomIds
            .map((id) => matrixClient.getRoom(id))
            .filter(Boolean)
            .map((room) => RoomNotificationStateStore.instance.getRoomState(room!));

        const update = (): void => setCount(computeCount(roomIds, matrixClient));

        for (const state of states) {
            state.on(NotificationStateEvents.Update, update);
            handlers.push(() => state.off(NotificationStateEvents.Update, update));
        }

        // Recompute in case rooms changed between render and effect
        update();

        return () => handlers.forEach((h) => h());
    }, [roomIds, matrixClient]);

    return count;
}

function computeCount(roomIds: string[], matrixClient: ReturnType<typeof useMatrixClientContext>): number {
    let total = 0;
    for (const roomId of roomIds) {
        const room = matrixClient.getRoom(roomId);
        if (!room) continue;
        const state = RoomNotificationStateStore.instance.getRoomState(room);
        if (state.level >= NotificationLevel.Notification) {
            total += state.count;
        }
    }
    return total;
}

/**
 * A collapsible category section in the categorized room list.
 * Renders a header with chevron + label + count, and a list of ChannelListItems.
 * Collapsed state is persisted to localStorage.
 */
export function RoomCategorySection({
    id,
    label,
    categoryIcon,
    roomIds,
    vm,
    selectedRoomId,
    isSubspace,
    spaceId,
}: RoomCategorySectionProps): JSX.Element {
    const notificationCount = useNotificationCount(roomIds);
    const [isCollapsed, setIsCollapsed] = useState(() => getInitialCollapsed(id));
    const [menuOpen, setMenuOpen] = useState(false);

    const toggle = useCallback(() => {
        setIsCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${id}`, String(next));
            } catch {
                // localStorage may be unavailable
            }
            return next;
        });
    }, [id]);

    const handleOpenSpace = useCallback(() => {
        if (spaceId) {
            SpaceStore.instance.setActiveSpace(spaceId);
        }
    }, [spaceId]);

    const handleSpaceSettings = useCallback(() => {
        if (spaceId) {
            defaultDispatcher.dispatch({ action: "open_room_settings", room_id: spaceId });
        }
    }, [spaceId]);

    const handleInvite = useCallback(() => {
        if (spaceId) {
            defaultDispatcher.dispatch({ action: "view_invite", roomId: spaceId });
        }
    }, [spaceId]);

    return (
        <div className={`mx_RoomCategorySection${isSubspace ? " mx_RoomCategorySection_subspace" : ""}`}>
            <button
                className="mx_RoomCategorySection_header"
                onClick={toggle}
                aria-expanded={!isCollapsed}
            >
                <span
                    className="mx_RoomCategorySection_chevron"
                    data-expanded={!isCollapsed}
                    aria-hidden="true"
                >
                    <ChevronRightIcon width="12" height="12" />
                </span>
                <span className="mx_RoomCategorySection_label">{label}</span>
                {notificationCount > 0 && <span className="mx_RoomCategorySection_count">{notificationCount}</span>}
                {isSubspace && spaceId && (
                    <span
                        className="mx_RoomCategorySection_options"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Menu
                            open={menuOpen}
                            onOpenChange={setMenuOpen}
                            title={label}
                            align="start"
                            trigger={
                                <IconButton
                                    size="20px"
                                    style={{ padding: "2px" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(true);
                                    }}
                                    aria-label={`Options for ${label}`}
                                >
                                    <OverflowHorizontalIcon width="14" height="14" />
                                </IconButton>
                            }
                        >
                            <MenuItem
                                Icon={HomeIcon}
                                label="Open Space"
                                onSelect={handleOpenSpace}
                                hideChevron
                            />
                            <MenuItem
                                Icon={SettingsIcon}
                                label="Space Settings"
                                onSelect={handleSpaceSettings}
                                hideChevron
                            />
                            <MenuItem
                                Icon={UserAddIcon}
                                label="Invite People"
                                onSelect={handleInvite}
                                hideChevron
                            />
                        </Menu>
                    </span>
                )}
            </button>
            {!isCollapsed && (
                <div className="mx_RoomCategorySection_rooms" role="listbox" aria-label={label}>
                    {roomIds.map((roomId) => (
                        <ChannelListItem
                            key={roomId}
                            vm={vm.getRoomItemViewModel(roomId)}
                            isSelected={roomId === selectedRoomId}
                            categoryIcon={categoryIcon}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
