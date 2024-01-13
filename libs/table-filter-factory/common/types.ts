import { DateFilterFn } from "@angular/material/datepicker";
import { FilterPredicates } from "@ngx-nova/table-extensions/filter-core";

export const NumberFilterPredicates: FilterPredicates<number | bigint> = {
    'equals': (a, b) => a == b,
    'notEquals': (a, b) => a != b,
    'greaterThan': (a, b) => a > b,
    'greaterThanOrEqual': (a, b) => a >= b,
    'lesserThan': (a, b) => a < b,
    'lesserThanOrEqual': (a, b) => a <= b,
};

export const StringFilterPredicates: FilterPredicates<string> = {
    'contains': (a, b) => a.includes(b),
    'equals': (a, b) => a.localeCompare(b) === 0,
    'notEquals': (a, b) => a.localeCompare(b) !== 0,
    'startsWith': (a, b) => a.startsWith(b),
    'endsWith': (a, b) => a.endsWith(b)
};

export const DateFilterPredicates: FilterPredicates<Date> = {
    'equals': (a, b) => a?.valueOf() == b?.valueOf(),
    'notEquals': (a, b) => a?.valueOf() != b?.valueOf(),
    'greaterThan': (a, b) => a?.valueOf() > b?.valueOf(),
    'greaterThanOrEqual': (a, b) => a?.valueOf() >= b?.valueOf(),
    'lesserThan': (a, b) => a?.valueOf() < b?.valueOf(),
    'lesserThanOrEqual': (a, b) => a?.valueOf() <= b?.valueOf(),
};

export interface INumberElementArgs {
    showButton?: boolean;
    step: number;
    min?: number;
    max?: number;
    inputmode?: 'numeric' | 'decimal';
    locale?: string;
    allowArrowKeys?: boolean;
    thousandSeparator?: boolean
    percentage: boolean;
    currency?: string
    decimalDigits?: number
}

export interface IDateElementArgs {
    min?: Date | null;
    max?: Date | null;
    dateFilter?: DateFilterFn<Date | null>;
    dateFormat?: string | null
}

export interface ISelectElementArgs {

}