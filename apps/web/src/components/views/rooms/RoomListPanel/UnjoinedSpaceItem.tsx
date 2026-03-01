/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useCallback, type JSX } from "react";
import { Button, InlineSpinner } from "@vector-im/compound-web";
import PublicIcon from "@vector-im/compound-design-tokens/assets/web/icons/public";

import SpaceStore from "../../../../stores/spaces/SpaceStore";
import type { UnjoinedSpace } from "./useUnjoinedChildSpaces";

interface UnjoinedSpaceItemProps {
    space: UnjoinedSpace;
    onJoin: (roomId: string) => Promise<void>;
    isJoining: boolean;
}

/**
 * A dimmed, hoverable entry for a child space the user hasn't joined.
 * Shows a "Join" button on hover.
 */
export function UnjoinedSpaceItem({ space, onJoin, isJoining }: UnjoinedSpaceItemProps): JSX.Element {
    const handleClick = useCallback(() => {
        // Try to navigate into the space for preview
        const room = SpaceStore.instance.matrixClient?.getRoom(space.roomId);
        if (room) {
            SpaceStore.instance.setActiveSpace(space.roomId);
        } else {
            // Can't preview without joining — trigger join
            onJoin(space.roomId);
        }
    }, [space.roomId, onJoin]);

    const handleJoinClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onJoin(space.roomId);
        },
        [space.roomId, onJoin],
    );

    return (
        <div
            className="mx_UnjoinedSpaceItem"
            role="option"
            aria-label={`${space.name} (not joined)`}
            onClick={handleClick}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <span className="mx_UnjoinedSpaceItem_icon" aria-hidden="true">
                <PublicIcon width="16" height="16" />
            </span>
            <span className="mx_UnjoinedSpaceItem_name">{space.name}</span>
            <span className="mx_UnjoinedSpaceItem_actions">
                {isJoining ? (
                    <InlineSpinner />
                ) : (
                    <Button size="sm" kind="secondary" onClick={handleJoinClick}>
                        Join
                    </Button>
                )}
            </span>
        </div>
    );
}
