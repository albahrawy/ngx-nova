import { DateFilterFn } from "@angular/material/datepicker";

export interface INumberElementArgs {
    showButton?: boolean;
    step: number;
    min?: number;
    max?: number;
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