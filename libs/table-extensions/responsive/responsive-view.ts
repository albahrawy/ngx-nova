import { CdkColumnDef } from "@angular/cdk/table";
import {
    AfterContentInit,
    ContentChildren,
    DestroyRef,
    Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, QueryList, Renderer2, RendererStyleFlags2,
    booleanAttribute, effect, inject, signal
} from "@angular/core";
import { ResizeObservableService } from "@ngx-nova/cdk/observers";
import { HTMLStyleElementScope, addStyleSectionToDocument, findElementAttributeByPrefix, getCssSizeBreakpoint } from "@ngx-nova/cdk/shared";
import { removeFromArray, toNumber } from "@ngx-nova/js-extensions";
import { TableColumnDataDef } from "@ngx-nova/table-extensions/data";
import { Subscription, combineLatest, startWith } from "rxjs";
import { NG_CONTENT_PREFIX, NG_HOST_PREFIX } from "../internal/constants";
import { ITableResponsiveArgs } from "./types";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
    selector: 'mat-table:not([virtual-scroll])[responsive],cdk-table:not([virtual-scroll])[responsive]',
    inputs: ['responsive-xs', 'responsive-sm', 'responsive-md', 'responsive-lg', 'responsive-xl', 'responsive-sl'],
    standalone: true
})
export class CdkTableResponsiveView implements OnDestroy, AfterContentInit {

    private elementRef: ElementRef<HTMLElement> = inject(ElementRef);
    private renderer = inject(Renderer2);
    private resizeService = inject(ResizeObservableService);
    private _destroyRef = inject(DestroyRef);

    private resizableSybscription?: Subscription;
    private responsiveValue = signal(0);
    private lastbreakpoint: string | null = null;
    private _responsive = false;
    private _displayedColumns: string[] = [];
    private _cellLabelCssElement?: HTMLStyleElementScope;

    @Output() viewChanged = new EventEmitter<ITableResponsiveArgs>();

    @ContentChildren(TableColumnDataDef) _columnDataDefs!: QueryList<TableColumnDataDef>;
    @ContentChildren(CdkColumnDef, { descendants: true }) _columnDefs!: QueryList<CdkColumnDef>;

    @Input() responsiveHeader?: string;

    @Input()
    get displayedColumns(): string[] { return this._displayedColumns; }
    set displayedColumns(value: string[]) { this._displayedColumns = value; }

    @Input({ transform: booleanAttribute })
    get responsive(): boolean { return this._responsive; }
    set responsive(value: boolean) {
        this._responsive = value;
        if (value) {
            if (!this.resizableSybscription)
                this.resizableSybscription = this.resizeService.widthResizeObservable(this.elementRef.nativeElement)
                    .subscribe(width => this._observeView(width));
            this._observeView(this.elementRef.nativeElement.clientWidth);
            this.updateCssContentRules();
        } else {
            this.resizableSybscription?.unsubscribe();
            this._cellLabelCssElement?.remove();
            this.resizableSybscription = undefined;
            this.lastbreakpoint = null;
            this.responsiveValue.set(0);
        }
    }

    constructor() {
        effect(() => {
            const el = this.elementRef.nativeElement;
            const responseValue = this.responsiveValue();
            if (responseValue > 0) {
                this.renderer.addClass(el, 'responsive');
                this.renderer.setStyle(el, '--responsive-column-in-row', `${100 / responseValue}%`, RendererStyleFlags2.DashCase);
            } else {
                this.renderer.removeClass(el, 'responsive');
            }
            this.onViewChanged({ cells: this._displayedColumns.length, columns: responseValue });
        });
    }

    ngAfterContentInit(): void {
        combineLatest([this._columnDefs.changes.pipe(startWith(null)), this._columnDataDefs.changes.pipe(startWith(null))])
            .pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.updateCssContentRules());
    }

    ngOnDestroy(): void {
        this.resizableSybscription?.unsubscribe();
        this._cellLabelCssElement?.remove();
    }

    protected onViewChanged(arg: ITableResponsiveArgs) {
        this.viewChanged.emit(arg);
    }

    private _observeView(width?: number): void {
        const breakpoint = getCssSizeBreakpoint(width);
        if (breakpoint === this.lastbreakpoint)
            return;
        this.lastbreakpoint = breakpoint;
        this.responsiveValue.set(breakpoint ? toNumber((this as Record<string, unknown>)[`responsive-${breakpoint}`], 0) : 0);
    }

    private _generateCssContentRules(columnDef: CdkColumnDef, label: string, hostCssId: string) {

        const columnClass = columnDef._columnCssClassName.find(c => c == `cdk-column-${columnDef.cssClassFriendlyName}`);
        if (this.responsiveHeader && columnDef.name === this.responsiveHeader) {
            if (!columnDef._columnCssClassName.includes('cell-resposive-header'))
                columnDef._columnCssClassName.push('cell-resposive-header');
        }
        return `${hostCssId} .${columnClass} {--cell-data-label:'${label}';}`;
    }

    private updateCssContentRules() {
        if (!this._columnDataDefs || !this._columnDefs)
            return;
        const allColumnDef = Array.from(this._columnDefs);
        if (this.responsive) {
            const cssRules: string[] = [];
            const tableNgAttributes = findElementAttributeByPrefix(this.elementRef.nativeElement.attributes, NG_HOST_PREFIX, NG_CONTENT_PREFIX);
            const _hostCssId = tableNgAttributes[NG_HOST_PREFIX] ?? tableNgAttributes[NG_CONTENT_PREFIX] ?? '';
            const _isolationId = _hostCssId ? `[${_hostCssId}]` : '';
            this._columnDataDefs.forEach(dataDef => {
                cssRules.push(this._generateCssContentRules(dataDef.columnDef, dataDef.label ?? dataDef.columnDef.name, _isolationId));
                removeFromArray(allColumnDef, dataDef.columnDef);
            });
            allColumnDef.forEach(columnDef => {
                cssRules.push(this._generateCssContentRules(columnDef, columnDef.name, _isolationId));
            });

            this._cellLabelCssElement?.remove();
            this._cellLabelCssElement = addStyleSectionToDocument(`${_isolationId}-cell-label`, cssRules.join(' '));
        } else if (this.responsiveHeader) {
            const responsiveHeaderColumn = allColumnDef.find(c => c.name === this.responsiveHeader);
            if (responsiveHeaderColumn && !responsiveHeaderColumn._columnCssClassName.includes('cell-resposive-header'))
                responsiveHeaderColumn._columnCssClassName.push('cell-resposive-header');
        }
    }

}
