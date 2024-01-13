import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { TableFilterElementBase } from '@ngx-nova/table-extensions/filter-core';
import { StringFilterPredicates } from '../common/types';

const StringLocalConverter = (value: string) => value.toLocaleLowerCase();
@Component({
    selector: 'filter-text-element',
    host: { 'class': 'filter-text-element' },
    template: `<input #_inputElement matInput class="filter-inner-input" (input)="onValueChange(_inputElement.value)" />`,
    standalone: true,
    imports: [MatInputModule]
})

export class TableFilterString extends TableFilterElementBase<string> {
    override valueConverterFactory = () => StringLocalConverter;
    override readonly defaultOperation = 'contains'
    override readonly predicates = StringFilterPredicates;
}