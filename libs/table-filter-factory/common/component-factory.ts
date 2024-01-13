import { Injectable, Type } from '@angular/core';
import { ITableFilterComponentFactory, ITableFilterElement } from '@ngx-nova/table-extensions/filter-core';
import { TableFilterDate } from '../elements/filter-date.input';
import { TableFilterDecimal } from '../elements/filter-decimal.input';
import { TableFilterNumber } from '../elements/filter-number.input';
import { TableFilterString } from '../elements/filter-text.input';


@Injectable({ providedIn: 'root' })
export class DefaultFilterComponentFactory implements ITableFilterComponentFactory {
    getComponent(type: string | null): Type<ITableFilterElement> | null {
        switch (type) {
            case 'string':
                return TableFilterString;
            case 'number':
                return TableFilterNumber;
            case 'decimal':
                return TableFilterDecimal;
            case 'date':
                return TableFilterDate;
            default:
                return null;
        }
    }
}