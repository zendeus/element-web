/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useEffect, type JSX, type ReactNode } from "react";
import {
    useViewModel,
    type RoomListViewModel,
} from "@element-hq/web-shared-components";
import {
    EmailSolidIcon,
    FavouriteIcon,
    ArrowDownIcon,
    VideoCallSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import ChatIcon from "@vector-im/compound-design-tokens/assets/web/icons/chat";
import UserProfileIcon from "@vector-im/compound-design-tokens/assets/web/icons/user-profile";

import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import SpaceStore from "../../../../stores/spaces/SpaceStore";
import { isMetaSpace } from "../../../../stores/spaces";
import { useCategorizedRooms, type CategoryId } from "./useCategorizedRooms";
import { RoomCategorySection } from "./RoomCategorySection";
import { useUnjoinedChildSpaces } from "./useUnjoinedChildSpaces";
import { UnjoinedSpaceItem } from "./UnjoinedSpaceItem";

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
 * Discord/Slack-style categorized room list view.
 * Groups rooms into collapsible sections by type (Invites, Favourites, Text, Voice, DMs, Low Priority).
 * Replaces SharedRoomListView when the categorized sidebar is enabled.
 */
export function CategorizedRoomListView({ vm, onKeyDown }: CategorizedRoomListViewProps): JSX.Element {
    const snapshot = useViewModel(vm);
    const matrixClient = useMatrixClientContext();
    const spaceId = SpaceStore.instance.activeSpace;
    const { categories, totalCount } = useCategorizedRooms(snapshot.roomIds, matrixClient, spaceId);
    const isRealSpace = spaceId && !isMetaSpace(spaceId);
    const { unjoinedSpaces, isLoading: unjoinedLoading, joinSpace, joiningRoomId } =
        useUnjoinedChildSpaces(matrixClient, isRealSpace ? spaceId : undefined);

    // Tell the VM that all rooms are "visible" since we don't virtualize
    useEffect(() => {
        vm.updateVisibleRooms(0, totalCount);
    }, [vm, totalCount]);

    const selectedRoomId =
        snapshot.roomListState.activeRoomIndex !== undefined
            ? snapshot.roomIds[snapshot.roomListState.activeRoomIndex]
            : undefined;

    if (snapshot.isLoadingRooms) {
        return (
            <div className="mx_CategorizedRoomListView" onKeyDown={onKeyDown}>
                <div className="mx_CategorizedRoomListView_loading">
                    {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className="mx_CategorizedRoomListView_skeleton" />
                    ))}
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
            {categories.map((cat) => (
                <RoomCategorySection
                    key={cat.id}
                    id={cat.id}
                    label={cat.label}
                    categoryIcon={
                        cat.isSubspace
                            ? <ChatIcon width="16" height="16" />
                            : CATEGORY_ICONS[cat.id as CategoryId]
                    }
                    roomIds={cat.roomIds}
                    vm={vm}
                    selectedRoomId={selectedRoomId}
                    isSubspace={cat.isSubspace}
                    spaceId={cat.isSubspace ? cat.id : undefined}
                />
            ))}
            {isRealSpace && (unjoinedSpaces.length > 0 || unjoinedLoading) && (
                <div className="mx_UnjoinedSpacesSection">
                    <div className="mx_UnjoinedSpacesSection_header">Available Spaces</div>
                    {unjoinedLoading ? (
                        <div className="mx_UnjoinedSpacesSection_loading">
                            {Array.from({ length: 3 }, (_, i) => (
                                <div key={i} className="mx_UnjoinedSpacesSection_skeleton" />
                            ))}
                        </div>
                    ) : (
                        unjoinedSpaces.map((space) => (
                            <UnjoinedSpaceItem
                                key={space.roomId}
                                space={space}
                                onJoin={joinSpace}
                                isJoining={joiningRoomId === space.roomId}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
