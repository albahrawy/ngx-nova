import { Directionality } from '@angular/cdk/bidi';
import { CDK_DRAG_CONFIG, CDK_DROP_LIST, CdkDrag, CdkDragHandle, DragDrop } from '@angular/cdk/drag-drop';
import { CdkColumnDef } from '@angular/cdk/table';
import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit, ChangeDetectorRef, Directive, ElementRef, Input, NgZone, OnDestroy, QueryList,
    Renderer2, ViewContainerRef, booleanAttribute, inject
} from '@angular/core';
import { HTMLStyleElementScope, addStyleSectionToDocument, findElementAttributeByPrefix } from '@ngx-nova/cdk/shared';
import { Subscription } from 'rxjs';
import { NG_CONTENT_PREFIX, NG_HOST_PREFIX } from '../internal/constants';

@Directive({
    selector: 'mat-header-cell[isDraggable], cdk-header-cell[isDraggable]',
    standalone: true,
    host: {
        'class': 'cdk-drag',
        //'[class.cdk-drag-disabled]': 'disabled',
        //'[class.cdk-drag-dragging]': '_isDragging()',
    },
})
export class CdkColumnDraggable implements AfterViewInit, OnDestroy {

    private _element = inject(ElementRef<HTMLElement>);
    private _columnDef = inject(CdkColumnDef);
    private _renderer = inject(Renderer2);
    private _ngZone = inject(NgZone);
    private _viewContainerRef = inject(ViewContainerRef);
    private _dragDrop = inject(DragDrop);
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _dropContainer = inject(CDK_DROP_LIST, { skipSelf: true, optional: true });
    private _document = inject(DOCUMENT);
    private _config = inject(CDK_DRAG_CONFIG, { optional: true });
    private _dir = inject(Directionality, { optional: true });

    private _draggable: boolean = false;
    private _cdkDragInfo?: { _cdkDrag: CdkDrag, _destroy: () => void };
    private _celltransformCssElement?: HTMLStyleElementScope;
    private _initiated = false;

    ngOnDestroy(): void {
        this.isDraggable = false;
        this.manageDraggable(true);
    }

    ngAfterViewInit(): void {
        this._initiated = true;
        this.manageDraggable();
    }

    @Input({ transform: booleanAttribute })
    get isDraggable(): boolean { return this._draggable; }
    set isDraggable(value: boolean) {
        this._draggable = value;
        if (this._initiated)
            this.manageDraggable(true);
    }

    private manageDraggable(changed = false) {
        if (this.isDraggable && !this._cdkDragInfo) {
            this._cdkDragInfo = this._createCdkDrag();
            this.addCssToDocument();
        } else if (changed && !this.isDraggable && this._cdkDragInfo) {
            this._cdkDragInfo._destroy();
            this._cdkDragInfo = undefined;
            this._celltransformCssElement?.remove();
        }
    }

    private addCssToDocument() {
        const headerRow = this._renderer.parentNode(this._element.nativeElement);
        const headerRowParent = this._renderer.parentNode(headerRow);
        const tableElement = (headerRow.tagName === 'TH') ? this._renderer.parentNode(headerRowParent) : headerRowParent;
        const columnClass = this._columnDef._columnCssClassName.find(c => c == `cdk-column-${this._columnDef.cssClassFriendlyName}`);
        const tableNgAttributes = findElementAttributeByPrefix(tableElement?.attributes, NG_HOST_PREFIX, NG_CONTENT_PREFIX);
        const _hostCssId = tableNgAttributes[NG_HOST_PREFIX] ?? tableNgAttributes[NG_CONTENT_PREFIX] ?? '';
        const variableName = `--nova-${this._columnDef.cssClassFriendlyName}-drag-transform`;
        const _isolationId = _hostCssId ? `[${_hostCssId}]` : '';
        const columnStyles = `
          ${_isolationId}.cdk-table.dragging .${columnClass}{
            transform: var(${variableName});
          }
        `;
        this._celltransformCssElement = addStyleSectionToDocument(`${columnClass}-style`, columnStyles);
    }

    private _createCdkDrag = () => {
        const _cdkDrag = new CdkDrag(this._element, this._dropContainer!, this._document, this._ngZone,
            this._viewContainerRef, this._config!, this._dir!, this._dragDrop, this._changeDetectorRef);
        _cdkDrag.previewClass = 'column-drag-preview';
        const dropContainer = this._dropContainer;
        let startedSub: Subscription | undefined, endedSub: Subscription | undefined;
        if (dropContainer) {
            startedSub = _cdkDrag.started.subscribe(() => { dropContainer.element.nativeElement.classList.add('dragging') });
            endedSub = _cdkDrag.ended.subscribe(() => { dropContainer.element.nativeElement.classList.remove('dragging') });
        }
        _cdkDrag.data = this._columnDef.cssClassFriendlyName;
        _cdkDrag.boundaryElement = '.cdk-table-reorder-columns .cdk-header-row';
        _cdkDrag.dragStartDelay = 50;
        _cdkDrag._handles = new QueryList<CdkDragHandle>(true);
        _cdkDrag.ngAfterViewInit();
        const _destroy = () => {
            startedSub?.unsubscribe();
            endedSub?.unsubscribe();
            _cdkDrag.ngOnDestroy();
        }

        return { _cdkDrag, _destroy };
    }

    _isDragging() {
        return this._cdkDragInfo?._cdkDrag._dragRef.isDragging() ?? false;
    }
}