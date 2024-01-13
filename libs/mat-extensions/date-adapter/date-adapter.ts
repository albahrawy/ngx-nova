import { Injectable, Optional, Inject } from "@angular/core";
import { DateAdapter, MAT_DATE_LOCALE } from "@angular/material/core";
import {
    addDays, addMonths, addYears, daysInMonth, formatDate, getDateNames, getDayOfWeekNames,
    getFirstDayOfWeek, getMonthNames, isDate, isValidDate, parseDate, toISOString
} from "@ngx-nova/js-extensions";

/** Adds nova-date support to Angular Material. */

function _toDate(value: unknown) { return parseDate(value) ?? new Date(NaN); }

@Injectable()
export class NovaDateAdapter extends DateAdapter<Date, string> {

    #_monthNames: string[] | null = null;
    #_dateNames: string[] | null = null;
    #_dayOfWeekNames: string[] | null = null;

    constructor(@Optional() @Inject(MAT_DATE_LOCALE) dateLocale: string) {
        super();
        super.setLocale(dateLocale);
    }

    getYear(date: Date): number {
        return _toDate(date).getFullYear();
    }

    getMonth(date: Date): number {
        return _toDate(date).getMonth();
    }

    getDate(date: Date): number {
        return _toDate(date).getDate();
    }

    getDayOfWeek(date: Date): number {
        return _toDate(date).getDay();
    }

    getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
        return this.#_monthNames ?? (this.#_monthNames = getMonthNames(style, this.locale));
    }

    getDateNames(): string[] {
        return this.#_dateNames ?? (this.#_dateNames = getDateNames());
    }

    getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
        return this.#_dayOfWeekNames ?? (this.#_dayOfWeekNames = getDayOfWeekNames(style, this.locale));
    }

    getYearName(date: Date): string {
        return this.format(date, 'yyyy');
    }

    getFirstDayOfWeek(): number {
        return getFirstDayOfWeek();
    }

    getNumDaysInMonth(date: Date): number {
        return daysInMonth(date.getMonth() + 1, date.getFullYear());
    }

    clone(date: Date): Date {
        return new Date(date.getTime());
    }

    createDate(year: number, month: number, date: number): Date {
        if (month < 0 || month > 11) {
            throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
        }

        if (date < 1) {
            throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
        }

        const result = new Date();
        result.setFullYear(year, month, date);
        result.setHours(0, 0, 0, 0);

        // Check that the date wasn't above the upper bound for the month, causing the month to overflow
        if (result.getMonth() != month) {
            throw Error(`Invalid date "${date}" for month with index "${month}".`);
        }

        return result;
    }

    today(): Date {
        return new Date();
    }

    parse(value: unknown, parseFormat: string | string[]): Date | null {
        return parseDate(value, parseFormat);
    }

    format(date: Date, displayFormat: string): string {
        const formatted = formatDate(date, displayFormat, this.locale);
        if (!formatted)
            throw Error('DateNovaAdapter: Cannot format invalid date.');
        return formatted;
    }

    addCalendarYears(date: Date, years: number): Date {
        return addYears(date, years);
    }

    addCalendarMonths(date: Date, months: number): Date {
        return addMonths(date, months);
    }

    addCalendarDays(date: Date, days: number): Date {
        return addDays(date, days);
    }

    toIso8601(date: Date): string {
        return toISOString(date);
    }

    override deserialize(value: unknown): Date | null {
        if (typeof value === 'string') {
            if (!value)
                return null;
            const date = parseDate(value);
            if (date)
                return date;
        }
        return super.deserialize(value);
    }

    isDateInstance(obj: unknown): boolean {
        return isDate(obj);
    }

    isValid(date: Date): boolean {
        return isValidDate(date);
    }

    invalid(): Date {
        return new Date(NaN);
    }

    override setLocale(locale: string): void {
        super.setLocale(locale);
        this.#_monthNames = this.#_dateNames = this.#_dayOfWeekNames = null;

    }
}