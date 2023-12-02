/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { dates } from "./date";
import { is } from "./is";
import { ValueMap, ValueType } from "./types";

export namespace to {
    const valueTypeList = ['int', 'string', 'number', 'date', 'dateTime', 'boolean'];

    export function string(value: any): string {
        if (typeof value === 'string')
            return value;

        if (value == null)
            return '';

        if (Array.isArray(value))
            return value.map((other) => other == null ? other : string(other)).join(',');

        if (is.symbol(value))
            return value.toString();

        if (is.date(value))
            return value.toJSON();

        if (is.object(value))
            return JSON.stringify(value);

        const result = `${value}`;
        return isNaN(value) ? 'NaN' : (result == '0' && (1 / value) == -(1 / 0)) ? '-0' : result;
    }

    export function boolean(value: any): boolean {
        if (typeof value === 'boolean')
            return value;
        const type = Object.prototype.toString.call(value).slice(8, -1);
        switch (type) {
            case 'Boolean':
                return value;
            case 'Number':
                return value !== 0;
            case 'String':
                if (value.toLowerCase() == 'true')
                    return true;
                else if (is.numberString(value))
                    return +value !== 0;
                else
                    return false;
            default:
                return false;
        }
    }
    export function number(value: any, defaultValue?: number): number {
        if (typeof value === 'number')
            return value;

        if (defaultValue === undefined)
            defaultValue = 0;
        if (value == null)
            return defaultValue;
        if (is.number(value))
            return value;

        if (is.symbol(value))
            return defaultValue;

        if (!is.primitive(value)) {
            const other = typeof value.valueOf === 'function' ? value.valueOf() : value;
            value = is.primitive(other) ? other : `${other}`;
        }

        if (typeof value === 'string') {
            value = value.trim().toLowerCase();
            if (is.numberHex(value))
                value = '0x' + value;
        }
        value = +value;
        if (isNaN(value))
            value = defaultValue;
        return value;
    }
    
    export function int(value: any): number {
        const newValue = number(value, 0);
        if (newValue === Infinity || newValue === -Infinity)
            return (newValue < 0 ? -1 : 1) * Number.MAX_SAFE_INTEGER;
        return newValue - (newValue % 1);
    }

    export function date(value: any, parseFormat?: string | string[]): Date | null {
        return dates.parse(value, parseFormat);
    }

    export function dateTime(value: any, parseFormat?: string | string[]): Date | null {
        return dates.parse(value, parseFormat);
    }

    export function valueType<T, K extends ValueType & keyof typeof to>(value: T, valueType: K): K extends keyof ValueMap ? ValueMap[K] : T {
        if (valueType && valueType in valueTypeList) {
            const converter = valueType as Exclude<keyof typeof to, 'valueType'>; // Type assertion
            return to[converter](value) as any;
        } else {
            return value as any;
        }
    }
}