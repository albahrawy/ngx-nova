import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { NumericInput } from '@ngx-nova/mat-extensions/inputs';
import { TableFilterNumber } from './filter-number.input';


@Component({
    selector: 'filter-decimal-element',
    host: { 'class': 'filter-decimal-element' },
    template: `
        <input matInput inputmode="decimal" class="filter-inner-input" [allowArrowKeys]="options.allowArrowKeys"
        [currency]="options.currency" [step]="options.step" [min]="options.min" [max]="options.max" [locale]="options.locale"
        [thousandSeparator]="options.thousandSeparator" [percentage]="options.percentage" [decimalDigits]="options.decimalDigits" 
        (valueChanged)="onValueChange($event)" />
    `,
    standalone: true,
    imports: [MatInputModule, NumericInput]
})

export class TableFilterDecimal extends TableFilterNumber {
}