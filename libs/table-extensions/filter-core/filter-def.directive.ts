import { ComponentType } from "@angular/cdk/portal";
import { CdkColumnDef, CdkHeaderCellDef, CdkHeaderRowDef } from "@angular/cdk/table";
import { ContentChild, Directive, TemplateRef, Type, inject } from "@angular/core";
import { CdkTableFilterEvents } from "./filter-events.directive";
import { TABLE_FILTER_COMPONENT_FACTORY, FilterType, IFilterChangedArgs } from "./types";
import { TableColumnDataDef } from "../data";

declare module '@angular/cdk/table' {
    interface CdkColumnDef {
        filterCell: CdkFilterCellDef;
    }
}

@Directive({
    selector: '[cdkFilterCellDef], [matFilterCellDef]',
    inputs: ['type: cdkFilterCellDef', 'type: matFilterCellDef', 'options: cdkFilterCellDefOptions', 'options: matFilterCellDefOptions',
        'filterkey: cdkFilterCellDefFilterkey', 'filterkey: matFilterCellDefFilterkey'],
    standalone: true,
})
export class CdkFilterCellDef extends CdkHeaderCellDef {
    private _componentFactory = inject(TABLE_FILTER_COMPONENT_FACTORY, { optional: true });
    private columnDef = inject(CdkColumnDef);
    private columnDataDef = inject(TableColumnDataDef, { optional: true });
    private tableEvents = inject(CdkTableFilterEvents, { optional: true, host: true });

    private _type: FilterType = null;
    private _filterkey!: string;

    filterComponent?: ComponentType<unknown> | null = null;

    get type(): FilterType { return this._type; }
    set type(value: FilterType) {
        this._type = value;
        this.filterComponent = (value instanceof Type) ? value : this._componentFactory?.getComponent(value);
    }

    options?: unknown;

    get filterkey(): string { return this._filterkey ?? this.columnDataDef?.dataKey ?? this.columnDef.name; }
    set filterkey(value: string) { this._filterkey = value; }

    changeFilter(args: IFilterChangedArgs) {
        this.tableEvents?.changeFilter(args);
    }

    clearFilter(key: string) {
        this.tableEvents?.clearFilter(key);
    }
}

@Directive({
    selector: '[matColumnDef],[cdkColumnDef]',
    standalone: true
})
export class CdkColumnDefFilter {
    private columnDef = inject(CdkColumnDef, { self: true });
    @ContentChild(CdkFilterCellDef)
    set filterCell(value: CdkFilterCellDef) { this.columnDef.filterCell = value; }
}


@Directive({
    selector: '[cdkFilterRowDef], [matFilterRowDef]',
    providers: [{ provide: CdkHeaderRowDef, useExisting: CdkFilterRowDef }],
    inputs: ['columns: cdkFilterRowDef', 'columns: matFilterRowDef', 'sticky: cdkFilterRowDefSticky', 'sticky: matFilterRowDefSticky'],
    standalone: true
})
export class CdkFilterRowDef extends CdkHeaderRowDef {
    override extractCellTemplate(column: CdkColumnDef): TemplateRef<unknown> {
        return column.filterCell.template;
    }
}