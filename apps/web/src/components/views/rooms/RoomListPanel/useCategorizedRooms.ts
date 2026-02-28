/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { useMemo } from "react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import DMRoomMap from "../../../../utils/DMRoomMap";
import { isVideoRoom } from "../../../../utils/video-rooms";
import SpaceStore from "../../../../stores/spaces/SpaceStore";
import { isMetaSpace } from "../../../../stores/spaces";

export interface RoomCategory {
    id: string;
    label: string;
    roomIds: string[];
    /** True when this category represents a subspace rather than a fixed type bucket */
    isSubspace?: boolean;
}

export type CategoryId = "invites" | "favourites" | "text" | "voiceVideo" | "directMessages" | "lowPriority";

const CATEGORY_LABELS: Record<CategoryId, string> = {
    invites: "Invites",
    favourites: "Favourites",
    text: "Text Channels",
    voiceVideo: "Voice & Video",
    directMessages: "Direct Messages",
    lowPriority: "Low Priority",
};

export interface CategorizedRooms {
    categories: RoomCategory[];
    totalCount: number;
}

/**
 * Hook that categorizes room IDs into Discord/Slack-style sections.
 * Categories are checked in priority order — a room appears in exactly one category (first match wins).
 *
 * When viewing a real space (not a meta-space), rooms belonging to subspaces are grouped
 * under their subspace's category header instead of the generic type-based categories.
 *
 * Order: Invites → Favourites → [Subspaces...] → Text Channels → Voice & Video → Direct Messages → Low Priority
 */
export function useCategorizedRooms(
    roomIds: string[],
    matrixClient: MatrixClient,
    spaceId?: string,
): CategorizedRooms {
    return useMemo(() => {
        // Build subspace lookup: roomId → subspaceId
        const roomToSubspace = new Map<string, string>();
        const subspaceOrder: string[] = [];
        const subspaceBuckets = new Map<string, string[]>();
        const subspaceLabels = new Map<string, string>();

        if (spaceId && !isMetaSpace(spaceId)) {
            const childSpaces = SpaceStore.instance.getChildSpaces(spaceId);
            for (const subspace of childSpaces) {
                const subspaceId = subspace.roomId;
                subspaceOrder.push(subspaceId);
                subspaceBuckets.set(subspaceId, []);
                subspaceLabels.set(subspaceId, subspace.name || subspaceId);

                const childRooms = SpaceStore.instance.getChildRooms(subspaceId);
                for (const childRoom of childRooms) {
                    roomToSubspace.set(childRoom.roomId, subspaceId);
                }
            }
        }

        const buckets: Record<CategoryId, string[]> = {
            invites: [],
            favourites: [],
            text: [],
            voiceVideo: [],
            directMessages: [],
            lowPriority: [],
        };

        for (const roomId of roomIds) {
            const room = matrixClient.getRoom(roomId);
            if (!room) continue;

            // First-match-wins priority ordering
            // Invites and favourites always go to their dedicated buckets
            if (room.getMyMembership() === KnownMembership.Invite) {
                buckets.invites.push(roomId);
            } else if (room.tags["m.favourite"]) {
                buckets.favourites.push(roomId);
            } else if (roomToSubspace.has(roomId)) {
                // Room belongs to a subspace — put it in that subspace's bucket
                const subspaceId = roomToSubspace.get(roomId)!;
                subspaceBuckets.get(subspaceId)!.push(roomId);
            } else if (isVideoRoom(room)) {
                buckets.voiceVideo.push(roomId);
            } else if (DMRoomMap.shared().getUserIdForRoomId(roomId)) {
                buckets.directMessages.push(roomId);
            } else if (room.tags["m.lowpriority"]) {
                buckets.lowPriority.push(roomId);
            } else {
                buckets.text.push(roomId);
            }
        }

        // Build the final ordered category list
        const categories: RoomCategory[] = [];

        // Invites and Favourites first
        for (const id of ["invites", "favourites"] as CategoryId[]) {
            if (buckets[id].length > 0) {
                categories.push({ id, label: CATEGORY_LABELS[id], roomIds: buckets[id] });
            }
        }

        // Subspace categories between Favourites and Text Channels
        for (const subspaceId of subspaceOrder) {
            const roomIdsInSubspace = subspaceBuckets.get(subspaceId)!;
            if (roomIdsInSubspace.length > 0) {
                categories.push({
                    id: subspaceId,
                    label: subspaceLabels.get(subspaceId)!,
                    roomIds: roomIdsInSubspace,
                    isSubspace: true,
                });
            }
        }

        // Remaining type-based categories
        for (const id of ["text", "voiceVideo", "directMessages", "lowPriority"] as CategoryId[]) {
            if (buckets[id].length > 0) {
                categories.push({ id, label: CATEGORY_LABELS[id], roomIds: buckets[id] });
            }
        }

        return { categories, totalCount: roomIds.length };
    }, [roomIds, matrixClient, spaceId]);
}
