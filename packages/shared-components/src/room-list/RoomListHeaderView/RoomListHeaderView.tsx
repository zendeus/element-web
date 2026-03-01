/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX } from "react";
import { IconButton } from "@vector-im/compound-web";
import ComposeIcon from "@vector-im/compound-design-tokens/assets/web/icons/compose";

import { type ViewModel, useViewModel } from "../../viewmodel";
import { Flex } from "../../utils/Flex";
import { useI18n } from "../../utils/i18nContext";
import { ComposeMenuView, OptionMenuView, SpaceMenuView } from "./menu";
import styles from "./RoomListHeaderView.module.css";

/**
 * The available sorting options for the room list.
 */
export type SortOption = "recent" | "alphabetical" | "unread-first";

export interface RoomListHeaderViewSnapshot {
    /**
     * The title of the room list
     */
    title: string;
    /**
     * Whether to display the compose menu
     * True if the user can create rooms
     */
    displayComposeMenu: boolean;
    /**
     * Whether to display the space menu
     * True if there is an active space
     */
    displaySpaceMenu: boolean;
    /**
     * Whether the user can create rooms
     */
    canCreateRoom: boolean;
    /**
     * Whether the user can create video rooms
     */
    canCreateVideoRoom: boolean;
    /**
     * Whether the user can create a subspace in the active space
     */
    canCreateSubspace: boolean;
    /**
     * Whether the user can invite in the active space
     */
    canInviteInSpace: boolean;
    /**
     * Whether the user can access space settings
     */
    canAccessSpaceSettings: boolean;
    /**
     * Ancestor space path from root to immediate parent, if viewing a subspace.
     * Each entry has an id and name. Undefined on root spaces or Home.
     */
    ancestorPath?: Array<{ id: string; name: string }>;
    /**
     * The currently active sort option.
     */
    activeSortOption: SortOption;
    /**
     * Whether message previews are enabled in the room list.
     */
    isMessagePreviewEnabled: boolean;
}

export interface RoomListHeaderViewActions {
    /**
     * Create a chat room
     */
    createChatRoom: (e: Event) => void;
    /**
     * Create a room
     */
    createRoom: (e: Event) => void;
    /**
     * Create a video room
     */
    createVideoRoom: () => void;
    /**
     * Create a subspace in the active space
     */
    createSubspace: () => void;
    /**
     * Open the active space home
     */
    openSpaceHome: () => void;
    /**
     * Display the space invite dialog
     */
    inviteInSpace: () => void;
    /**
     * Open the space preferences
     */
    openSpacePreferences: () => void;
    /**
     * Open the space settings
     */
    openSpaceSettings: () => void;
    /**
     * Change the sort order of the room-list.
     */
    sort: (option: SortOption) => void;
    /**
     * Toggle message preview display in the room list.
     */
    toggleMessagePreview: () => void;
    /**
     * Navigate to the parent space of the current subspace.
     */
    navigateToParentSpace: () => void;
    /**
     * Navigate to a specific ancestor space by room ID.
     */
    navigateToAncestorSpace: (roomId: string) => void;
}

/**
 * The view model for the room list header component.
 */
export type RoomListHeaderViewModel = ViewModel<RoomListHeaderViewSnapshot, RoomListHeaderViewActions>;

interface RoomListHeaderViewProps {
    /**
     * The view model for the room list header component.
     */
    vm: RoomListHeaderViewModel;
}

/**
 * The header view for the room list
 * The space name is displayed and a compose menu is shown if the user can create rooms
 *
 * @example
 * ```tsx
 * <RoomListHeaderView vm={roomListHeaderViewModel} />
 * ```
 */
export function RoomListHeaderView({ vm }: Readonly<RoomListHeaderViewProps>): JSX.Element {
    const { translate: _t } = useI18n();
    const { title, displaySpaceMenu, displayComposeMenu, ancestorPath } = useViewModel(vm);

    return (
        <Flex
            as="header"
            className={styles.header}
            aria-label={_t("room|context_menu|title")}
            align="end"
            data-testid="room-list-header"
        >
            <Flex className={styles.container} justify="space-between" align="center" gap="var(--cpd-space-3x)">
                <Flex className={styles.title} align="center" gap="var(--cpd-space-1x)">
                    {ancestorPath?.map((ancestor, i) => (
                        <React.Fragment key={ancestor.id}>
                            {/* For deep hierarchies (4+), show first, ellipsis, then last */}
                            {ancestorPath.length <= 3 || i === 0 || i === ancestorPath.length - 1 ? (
                                <button
                                    className={styles.breadcrumb}
                                    onClick={() => vm.navigateToAncestorSpace(ancestor.id)}
                                >
                                    {ancestor.name}
                                </button>
                            ) : i === 1 ? (
                                <span className={styles.breadcrumb} aria-hidden>
                                    &hellip;
                                </span>
                            ) : null}
                            {(ancestorPath.length <= 3 || i === 0 || i === ancestorPath.length - 1 || i === 1) && (
                                <span className={styles.separator}>/</span>
                            )}
                        </React.Fragment>
                    ))}
                    <span className={styles.currentSpace} title={title}>
                        {title}
                    </span>
                    {displaySpaceMenu && <SpaceMenuView vm={vm} />}
                </Flex>
                <Flex align="center" gap="var(--cpd-space-2x)">
                    <OptionMenuView vm={vm} />

                    {/* If we don't display the compose menu, it means that the user can only send DM */}
                    {displayComposeMenu ? (
                        <ComposeMenuView vm={vm} />
                    ) : (
                        <IconButton
                            size="28px"
                            style={{ padding: "4px" }}
                            onClick={(e) => vm.createChatRoom(e.nativeEvent)}
                            tooltip={_t("action|new_conversation")}
                        >
                            <ComposeIcon color="var(--cpd-color-icon-secondary)" aria-hidden />
                        </IconButton>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
}
