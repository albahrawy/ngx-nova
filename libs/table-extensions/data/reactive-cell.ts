import { Component, Input, computed, inject } from "@angular/core";
import { TableColumnDataDef } from "./dataDef.directive";
import { CdkTableDataSourceDirective } from "./datasource.directive";
import { RowDataDirective } from "./row-data.directive";
import { DefaultColumnDataDef } from "./default-data-def.directive";
import { CdkColumnDef } from "@angular/cdk/table";
import { NOVA_LOCALIZER, NovaDefaultLocalizer } from "@ngx-nova/cdk/localization";

@Component({
    selector: 'mat-cell[reactive-cell],cdk-cell[reactive-cell]',
    template: `{{cellText()}}`,
    hostDirectives: [RowDataDirective],
    standalone: true,
})
export class CdkTableReactiveCell {
    private columnDataDef = inject(TableColumnDataDef, { optional: true }) ?? new DefaultColumnDataDef(inject(CdkColumnDef));
    protected localizer = inject(NOVA_LOCALIZER, { optional: true }) ?? inject(NovaDefaultLocalizer);
    private dataSourceDirective = inject(CdkTableDataSourceDirective);
    private rowdataDirective = inject(RowDataDirective, { self: true });

    @Input() data: unknown

    cellText = computed(() => {
        this.dataSourceDirective.dataNotifier();
        const cellValueAccessor = this.columnDataDef.cellValueAccessor();
        return cellValueAccessor.formatValue(cellValueAccessor.getValue(this.rowdataDirective.data), this.localizer.currentLang());
    });
}