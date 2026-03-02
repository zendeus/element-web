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
import { _t } from "../../../../languageHandler";
import { RoomNotificationStateStore } from "../../../../stores/notifications/RoomNotificationStateStore";

export interface RoomCategory {
    id: string;
    label: string;
    roomIds: string[];
    /** True when this category represents a subspace rather than a fixed type bucket */
    isSubspace?: boolean;
}

export type CategoryId = "invites" | "favourites" | "text" | "voiceVideo" | "directMessages" | "lowPriority" | "serverNotice";

const CATEGORY_I18N_KEYS: Record<CategoryId, string> = {
    invites: "room_list|category_invites",
    favourites: "room_list|category_favourites",
    text: "room_list|category_text",
    voiceVideo: "room_list|category_voice_video",
    directMessages: "room_list|category_direct_messages",
    lowPriority: "room_list|category_low_priority",
    serverNotice: "room_list|category_server_notice",
};

function getCategoryLabel(id: CategoryId): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return _t(CATEGORY_I18N_KEYS[id] as any);
}

/**
 * Sort room IDs by notification importance level.
 * Order: Unsent > Highlight > Notification > Activity > None > Muted.
 * Stable sort — rooms within the same level keep their original order.
 */
function sortByImportance(roomIds: string[], matrixClient: MatrixClient): string[] {
    return [...roomIds].sort((a, b) => {
        const roomA = matrixClient.getRoom(a);
        const roomB = matrixClient.getRoom(b);
        if (!roomA || !roomB) return 0;
        const stateA = RoomNotificationStateStore.instance.getRoomState(roomA);
        const stateB = RoomNotificationStateStore.instance.getRoomState(roomB);
        // Higher level = more important, sort descending. Muted rooms sink to the bottom.
        const scoreA = stateA.muted ? -1 : stateA.level;
        const scoreB = stateB.muted ? -1 : stateB.level;
        return scoreB - scoreA;
    });
}

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
            const directChildSpaces = SpaceStore.instance.getChildSpaces(spaceId);
            for (const subspace of directChildSpaces) {
                const subspaceId = subspace.roomId;
                subspaceOrder.push(subspaceId);
                subspaceBuckets.set(subspaceId, []);
                subspaceLabels.set(subspaceId, subspace.name || subspaceId);

                // Recursively gather ALL rooms under this subspace (any depth)
                SpaceStore.instance.traverseSpace(
                    subspaceId,
                    (roomId: string) => {
                        const room = matrixClient.getRoom(roomId);
                        if (room && !room.isSpaceRoom()) {
                            roomToSubspace.set(roomId, subspaceId);
                        }
                    },
                    true, // includeRooms
                );
            }
        }

        const buckets: Record<CategoryId, string[]> = {
            invites: [],
            favourites: [],
            text: [],
            voiceVideo: [],
            directMessages: [],
            lowPriority: [],
            serverNotice: [],
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
            } else if (room.tags["m.server_notice"]) {
                buckets.serverNotice.push(roomId);
            } else if (roomToSubspace.has(roomId)) {
                // Room belongs to a subspace — put it in that subspace's bucket
                const subspaceId = roomToSubspace.get(roomId)!;
                subspaceBuckets.get(subspaceId)!.push(roomId);
            } else if (isVideoRoom(room)) {
                buckets.voiceVideo.push(roomId);
            } else if (DMRoomMap.shared().getUserIdForRoomId(roomId)) {
                // Only show DMs on Home / meta-spaces; in a real space, fall through to text
                if (!spaceId || isMetaSpace(spaceId)) {
                    buckets.directMessages.push(roomId);
                } else {
                    buckets.text.push(roomId);
                }
            } else if (room.tags["m.lowpriority"]) {
                buckets.lowPriority.push(roomId);
            } else {
                buckets.text.push(roomId);
            }
        }

        // Sort each bucket by importance
        for (const id of Object.keys(buckets) as CategoryId[]) {
            buckets[id] = sortByImportance(buckets[id], matrixClient);
        }
        for (const [subspaceId, subRoomIds] of subspaceBuckets) {
            subspaceBuckets.set(subspaceId, sortByImportance(subRoomIds, matrixClient));
        }

        // Build the final ordered category list
        const categories: RoomCategory[] = [];

        // Invites and Favourites first
        for (const id of ["invites", "favourites"] as CategoryId[]) {
            if (buckets[id].length > 0) {
                categories.push({ id, label: getCategoryLabel(id), roomIds: buckets[id] });
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
        for (const id of ["text", "voiceVideo", "directMessages", "lowPriority", "serverNotice"] as CategoryId[]) {
            if (buckets[id].length > 0) {
                categories.push({ id, label: getCategoryLabel(id), roomIds: buckets[id] });
            }
        }

        return { categories, totalCount: roomIds.length };
    }, [roomIds, matrixClient, spaceId]);
}
