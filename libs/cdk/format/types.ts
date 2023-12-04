import { InjectionToken } from "@angular/core";

export const NOVA_VALUE_FORMATTER = new InjectionToken<IValueFormatter>('NOVA_VALUE_FORMATTER');

export interface IValueFormatter {
    format(value: unknown, formatstring?: string): string | null;
}