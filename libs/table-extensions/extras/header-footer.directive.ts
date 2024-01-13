import { CdkFooterRowDef, CdkHeaderRowDef, CdkTable } from '@angular/cdk/table';
import { AfterViewInit, Directive, Input, OnChanges, SimpleChanges, booleanAttribute, inject } from '@angular/core';
import { CdkFilterRowDef } from '@ngx-nova/table-extensions/filter-core';

@Directive({
    selector: `mat-table[showHeader],cdk-table[showHeader],
               mat-table[showFooter],cdk-table[showFooter],
               mat-table[showFilter],cdk-table[showFilter]`,
    standalone: true,
})
export class CdKTableHeaderFooter implements AfterViewInit, OnChanges {

    private _allHeaderRowDefs: CdkHeaderRowDef[] = [];
    private _realHeaderRowDefs: CdkHeaderRowDef[] = [];
    private _filterRowDefs: CdkHeaderRowDef[] = [];
    private _contentFooterRowDefs: CdkFooterRowDef[] = [];
    private _table = inject(CdkTable, { host: true });

    //#region inputs

    @Input({ transform: booleanAttribute }) showHeader: boolean = true;
    @Input({ transform: booleanAttribute }) showFilter: boolean = true;
    @Input({ transform: booleanAttribute }) showFooter: boolean = false;

    //#endregion

    ngOnChanges(changes: SimpleChanges): void {
        if ('showHeader' in changes && !changes['showHeader'].isFirstChange() ||
            'showFilter' in changes && !changes['showFilter'].isFirstChange())
            this._updateHeaderState(changes['showHeader']?.previousValue ?? this.showHeader,
                changes['showFilter']?.previousValue ?? this.showFilter);
        if ('showFooter' in changes && !changes['showFooter'].isFirstChange())
            this._updateFooterState();
    }

    ngAfterViewInit() {
        this._allHeaderRowDefs = this._table._contentHeaderRowDefs.toArray();
        this._realHeaderRowDefs = this._allHeaderRowDefs.filter(v => !(v instanceof CdkFilterRowDef));
        this._filterRowDefs = this._allHeaderRowDefs.filter(v => (v instanceof CdkFilterRowDef));
        this._contentFooterRowDefs = this._table._contentFooterRowDefs.toArray();
        this._updateHeaderState(true, true);
        this._updateFooterState();
    }

    private _updateHeaderState(prevHeader: boolean, prevFilter: boolean) {
        if (prevHeader === this.showHeader && prevFilter === this.showFilter)
            return;
        if (this.showHeader && this.showFilter) {
            this._table._contentHeaderRowDefs.reset(this._allHeaderRowDefs);
        } else if (this.showHeader && !this.showFilter) {
            this._table._contentHeaderRowDefs.reset(this._realHeaderRowDefs);
        } else if (this.showFilter && !this.showHeader) {
            this._table._contentHeaderRowDefs.reset(this._filterRowDefs);
        } else {
            this._table._contentHeaderRowDefs.reset([]);
        }

        //@ts-expect-error call private member
        this._table._headerRowDefChanged = true;
    }

    private _updateFooterState() {
        let changed = false;
        if (this.showFooter && this._table._contentFooterRowDefs.length == 0) {
            this._table._contentFooterRowDefs.reset(this._contentFooterRowDefs);
            changed = true;
        } else if (!this.showFooter && this._table._contentFooterRowDefs.length > 0) {
            this._table._contentFooterRowDefs.reset([]);
            changed = true;
        }
        if (changed)
            //@ts-expect-error call private member
            this._table._footerRowDefChanged = true;
    }
}