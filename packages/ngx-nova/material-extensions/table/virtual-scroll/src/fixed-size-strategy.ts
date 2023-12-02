/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { FixedSizeVirtualScrollStrategy, VIRTUAL_SCROLL_STRATEGY } from "@angular/cdk/scrolling";
import { Directive, Input, OnChanges, forwardRef, numberAttribute } from "@angular/core";

@Directive({
    selector: 'cdk-table[virtual-scroll][rowHeight], mat-table[virtual-scroll][rowHeight]',
    standalone: true,
    host:{
        'class':'nova-virtual-scroll',
        '[style.--nova-table-row-height.px]':'rowHeight'
    },
    providers: [
        {
            provide: VIRTUAL_SCROLL_STRATEGY,
            useFactory: (fixedSizeDir: CdkTableFixedSizeVirtualScroll) => fixedSizeDir._scrollStrategy,
            deps: [forwardRef(() => CdkTableFixedSizeVirtualScroll)],
        },
    ],
})
export class CdkTableFixedSizeVirtualScroll implements OnChanges {
    /** The size of the items in the list (in pixels). */
    @Input({ transform: numberAttribute }) rowHeight: number = 20;

    /**
     * The minimum amount of buffer rendered beyond the viewport (in pixels).
     * If the amount of buffer dips below this number, more items will be rendered. Defaults to 100px.
     */
    @Input({ transform: numberAttribute }) minBufferPx: number = 100;

    @Input({ transform: numberAttribute }) maxBufferPx: number = 200;

    /** The scroll strategy used by this directive. */
    _scrollStrategy = new FixedSizeVirtualScrollStrategy(this.rowHeight, this.minBufferPx, this.maxBufferPx);

    ngOnChanges() {
        this._scrollStrategy.updateItemAndBufferSize(this.rowHeight, this.minBufferPx, this.maxBufferPx);
    }
}