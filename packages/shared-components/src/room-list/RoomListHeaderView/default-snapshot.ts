/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { type RoomListHeaderViewSnapshot } from "./RoomListHeaderView";

export const defaultSnapshot: RoomListHeaderViewSnapshot = {
    title: "Rooms",
    displayComposeMenu: true,
    displaySpaceMenu: true,
    canCreateRoom: true,
    canCreateVideoRoom: true,
    canCreateSubspace: true,
    canInviteInSpace: true,
    canAccessSpaceSettings: true,
    parentSpaceName: undefined,
    activeSortOption: "recent",
    isMessagePreviewEnabled: true,
};
