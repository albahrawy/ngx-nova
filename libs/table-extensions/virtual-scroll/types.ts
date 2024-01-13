/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { CdkVirtualScrollRepeater, CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import { InjectionToken } from "@angular/core";

export interface ICdkTableVirtualScrollDataHandler<T> extends CdkVirtualScrollRepeater<T> {
    attach(viewport: CdkVirtualScrollViewport): void;
}

export const VIRTUAL_TABLE_DATA_HANDLER = new InjectionToken<ICdkTableVirtualScrollDataHandler<unknown>>("VIRTUAL_TABLE_DATA_HANDLER");