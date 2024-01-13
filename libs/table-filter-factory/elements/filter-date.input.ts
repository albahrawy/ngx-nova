import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { DateMaskInput, DateFormatDirective, NovaDateInput } from '@ngx-nova/mat-extensions/inputs';
import { TableFilterElementBase } from '@ngx-nova/table-extensions/filter-core';
import { IDateElementArgs, DateFilterPredicates } from '../common/types';


@Component({
    selector: 'filter-date-element',
    host: { 'class': 'filter-date-element' },
    template: `
        <input class="filter-inner-input" inputmode="date" [min]="options.min!" [max]="options.max!" 
        [dateFormat]="options.dateFormat" [matDatepickerFilter]="options.dateFilter!" matInput color="primary" 
        (dateChange)="onValueChange($event.value)"/>
        `,
    standalone: true,
    imports: [MatInputModule, DateMaskInput, DateFormatDirective, NovaDateInput]

})

export class TableFilterDate extends TableFilterElementBase<Date, IDateElementArgs> {
    override readonly defaultOperation = 'equals'
    override readonly predicates = DateFilterPredicates;
}