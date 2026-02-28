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

export interface RoomCategory {
    id: string;
    label: string;
    roomIds: string[];
}

export type CategoryId = "invites" | "favourites" | "text" | "voiceVideo" | "directMessages" | "lowPriority";

const CATEGORY_ORDER: CategoryId[] = ["invites", "favourites", "text", "voiceVideo", "directMessages", "lowPriority"];

const CATEGORY_LABELS: Record<CategoryId, string> = {
    invites: "Invites",
    favourites: "Favourites",
    text: "Text Channels",
    voiceVideo: "Voice & Video",
    directMessages: "Direct Messages",
    lowPriority: "Low Priority",
};

export interface CategorizedRooms {
    categories: Array<RoomCategory & { id: CategoryId }>;
    totalCount: number;
}

/**
 * Hook that categorizes room IDs into Discord/Slack-style sections.
 * Categories are checked in priority order — a room appears in exactly one category (first match wins).
 *
 * Order: Invites → Favourites → Text Channels → Voice & Video → Direct Messages → Low Priority
 */
export function useCategorizedRooms(roomIds: string[], matrixClient: MatrixClient): CategorizedRooms {
    return useMemo(() => {
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
            if (room.getMyMembership() === KnownMembership.Invite) {
                buckets.invites.push(roomId);
            } else if (room.tags["m.favourite"]) {
                buckets.favourites.push(roomId);
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

        // Only include non-empty categories, in display order
        const categories = CATEGORY_ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
            id,
            label: CATEGORY_LABELS[id],
            roomIds: buckets[id],
        }));

        return { categories, totalCount: roomIds.length };
    }, [roomIds, matrixClient]);
}
