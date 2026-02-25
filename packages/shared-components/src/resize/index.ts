/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

/**
 * This is the id given to the resizable container that holds
 * the left panel contents.
 */
export const LEFT_PANEL_ID = "left-panel";

export * from "./group/GroupView";
export * from "./separator/SeparatorView";
export * from "./panel/LeftResizablePanelView";

export interface ResizerSnapshot {
    /**
     * Whether the left panel is collapsed or not.
     */
    isCollapsed: boolean;
}

/**
 * Export everything from the underlying library so that we don't need
 * to install this package twice.
 * todo: maybe just export Panel and some types?
 */
export * from "react-resizable-panels";
