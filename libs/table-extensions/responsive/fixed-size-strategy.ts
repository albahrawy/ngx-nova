/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { FixedSizeVirtualScrollStrategy, VIRTUAL_SCROLL_STRATEGY } from "@angular/cdk/scrolling";
import { Directive, HostBinding, Input, OnChanges, forwardRef, numberAttribute } from "@angular/core";
import { CdkTableResponsiveView } from "./responsive-view";
import { ITableResponsiveArgs } from "./types";


@Directive({
    selector: 'cdk-table[responsive][virtual-scroll], mat-table[responsive][virtual-scroll]',
    standalone: true,
    host: {
        'class': 'nova-fixed-size-virtual-scroll-table',
    },
    providers: [
        { provide: CdkTableResponsiveView, useExisting: CdkTableResponsiveVirtualScroll },
        {
            provide: VIRTUAL_SCROLL_STRATEGY,
            useFactory: (fixedSizeDir: CdkTableResponsiveVirtualScroll) => fixedSizeDir._scrollStrategy,
            deps: [forwardRef(() => CdkTableResponsiveVirtualScroll)],
        },
    ],
})
export class CdkTableResponsiveVirtualScroll extends CdkTableResponsiveView implements OnChanges {

    private _currentView: ITableResponsiveArgs = { cells: 0, columns: 0 };

    @HostBinding('style.--nova-table-row-height.px')
    domRowHeight = 40;

    @Input({ transform: numberAttribute }) cellHeight: number = 40;

    /**
     * The minimum amount of buffer rendered beyond the viewport (in pixels).
     * If the amount of buffer dips below this number, more items will be rendered. Defaults to 100px.
     */
    @Input({ transform: numberAttribute }) minBufferPx: number = 100;

    @Input({ transform: numberAttribute }) maxBufferPx: number = 200;

    /** The scroll strategy used by this directive. */
    _scrollStrategy = new FixedSizeVirtualScrollStrategy(this.domRowHeight, this.minBufferPx, this.maxBufferPx);

    ngOnChanges() {
        this._updateItemAndBufferSize();
    }

    protected override onViewChanged(arg: ITableResponsiveArgs): void {
        super.onViewChanged(arg);
        this._currentView = arg;
        this._updateItemAndBufferSize();
    }

    private _updateItemAndBufferSize() {
        this.domRowHeight = this.cellHeight * (this._currentView.columns ? this._currentView.cells : 1);
        this._scrollStrategy.updateItemAndBufferSize(this.domRowHeight, this.minBufferPx, this.maxBufferPx);
    }
}