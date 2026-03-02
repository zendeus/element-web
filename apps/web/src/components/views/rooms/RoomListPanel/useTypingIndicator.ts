/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { useEffect, useState } from "react";
import { RoomMemberEvent } from "matrix-js-sdk/src/matrix";

import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { usersTypingApartFromMeAndIgnored, whoIsTypingString } from "../../../../WhoIsTyping";

/**
 * Hook that listens to typing events for a specific room and returns
 * a formatted typing indicator string (e.g. "Alice is typing...").
 * Returns an empty string when nobody is typing.
 */
export function useTypingIndicator(roomId: string): string {
    const matrixClient = useMatrixClientContext();
    const [typingText, setTypingText] = useState("");

    useEffect(() => {
        const room = matrixClient.getRoom(roomId);
        if (!room) return;

        const update = (): void => {
            const typingUsers = usersTypingApartFromMeAndIgnored(room);
            setTypingText(whoIsTypingString(typingUsers, 2));
        };

        // Initialize
        update();

        const onTyping = (_event: unknown, member: { roomId: string }): void => {
            if (member.roomId === roomId) {
                update();
            }
        };

        matrixClient.on(RoomMemberEvent.Typing, onTyping);
        return () => {
            matrixClient.off(RoomMemberEvent.Typing, onTyping);
        };
    }, [matrixClient, roomId]);

    return typingText;
}
