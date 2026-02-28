/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, useState, type JSX, type ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import type { RoomListViewModel } from "@element-hq/web-shared-components";

import { ChannelListItem } from "./ChannelListItem";
import type { CategoryId } from "./useCategorizedRooms";

interface RoomCategorySectionProps {
    /** Category identifier for localStorage persistence */
    id: CategoryId;
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
}

const STORAGE_PREFIX = "mx_category_collapsed_";

function getInitialCollapsed(id: string): boolean {
    try {
        return localStorage.getItem(`${STORAGE_PREFIX}${id}`) === "true";
    } catch {
        return false;
    }
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
}: RoomCategorySectionProps): JSX.Element {
    const [isCollapsed, setIsCollapsed] = useState(() => getInitialCollapsed(id));

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

    return (
        <div className="mx_RoomCategorySection">
            <button
                className="mx_RoomCategorySection_header"
                onClick={toggle}
                aria-expanded={!isCollapsed}
            >
                <span className="mx_RoomCategorySection_chevron" aria-hidden="true">
                    {isCollapsed ? <ChevronRightIcon width="12" height="12" /> : <ChevronDownIcon width="12" height="12" />}
                </span>
                <span className="mx_RoomCategorySection_label">{label}</span>
                <span className="mx_RoomCategorySection_count">{roomIds.length}</span>
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
