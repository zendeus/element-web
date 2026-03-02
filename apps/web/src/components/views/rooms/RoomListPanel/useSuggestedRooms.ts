/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import SpaceStore from "../../../../stores/spaces/SpaceStore";
import { type ISuggestedRoom, UPDATE_SUGGESTED_ROOMS } from "../../../../stores/spaces";

export interface UseSuggestedRoomsResult {
    suggestedRooms: ISuggestedRoom[];
    joinRoom: (roomId: string) => Promise<void>;
    joiningRoomId: string | null;
}

/**
 * Hook that listens to SpaceStore for suggested rooms in the active space.
 * Returns the list of suggested rooms (not yet joined), a join function, and joining state.
 */
export function useSuggestedRooms(
    matrixClient: MatrixClient,
    spaceId: string | undefined,
): UseSuggestedRoomsResult {
    const [suggestedRooms, setSuggestedRooms] = useState<ISuggestedRoom[]>([]);
    const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

    useEffect(() => {
        if (!spaceId) {
            setSuggestedRooms([]);
            return;
        }

        const update = (): void => {
            const rooms = SpaceStore.instance.suggestedRooms.filter((r) => {
                const localRoom = matrixClient.getRoom(r.room_id);
                return !localRoom || localRoom.getMyMembership() !== KnownMembership.Join;
            });
            setSuggestedRooms(rooms);
        };

        SpaceStore.instance.on(UPDATE_SUGGESTED_ROOMS, update);
        // Initialize with current state
        update();

        return () => {
            SpaceStore.instance.off(UPDATE_SUGGESTED_ROOMS, update);
        };
    }, [matrixClient, spaceId]);

    const joinRoom = useCallback(
        async (roomId: string) => {
            const suggested = suggestedRooms.find((r) => r.room_id === roomId);
            if (!suggested) return;

            setJoiningRoomId(roomId);
            try {
                await matrixClient.joinRoom(roomId, {
                    viaServers: suggested.viaServers,
                });
                // Remove from local state immediately
                setSuggestedRooms((prev) => prev.filter((r) => r.room_id !== roomId));
            } finally {
                setJoiningRoomId(null);
            }
        },
        [matrixClient, suggestedRooms],
    );

    return useMemo(
        () => ({ suggestedRooms, joinRoom, joiningRoomId }),
        [suggestedRooms, joinRoom, joiningRoomId],
    );
}
