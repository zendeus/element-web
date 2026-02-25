/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { useEffect, type PropsWithChildren } from "react";
import { Panel, usePanelCallbackRef, type PanelImperativeHandle, type PanelSize } from "react-resizable-panels";

import { type ViewModel, useViewModel } from "../../viewmodel";
import { LEFT_PANEL_ID, type ResizerSnapshot } from "..";

export interface LeftResizablePanelViewActions {
    /**
     * Indicates to the view-model that the left panel was resized.
     * @param newSize The new size of the left panel.
     */
    onLeftPanelResize: (panelSize: PanelSize) => void;

    /**
     * Pass the vm the object containing the API to interact with this panel.
     * @param handle Object that can be used to access the imperative methods of the panel.
     */
    setPanelHandle: (handle: PanelImperativeHandle) => void;
}

interface Props {
    vm: ViewModel<ResizerSnapshot, LeftResizablePanelViewActions>;
    className?: string;
}

export function LeftResizablePanelView({ vm, className, children }: PropsWithChildren<Props>): React.ReactNode {
    useViewModel(vm);
    const [panelRef, setPanelRef] = usePanelCallbackRef();

    useEffect(() => {
        if (panelRef) vm.setPanelHandle(panelRef);
    }, [vm, panelRef]);

    return (
        <Panel
            id={LEFT_PANEL_ID}
            className={className}
            collapsible
            minSize="200px"
            maxSize="370px"
            defaultSize="370px"
            onResize={vm.onLeftPanelResize}
            panelRef={setPanelRef}
        >
            {children}
        </Panel>
    );
}
