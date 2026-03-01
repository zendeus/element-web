/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { useCallback, useState } from "react";

const STORAGE_PREFIX = "mx_category_collapsed_";

function readCollapsedSet(categoryIds: string[]): Set<string> {
    const set = new Set<string>();
    for (const id of categoryIds) {
        try {
            if (localStorage.getItem(`${STORAGE_PREFIX}${id}`) === "true") {
                set.add(id);
            }
        } catch {
            // localStorage may be unavailable
        }
    }
    return set;
}

export interface CollapsedCategoriesState {
    /** Set of collapsed category IDs */
    collapsedIds: Set<string>;
    /** Whether a specific category is collapsed */
    isCollapsed: (id: string) => boolean;
    /** Toggle collapsed state of a specific category */
    toggle: (id: string) => void;
}

/**
 * Manages collapsed state for all room categories, persisted to localStorage.
 * Lifted from individual RoomCategorySection components to enable virtualization.
 */
export function useCollapsedCategories(categoryIds: string[]): CollapsedCategoriesState {
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => readCollapsedSet(categoryIds));

    const isCollapsed = useCallback((id: string): boolean => collapsedIds.has(id), [collapsedIds]);

    const toggle = useCallback((id: string) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${id}`, String(next.has(id)));
            } catch {
                // localStorage may be unavailable
            }
            return next;
        });
    }, []);

    return { collapsedIds, isCollapsed, toggle };
}
