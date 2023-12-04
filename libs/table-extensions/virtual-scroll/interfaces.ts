/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { ListRange } from "@angular/cdk/collections";
import { Observable } from "rxjs";

export interface ICdkTableVirtualScrollDataHandler {
    readonly dataLengthStream: Observable<number>;
    measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number;
}