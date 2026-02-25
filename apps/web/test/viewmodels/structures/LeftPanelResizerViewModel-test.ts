/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { LeftPanelResizerViewModel } from "../../../src/viewmodels/structures/LeftPanelResizerViewModel";

describe("LeftPanelResizerViewModel", () => {
    it("should have the correct initial state", () => {
        const vm = new LeftPanelResizerViewModel();
        expect(vm.getSnapshot().isCollapsed).toStrictEqual(false);
    });

    it("should update isCollapsed on onLeftPanelResized", () => {
        const vm = new LeftPanelResizerViewModel();
        vm.onLeftPanelResize(100);
        expect(vm.getSnapshot().isCollapsed).toStrictEqual(false);
        vm.onLeftPanelResize(0);
        expect(vm.getSnapshot().isCollapsed).toStrictEqual(true);
    });
});
