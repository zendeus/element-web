/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { Separator } from "react-resizable-panels";
import DragIcon from "@vector-im/compound-design-tokens/assets/web/icons/drag-list";
import classNames from "classnames";
import { Tooltip } from "@vector-im/compound-web";

import { type ViewModel, useViewModel } from "../../viewmodel";
import styles from "./SeparatorView.module.css";

export interface SeparatorViewSnapshot {
    /**
     * Whether the left panel is collapsed or not.
     */
    isCollapsed: boolean;
}

export interface SeparatorViewActions {
    /**
     * Collapse/Expand the left panel.
     */
    toggleCollapse: () => void;
}

interface Props {
    vm: ViewModel<SeparatorViewSnapshot, SeparatorViewActions>;
}

export function SeparatorView({ vm }: Props): React.ReactNode {
    const { isCollapsed } = useViewModel(vm);

    const classes = classNames(styles.separator, {
        [styles.collapsed]: isCollapsed,
    });

    return (
        <Separator className={classes} onClick={vm.toggleCollapse}>
            <Tooltip description="Click or drag to expand" placement="right">
                {/*todo: What's with this width?*/}
                <DragIcon width="1em" transform="rotate(90)" />
            </Tooltip>
        </Separator>
    );
}
