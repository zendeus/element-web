/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type MatrixClient, RoomType, EventType } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { ClientEvent } from "matrix-js-sdk/src/matrix";

export interface UnjoinedSpace {
    roomId: string;
    name: string;
    topic?: string;
    numJoinedMembers: number;
    viaServers: string[];
}

interface UseUnjoinedChildSpacesResult {
    unjoinedSpaces: UnjoinedSpace[];
    isLoading: boolean;
    joinSpace: (roomId: string) => Promise<void>;
    joiningRoomId: string | null;
}

/**
 * Hook that fetches child spaces of the given space that the user has NOT joined.
 * Uses matrixClient.getRoomHierarchy() with depth=1 to get immediate children,
 * then filters to space-type rooms the user hasn't joined.
 */
export function useUnjoinedChildSpaces(
    matrixClient: MatrixClient,
    spaceId: string | undefined,
): UseUnjoinedChildSpacesResult {
    const [unjoinedSpaces, setUnjoinedSpaces] = useState<UnjoinedSpace[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const abortRef = useRef(false);

    // Fetch unjoined child spaces
    useEffect(() => {
        if (!spaceId) {
            setUnjoinedSpaces([]);
            return;
        }

        abortRef.current = false;
        setIsLoading(true);

        (async () => {
            try {
                const { rooms } = await matrixClient.getRoomHierarchy(spaceId, 50, 1, true);
                if (abortRef.current) return;

                // Build viaMap from children_state
                const viaMap = new Map<string, string[]>();
                for (const room of rooms) {
                    for (const ev of room.children_state) {
                        if (ev.type === EventType.SpaceChild && ev.content.via?.length) {
                            viaMap.set(ev.state_key, ev.content.via);
                        }
                    }
                }

                // Filter to spaces the user hasn't joined
                const unjoined: UnjoinedSpace[] = rooms
                    .filter((room) => {
                        if (room.room_id === spaceId) return false; // Exclude self
                        if (room.room_type !== RoomType.Space) return false;
                        const localRoom = matrixClient.getRoom(room.room_id);
                        return !localRoom || localRoom.getMyMembership() !== KnownMembership.Join;
                    })
                    .map((room) => ({
                        roomId: room.room_id,
                        name: room.name || room.canonical_alias || room.room_id,
                        topic: room.topic,
                        numJoinedMembers: room.num_joined_members,
                        viaServers: viaMap.get(room.room_id) || [],
                    }));

                if (!abortRef.current) {
                    setUnjoinedSpaces(unjoined);
                }
            } catch {
                if (!abortRef.current) {
                    setUnjoinedSpaces([]);
                }
            } finally {
                if (!abortRef.current) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            abortRef.current = true;
        };
    }, [matrixClient, spaceId, refreshKey]);

    // Re-fetch when membership changes (e.g. after joining)
    useEffect(() => {
        const onMembership = (): void => {
            setRefreshKey((k) => k + 1);
        };

        matrixClient.on(ClientEvent.Room, onMembership);
        return () => {
            matrixClient.off(ClientEvent.Room, onMembership);
        };
    }, [matrixClient]);

    const joinSpace = useCallback(
        async (roomId: string) => {
            const space = unjoinedSpaces.find((s) => s.roomId === roomId);
            if (!space) return;

            setJoiningRoomId(roomId);
            try {
                await matrixClient.joinRoom(roomId, {
                    viaServers: space.viaServers,
                });
                // Trigger refresh to move this space out of the unjoined list
                setRefreshKey((k) => k + 1);
            } finally {
                setJoiningRoomId(null);
            }
        },
        [matrixClient, unjoinedSpaces],
    );

    return useMemo(
        () => ({ unjoinedSpaces, isLoading, joinSpace, joiningRoomId }),
        [unjoinedSpaces, isLoading, joinSpace, joiningRoomId],
    );
}
