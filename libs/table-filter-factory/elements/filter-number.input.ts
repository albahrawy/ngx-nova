import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { NumericInput } from '@ngx-nova/mat-extensions/inputs';
import { TableFilterElementBase } from '@ngx-nova/table-extensions/filter-core';
import { INumberElementArgs, NumberFilterPredicates } from '../common/types';


@Component({
    selector: 'filter-number-element',
    host: { 'class': 'filter-number-element' },
    template: `
        <input matInput inputmode="numeric" class="filter-inner-input" [allowArrowKeys]="options.allowArrowKeys"
        [currency]="options.currency" [step]="options.step" [min]="options.min" [max]="options.max" [locale]="options.locale"
        [thousandSeparator]="options.thousandSeparator" [percentage]="options.percentage" 
        (valueChanged)="onValueChange($event)" />
    `,
    standalone: true,
    imports: [MatInputModule, NumericInput]
})

export class TableFilterNumber extends TableFilterElementBase<number | bigint, INumberElementArgs> {
    override readonly defaultOperation = 'equals'
    override readonly predicates = NumberFilterPredicates;
}