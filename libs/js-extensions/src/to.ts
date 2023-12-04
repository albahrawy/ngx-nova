/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { parseDate } from "./date";
import { isBoolean, isDate, isNumber, isNumberHex, isNumberString, isObject, isPrimitive, isString, isSymbol } from "./is";
import { ValueMap, ValueType } from "./types";


const valueTypeList = ['int', 'string', 'number', 'date', 'dateTime', 'boolean'];

export function toStringValue(value: unknown): string {
    if (typeof value === 'string')
        return value;

    if (value == null)
        return '';

    if (Array.isArray(value))
        return value.map((other) => other == null ? other : toStringValue(other)).join(',');

    if (isSymbol(value))
        return value.toString();

    if (isDate(value))
        return value.toJSON();

    if (isObject(value))
        return JSON.stringify(value);

    const result = `${value}`;
    if (typeof value === 'number')
        return isNaN(value) ? 'NaN' : (result == '0' && (1 / value) == -(1 / 0)) ? '-0' : result;

    return result;
}

export function toBoolean(value: unknown): boolean {
    if (isBoolean(value))
        return value;

    if (isNumber(value))
        return value != 0;

    if (isNumberString(value) || isNumberHex(value))
        return toNumber(value) !== 0;

    if (isString(value))
        return value.toLowerCase() == 'true';

    return false;
}

export function toNumber(value: unknown, defaultValue?: number): number {
    if (typeof value === 'number')
        return value;

    if (defaultValue === undefined)
        defaultValue = 0;
    if (value == null)
        return defaultValue;
    if (isNumber(value))
        return value;

    if (isSymbol(value))
        return defaultValue;

    if (!isPrimitive(value)) {
        const other = typeof value.valueOf === 'function' ? value.valueOf() : value;
        value = isPrimitive(other) ? other : `${other}`;
    }

    if (typeof value === 'string') {
        let newValue = value.trim().toLowerCase();
        if (isNumberHex(newValue))
            newValue = '0x' + newValue;
        value = +newValue;
    }
    if (isNumber(value))
        return value;
    return defaultValue;
}

export function toInt(value: unknown): number {
    const newValue = toNumber(value, 0);
    if (newValue === Infinity || newValue === -Infinity)
        return (newValue < 0 ? -1 : 1) * Number.MAX_SAFE_INTEGER;
    return newValue - (newValue % 1);
}

export function toDate(value: unknown, parseFormat?: string | string[]): Date | null {
    return parseDate(value, parseFormat, false);
}

export function toDateTime(value: unknown, parseFormat?: string | string[]): Date | null {
    return parseDate(value, parseFormat);
}

export function valueType<T, K extends ValueType & keyof typeof toAll>(value: T, valueType: K): K extends keyof ValueMap ? ValueMap[K] : T {
    if (valueType && valueType in valueTypeList) {
        return toAll[valueType](value) as never;
    } else {
        return value as never;
    }
}

const toAll = {
    boolean: toBoolean,
    date: toDate,
    dateTime: toDateTime,
    int: toInt,
    number: toNumber,
    string: toStringValue
}