import { CdkHeaderCell, CdkColumnDef, CDK_ROW_TEMPLATE, CdkHeaderRow, CdkTableModule } from "@angular/cdk/table";
import { Directive, ElementRef, Component, ChangeDetectionStrategy, ViewEncapsulation } from "@angular/core";

@Directive({
    selector: 'cdk-filter-cell, th[cdk-filter-cell], mat-filter-cell, th[mat-filter-cell]',
    host: {
        'class': 'cdk-filter-cell mat-filter-cell mat-mdc-header-cell mdc-data-table__header-cell',
        'role': 'columnheader',
    },
    standalone: true
})
export class CdkFilterCell extends CdkHeaderCell {
    constructor(columnDef: CdkColumnDef, elementRef: ElementRef) {
        super(columnDef, elementRef);
    }
}

@Component({
    selector: 'cdk-filter-row, tr[cdk-filter-row], mat-filter-row, tr[mat-filter-row]',
    template: CDK_ROW_TEMPLATE,
    host: {
        'class': 'cdk-filter-row mat-mdc-filter-row mdc-data-table__filter-row',
        'role': 'row',
    },
    changeDetection: ChangeDetectionStrategy.Default,
    encapsulation: ViewEncapsulation.None,
    providers: [{ provide: CdkHeaderRow, useExisting: CdkFilterRow }],
    standalone: true,
    //TODO: enable it when released
    //imports: [CdkCellOutlet]
    imports: [CdkTableModule]
})
export class CdkFilterRow extends CdkHeaderRow { }