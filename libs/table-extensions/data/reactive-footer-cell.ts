import { CdkColumnDef } from "@angular/cdk/table";
import { Component, computed, inject } from "@angular/core";
import { TableColumnDataDef } from "./dataDef.directive";
import { CdkTableDataSourceDirective } from "./datasource.directive";
import { DefaultColumnDataDef } from "./default-data-def.directive";
import { NOVA_LOCALIZER, NovaDefaultLocalizer } from "@ngx-nova/cdk/localization";

@Component({
    selector: 'mat-footer-cell[reactive-footer],cdk-footer-cell[reactive-footer]',
    template: `{{cellText()}}`,
    standalone: true,
})
export class CdkTableFooterReactiveCell {
    private columnDataDef = inject(TableColumnDataDef, { optional: true }) ?? new DefaultColumnDataDef(inject(CdkColumnDef));
    protected localizer = inject(NOVA_LOCALIZER, { optional: true }) ?? inject(NovaDefaultLocalizer);
    private dataSourceDirective = inject(CdkTableDataSourceDirective);

    cellText = computed(() => {
        this.dataSourceDirective.dataNotifier();
        const cellValueAccessor = this.columnDataDef.cellValueAccessor();
        return cellValueAccessor.formatFooter(cellValueAccessor.getFooterValue(), this.localizer.currentLang());
    });
}