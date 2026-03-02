/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { useEffect, useState } from "react";

import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { RoomNotificationStateStore } from "../../../../stores/notifications/RoomNotificationStateStore";
import { NotificationLevel } from "../../../../stores/notifications/NotificationLevel";
import { NotificationStateEvents } from "../../../../stores/notifications/NotificationState";

function computeCount(roomIds: string[], matrixClient: ReturnType<typeof useMatrixClientContext>): number {
    let total = 0;
    for (const roomId of roomIds) {
        const room = matrixClient.getRoom(roomId);
        if (!room) continue;
        const state = RoomNotificationStateStore.instance.getRoomState(room);
        if (state.level >= NotificationLevel.Notification) {
            total += state.count;
        }
    }
    return total;
}

export function useNotificationCount(roomIds: string[]): number {
    const matrixClient = useMatrixClientContext();
    const [count, setCount] = useState(() => computeCount(roomIds, matrixClient));

    useEffect(() => {
        const handlers: Array<() => void> = [];
        const states = roomIds
            .map((id) => matrixClient.getRoom(id))
            .filter(Boolean)
            .map((room) => RoomNotificationStateStore.instance.getRoomState(room!));

        const update = (): void => setCount(computeCount(roomIds, matrixClient));

        for (const state of states) {
            state.on(NotificationStateEvents.Update, update);
            handlers.push(() => state.off(NotificationStateEvents.Update, update));
        }

        // Recompute in case rooms changed between render and effect
        update();

        return () => handlers.forEach((h) => h());
    }, [roomIds, matrixClient]);

    return count;
}
