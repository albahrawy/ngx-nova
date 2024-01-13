import { CdkColumnDef } from "@angular/cdk/table";
import { Component, Input, OnInit, inject } from "@angular/core";
import { NOVA_LOCALIZER, NovaDefaultLocalizer } from "@ngx-nova/cdk/localization";
import { TableColumnDataDef } from "./dataDef.directive";
import { DefaultColumnDataDef } from "./default-data-def.directive";
import { RowDataDirective } from "./row-data.directive";

@Component({
    selector: 'mat-cell[readonly-cell],cdk-cell[readonly-cell]',
    template: `{{cellText}}`,
    hostDirectives: [RowDataDirective],
    standalone: true,
})
export class CdkTableReadonlyCell implements OnInit {

    private columnDataDef = inject(TableColumnDataDef, { optional: true }) ?? new DefaultColumnDataDef(inject(CdkColumnDef));
    protected localizer = inject(NOVA_LOCALIZER, { optional: true }) ?? inject(NovaDefaultLocalizer);
    private rowdataDirective = inject(RowDataDirective, { self: true });

    @Input() data: unknown

    cellText?: string | null = null;

    ngOnInit(): void {
        const cellValueAccessor = this.columnDataDef.cellValueAccessor();
        this.cellText = cellValueAccessor.formatValue(
            cellValueAccessor.getValue(this.rowdataDirective.data),
            this.localizer.currentLang());
    }
}