import { Directionality } from "@angular/cdk/bidi";
import { CDK_TABLE, CdkTable, RowOutlet, } from "@angular/cdk/table";
import { AfterViewInit, DestroyRef, Directive, EmbeddedViewRef, HostBinding, Input, QueryList, Renderer2, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { focusElement, preventEvent, scrollIntoViewIfNeeded } from "@ngx-nova/cdk/shared";
import { KeyboardNavigationType } from "./types";
import { Nullable } from "@ngx-nova/js-extensions";

@Directive({
    selector: 'cdk-table[keyboard-navigation],mat-table[keyboard-navigation]',
    host: { 'class': '--keyboard-navigation' },
    standalone: true
})
export class CdkTableKeyboadNavigation<T> implements AfterViewInit {

    private _destroyRef = inject(DestroyRef);
    private _cdkTable: CdkTable<T> = inject(CDK_TABLE);
    private _renderer = inject(Renderer2);
    private _dir = inject(Directionality, { optional: true });

    private _navigationMode: KeyboardNavigationType = 'row';

    @Input("keyboard-navigation")
    get navigationMode(): KeyboardNavigationType { return this._navigationMode; };
    set navigationMode(value: Nullable<KeyboardNavigationType> | '') {
        value ||= 'row';
        if (value != this._navigationMode) {
            this._navigationMode = value || 'row';
        }
    };

    @HostBinding('style.--nova-table-sticky-bottom.px')
    stickyBottomHeight: number | null = null;

    @HostBinding('style.--nova-table-sticky-top.px')
    stickyTopHeight: number | null = null;

    ngAfterViewInit(): void {
        this._cdkTable.contentChanged.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() =>
            setTimeout(() => this.updateEvents()));
    }

    private updateEvents() {
        if (this.navigationMode === 'none')
            return;

        this.stickyTopHeight = this._calculateSticky(this._cdkTable._contentHeaderRowDefs, this._cdkTable._headerRowOutlet);
        this.stickyBottomHeight = this._calculateSticky(this._cdkTable._contentFooterRowDefs, this._cdkTable._footerRowOutlet);

        const rowOutlet = this._cdkTable._rowOutlet;
        for (let i = 0; i < rowOutlet.viewContainer.length; i++) {
            const rowElement = (rowOutlet.viewContainer.get(i) as EmbeddedViewRef<unknown>).rootNodes[0] as HTMLElement;

            if (!rowElement.getAttribute('keyboard-event-binded')) {
                rowElement.setAttribute('keyboard-event-binded', 'true');
                switch (this.navigationMode) {
                    case 'row':
                        rowElement.tabIndex = 0;
                        this._renderer.listen(rowElement, 'keydown', e => this._onRowKeyDown(rowElement, e));
                        break;
                    case 'cell':
                    case 'cell-round':
                        this._renderer.listen(rowElement, 'keydown.space', e => {
                            if (Array.from(rowElement.children).includes(e.target))
                                preventEvent(e);
                        });
                        rowElement.querySelectorAll('.cdk-cell').forEach((cell, index) => {
                            this._renderer.listen(cell, 'keydown', e => this._onCellKeyDown(rowElement, cell as HTMLElement, index, e));
                            cell.setAttribute('tabIndex', '0');
                        });
                        break;
                }
            }
        }
    }

    private _calculateSticky(_contentFooterRowDefs: QueryList<unknown>, rowOutlet: RowOutlet) {
        if (!_contentFooterRowDefs?.length)
            return null;
        const rows = this._cdkTable._getRenderedRows(rowOutlet);
        return rows.filter(e => Array.from(e.classList).some(e => e.endsWith('table-sticky')))
            .reduce((acc, o) => acc + o.clientHeight, 0);
    }

    //#region row events

    private _onRowKeyDown(rowElement: HTMLElement, event: KeyboardEvent): boolean | void {
        if (rowElement !== event.target)
            return;
        switch (event.code) {
            case 'ArrowDown':
                this._moveDownRow(rowElement, event);
                break;
            case 'ArrowUp':
                this._moveUpRow(rowElement, event);
                break;
            case 'PageDown':
                this._proceedPageKeyRow(rowElement, event, 10);
                break;
            case 'PageUp':
                this._proceedPageKeyRow(rowElement, event, -10);
                break;
            case 'Space':
                preventEvent(event);
                break;
        }
    }

    private _moveDownRow(element: HTMLElement, event: Event) {
        preventEvent(event);
        focusElement(element.nextElementSibling);
    }

    private _moveUpRow(element: HTMLElement, event: Event) {
        preventEvent(event);
        focusElement(element.previousElementSibling);
    }

    private _proceedPageKeyRow(element: HTMLElement, event: Event, count: number) {
        preventEvent(event);
        const nextRow = this._getExpectedRowWithPage(element, count);
        focusElement(nextRow);
    }

    private _getExpectedRowWithPage(currentRow: Element | null, count: number) {
        if (!currentRow)
            return null;
        const renderedRows = Array.from(currentRow.parentElement!.children) as Element[];
        const reqCount = renderedRows.indexOf(currentRow) + count;
        const requiredIndex = Math.max(0, Math.min(reqCount, renderedRows.length - 1));
        return renderedRows.at(requiredIndex) ?? null;
    }

    //#endregion

    //#region cell events

    private _onCellKeyDown(rowElement: HTMLElement, cell: HTMLElement, cellIndex: number, event: KeyboardEvent): boolean | void {
        if (cell !== event.target)
            return;
        switch (event.code) {
            case 'ArrowLeft':
                this._dir?.value === 'rtl' ? this._moveRight(rowElement, cell, event) : this._moveLeft(rowElement, cell, event);
                break;
            case 'ArrowRight':
                this._dir?.value === 'rtl' ? this._moveLeft(rowElement, cell, event) : this._moveRight(rowElement, cell, event);
                break;
            case 'ArrowDown':
                this._moveDownCell(rowElement, cell, cellIndex, event);
                break;
            case 'ArrowUp':
                this._moveUpCell(rowElement, cell, cellIndex, event);
                break;
            case 'PageDown':
                this._proceedPageKeyCell(rowElement, cell, cellIndex, event, 10);
                break;
            case 'PageUp':
                this._proceedPageKeyCell(rowElement, cell, cellIndex, event, -10);
                break;
        }
    }

    private _moveLeft(rowElement: HTMLElement, cellElement: HTMLElement, event: Event) {
        preventEvent(event);
        const reqCell = cellElement.previousElementSibling;
        if (reqCell)
            focusElement(reqCell);
        else if (this.navigationMode === 'cell-round')
            this._moveUpCell(rowElement, cellElement, rowElement.children.length - 1, event);
    }

    private _moveRight(rowElement: HTMLElement, cellElement: HTMLElement, event: Event) {
        const reqCell = cellElement.nextElementSibling;
        if (reqCell)
            focusElement(reqCell);
        else if (this.navigationMode === 'cell-round')
            this._moveDownCell(rowElement, cellElement, 0, event);
    }

    private _moveDownCell(rowElement: HTMLElement, cellElement: HTMLElement, cellIndex: number, event: Event) {
        preventEvent(event);
        this._moveCellAndFocus(rowElement, rowElement.nextElementSibling, cellIndex);
    }

    private _moveUpCell(rowElement: HTMLElement, cellElement: HTMLElement, cellIndex: number, event: Event) {
        preventEvent(event);
        this._moveCellAndFocus(rowElement, rowElement.previousElementSibling, cellIndex);
    }

    private _proceedPageKeyCell(rowElement: HTMLElement, cellElement: HTMLElement, cellIndex: number, event: Event, count: number) {
        preventEvent(event);
        const nextRow = this._getExpectedRowWithPage(rowElement, count);
        this._moveCellAndFocus(rowElement, nextRow, cellIndex);
    }

    private _moveCellAndFocus(currentRow: Element | null, reqRow: Element | null, cellIndex: number) {
        if (!reqRow || !currentRow)
            return;
        scrollIntoViewIfNeeded(reqRow, false);
        (reqRow.children.item(cellIndex) as HTMLElement)?.focus();
    }


    //#endregion
}
