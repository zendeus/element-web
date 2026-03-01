/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, useEffect, useMemo, type JSX, type ReactNode } from "react";
import {
    useViewModel,
    type RoomListViewModel,
} from "@element-hq/web-shared-components";
import { InlineSpinner } from "@vector-im/compound-web";
import {
    EmailSolidIcon,
    FavouriteIcon,
    ArrowDownIcon,
    VideoCallSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import ChatIcon from "@vector-im/compound-design-tokens/assets/web/icons/chat";
import UserProfileIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-profile";
import { GroupedVirtuoso } from "react-virtuoso";

import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import SpaceStore from "../../../../stores/spaces/SpaceStore";
import { isMetaSpace } from "../../../../stores/spaces";
import { useCategorizedRooms, type CategoryId } from "./useCategorizedRooms";
import { useUnjoinedChildSpaces } from "./useUnjoinedChildSpaces";
import { UnjoinedSpaceItem } from "./UnjoinedSpaceItem";
import { CategoryHeader } from "./CategoryHeader";
import { ChannelListItem } from "./ChannelListItem";
import { useCollapsedCategories } from "./useCollapsedCategories";

interface CategorizedRoomListViewProps {
    /** The room list view model */
    vm: RoomListViewModel;
    /** Render function for room avatar (unused in categorized view, kept for API compat) */
    renderAvatar: (room: any) => ReactNode;
    /** Keyboard event handler for landmark navigation */
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

const CATEGORY_ICONS: Record<CategoryId, ReactNode> = {
    invites: <EmailSolidIcon width="16" height="16" />,
    favourites: <FavouriteIcon width="16" height="16" />,
    text: <ChatIcon width="16" height="16" />,
    voiceVideo: <VideoCallSolidIcon width="16" height="16" />,
    directMessages: <UserProfileIcon width="16" height="16" />,
    lowPriority: <ArrowDownIcon width="16" height="16" />,
};

/**
 * Build a mapping from flat item index to { categoryIndex, roomId, categoryIcon }
 * so that GroupedVirtuoso's itemContent can resolve the correct room.
 */
interface FlatItem {
    roomId: string;
    categoryIcon: ReactNode;
}

/**
 * Discord/Slack-style categorized room list view.
 * Groups rooms into collapsible sections by type (Invites, Favourites, Text, Voice, DMs, Low Priority).
 * Uses GroupedVirtuoso for virtualized rendering to handle 200+ rooms efficiently.
 */
export function CategorizedRoomListView({ vm, onKeyDown }: CategorizedRoomListViewProps): JSX.Element {
    const snapshot = useViewModel(vm);
    const matrixClient = useMatrixClientContext();
    const spaceId = SpaceStore.instance.activeSpace;
    const { categories, totalCount } = useCategorizedRooms(snapshot.roomIds, matrixClient, spaceId);
    const isRealSpace = spaceId && !isMetaSpace(spaceId);
    const { unjoinedSpaces, joinSpace, joiningRoomId } =
        useUnjoinedChildSpaces(matrixClient, isRealSpace ? spaceId : undefined);

    const categoryIds = useMemo(() => categories.map((cat) => cat.id), [categories]);
    const { isCollapsed, toggle } = useCollapsedCategories(categoryIds);

    // Compute group counts — collapsed categories have 0 items visible
    const groupCounts = useMemo(
        () => categories.map((cat) => (isCollapsed(cat.id) ? 0 : cat.roomIds.length)),
        [categories, isCollapsed],
    );

    // Build flat item array for itemContent resolution
    const flatItems = useMemo<FlatItem[]>(() => {
        const items: FlatItem[] = [];
        for (const cat of categories) {
            if (isCollapsed(cat.id)) continue;
            const icon = cat.isSubspace
                ? <ChatIcon width="16" height="16" />
                : CATEGORY_ICONS[cat.id as CategoryId];
            for (const roomId of cat.roomIds) {
                items.push({ roomId, categoryIcon: icon });
            }
        }
        return items;
    }, [categories, isCollapsed]);

    // Notify VM of visible room count
    useEffect(() => {
        vm.updateVisibleRooms(0, totalCount);
    }, [vm, totalCount]);

    // Track visible range for notification optimization
    const handleRangeChanged = useCallback(
        (range: { startIndex: number; endIndex: number }) => {
            vm.updateVisibleRooms(range.startIndex, range.endIndex);
        },
        [vm],
    );

    const selectedRoomId =
        snapshot.roomListState.activeRoomIndex !== undefined
            ? snapshot.roomIds[snapshot.roomListState.activeRoomIndex]
            : undefined;

    const groupContent = useCallback(
        (index: number) => {
            const cat = categories[index];
            if (!cat) return null;
            return (
                <CategoryHeader
                    key={cat.id}
                    id={cat.id}
                    label={cat.label}
                    roomCount={cat.roomIds.length}
                    roomIds={cat.roomIds}
                    isCollapsed={isCollapsed(cat.id)}
                    onToggle={() => toggle(cat.id)}
                    isSubspace={cat.isSubspace}
                    spaceId={cat.isSubspace ? cat.id : undefined}
                />
            );
        },
        [categories, isCollapsed, toggle],
    );

    const itemContent = useCallback(
        (index: number) => {
            const item = flatItems[index];
            if (!item) return null;
            return (
                <ChannelListItem
                    key={item.roomId}
                    vm={vm.getRoomItemViewModel(item.roomId)}
                    isSelected={item.roomId === selectedRoomId}
                    categoryIcon={item.categoryIcon}
                />
            );
        },
        [flatItems, vm, selectedRoomId],
    );

    if (snapshot.isLoadingRooms) {
        return (
            <div className="mx_CategorizedRoomListView" onKeyDown={onKeyDown}>
                <div className="mx_CategorizedRoomListView_loading">
                    <InlineSpinner size={24} />
                </div>
            </div>
        );
    }

    if (snapshot.isRoomListEmpty && unjoinedSpaces.length === 0) {
        return (
            <div className="mx_CategorizedRoomListView" onKeyDown={onKeyDown}>
                <div className="mx_CategorizedRoomListView_empty">
                    <p>{isRealSpace ? "This space has no channels yet" : "No rooms to show"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx_CategorizedRoomListView" onKeyDown={onKeyDown}>
            <GroupedVirtuoso
                groupCounts={groupCounts}
                groupContent={groupContent}
                itemContent={itemContent}
                rangeChanged={handleRangeChanged}
                overscan={200}
                style={{ flex: 1 }}
            />
            {isRealSpace && unjoinedSpaces.length > 0 && (
                <div className="mx_UnjoinedSpacesSection">
                    <div className="mx_UnjoinedSpacesSection_header">Available Spaces</div>
                    {unjoinedSpaces.map((space) => (
                        <UnjoinedSpaceItem
                            key={space.roomId}
                            space={space}
                            onJoin={joinSpace}
                            isJoining={joiningRoomId === space.roomId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
