/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import {
    BaseViewModel,
    type LeftResizablePanelViewActions,
    type SeparatorViewActions,
    type PanelSize,
    type SeparatorViewSnapshot,
    type PanelImperativeHandle,
    type GroupViewActions,
} from "@element-hq/web-shared-components";
import { debounce } from "lodash";

export class LeftPanelResizerViewModel
    extends BaseViewModel<SeparatorViewSnapshot, void>
    implements SeparatorViewActions, LeftResizablePanelViewActions, GroupViewActions
{
    /**
     * This object gives us access to the API methods of react-resizable-panels library.
     */
    private panelHandle?: PanelImperativeHandle;

    /**
     * This is the last known non-zero width of the left panel.
     * We store this so that we can restore the panel to this width when the panel is
     * expanded by interacting with the separator.
     */
    private restoreWidth = 370;

    public constructor() {
        super(undefined, { isCollapsed: false });
    }

    public onLeftPanelResize = debounce((panelSize: PanelSize): void => {
        const newSize = panelSize.inPixels;
        this.snapshot.merge({ isCollapsed: newSize === 0 });
    }, 50);

    public onLeftPanelResized = (newSize: number): void => {
        if (newSize > 0) this.restoreWidth = newSize;
    };

    public setPanelHandle = (handle: PanelImperativeHandle): void => {
        this.panelHandle = handle;
    };

    public toggleCollapse = (): void => {
        if (!this.panelHandle) return;
        if (this.panelHandle.isCollapsed()) {
            // There's an expand method but it doesn't remember the last known width correctly.
            this.panelHandle.resize(`${this.restoreWidth}%`);
        } else {
            this.restoreWidth = this.panelHandle.getSize().inPixels;
            this.panelHandle.collapse();
        }
    };
}
