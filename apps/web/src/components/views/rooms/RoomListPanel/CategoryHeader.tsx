/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, useState, type JSX } from "react";
import { ChevronRightIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import OverflowHorizontalIcon from "@vector-im/compound-design-tokens/assets/web/icons/overflow-horizontal";
import HomeIcon from "@vector-im/compound-design-tokens/assets/web/icons/home";
import SettingsIcon from "@vector-im/compound-design-tokens/assets/web/icons/settings";
import UserAddIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-add";
import { IconButton, Menu, MenuItem } from "@vector-im/compound-web";

import SpaceStore from "../../../../stores/spaces/SpaceStore";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { useNotificationCount } from "./useNotificationCount";
import { _t } from "../../../../languageHandler";

interface CategoryHeaderProps {
    id: string;
    label: string;
    roomCount: number;
    roomIds: string[];
    isCollapsed: boolean;
    onToggle: () => void;
    isSubspace?: boolean;
    spaceId?: string;
    /** Whether to show a divider line above this header (e.g. subspace/category boundary) */
    showDivider?: boolean;
}

/**
 * Standalone header component for a room category section.
 * Extracted from RoomCategorySection to support virtualized rendering.
 */
export function CategoryHeader({
    id,
    label,
    roomCount,
    roomIds,
    isCollapsed,
    onToggle,
    isSubspace,
    spaceId,
    showDivider,
}: CategoryHeaderProps): JSX.Element {
    const notificationCount = useNotificationCount(roomIds);
    const [menuOpen, setMenuOpen] = useState(false);

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
        <div
            className={`mx_RoomCategorySection${isSubspace ? " mx_RoomCategorySection_subspace" : ""}${showDivider ? " mx_RoomCategorySection_divider" : ""}`}
            role="group"
            aria-label={label}
        >
            <button className="mx_RoomCategorySection_header" onClick={onToggle} aria-expanded={!isCollapsed}>
                <span className="mx_RoomCategorySection_chevron" data-expanded={!isCollapsed} aria-hidden="true">
                    <ChevronRightIcon width="12" height="12" />
                </span>
                <span className="mx_RoomCategorySection_label">{label}</span>
                {notificationCount > 0 && (
                    <span className="mx_RoomCategorySection_count">
                        {notificationCount}
                    </span>
                )}
                {isSubspace && spaceId && (
                    <span className="mx_RoomCategorySection_options" onClick={(e) => e.stopPropagation()}>
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
                            <MenuItem Icon={HomeIcon} label={_t("room_list|subspace_menu_open")} onSelect={handleOpenSpace} hideChevron />
                            <MenuItem
                                Icon={SettingsIcon}
                                label={_t("room_list|subspace_menu_settings")}
                                onSelect={handleSpaceSettings}
                                hideChevron
                            />
                            <MenuItem Icon={UserAddIcon} label={_t("room_list|subspace_menu_invite")} onSelect={handleInvite} hideChevron />
                        </Menu>
                    </span>
                )}
            </button>
        </div>
    );
}
