/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/albahrawy/ngx-nova/blob/main/LICENSE
 */
import { CdkVirtualScrollableElement, CdkVirtualScrollViewport, ViewportRuler } from '@angular/cdk/scrolling';
import { CdkTable, StickyStyler } from '@angular/cdk/table';
import { Directive, inject, Injector, OnInit, Renderer2, ViewContainerRef } from '@angular/core';
import { HtmlElementRuler } from '@ngx-nova/cdk/observers';
import { VIRTUAL_TABLE_DATA_HANDLER } from './types';

@Directive({
    selector: 'cdk-table[virtual-scroll], mat-table[virtual-scroll]',
    exportAs: 'tableVirtualScroll',
    standalone: true,
    hostDirectives: [CdkVirtualScrollableElement, HtmlElementRuler],
    providers: [{ provide: ViewportRuler, useExisting: HtmlElementRuler }],
})
export class CdkTableVirtualScrollable implements OnInit {

    private _viewContainerRef = inject(ViewContainerRef);
    private _cdkTable = inject(CdkTable);
    private _renderer = inject(Renderer2);
    private _injector = inject(Injector);
    private _repeater = inject(VIRTUAL_TABLE_DATA_HANDLER);
    private _vsViewport?: CdkVirtualScrollViewport;

    static {
        if (StickyStyler.prototype.updateStickyColumns.toString().indexOf("setTimeout") == -1) {
            const orig = StickyStyler.prototype.updateStickyColumns;
            StickyStyler.prototype.updateStickyColumns = function (rows, stickyStartStates, stickyEndStates, recalulcate) {
                setTimeout(() => orig.bind(this)(rows, stickyStartStates, stickyEndStates, recalulcate));
            }
        }
    }

    ngOnInit(): void {
        try {
            const viewportRef = this._viewContainerRef.createComponent(CdkVirtualScrollViewport, { injector: this._injector });
            const viewport = viewportRef.instance;
            this._repeater.attach(viewport);
            const _rowOutletNode = this._cdkTable._rowOutlet.elementRef.nativeElement;
            this._renderer.addClass(viewport.elementRef.nativeElement, 'table-scrollable-viewport');
            this._renderer.insertBefore(_rowOutletNode.parentNode, viewport.elementRef.nativeElement, _rowOutletNode);
            this._renderer.addClass(viewport._contentWrapper.nativeElement, 'table-scrollable-content-wrapper');
            this._renderer.appendChild(viewport._contentWrapper.nativeElement, _rowOutletNode);
            this._vsViewport = viewport;
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.message.includes("itemSize"))
                    throw new Error('Error: cdk-table-virtual-scroll requires the "rowHeight" property to be set.');
                throw error;
            }
        }
    }

    get startIndex() { return this._vsViewport?.getRenderedRange().start ?? 0; }

    scrollToOffset(offset: number, behavior?: ScrollBehavior): void {
        this._vsViewport?.scrollToOffset(offset, behavior);
    }
    /**
     * Scrolls to the offset for the given index.
     * @param index The index of the element to scroll to.
     * @param behavior The ScrollBehavior to use when scrolling. Default is behavior is `auto`.
     */
    scrollToIndex(index: number, behavior?: ScrollBehavior): void {
        this._vsViewport?.scrollToIndex(index, behavior);
    }

    scrollToStart(behavior?: ScrollBehavior): void {
        this._vsViewport?.scrollToIndex(0, behavior);
    }

    scrollToEnd(behavior?: ScrollBehavior): void {
        this._vsViewport?.scrollToIndex(this._vsViewport.getDataLength() - 1, behavior);
    }
}