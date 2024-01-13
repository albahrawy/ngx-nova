/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { isDate, isNumber, isString } from "./is";
import { toNumber } from "./to";
import { IFunc } from "./types";

const MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Utility namespace for array manipulation functions.
 */

/**
 * Returns a new array containing only the unique elements from the input array.
 * 
 * @template T - The type of array elements.
 * @param {Array<T>} array - The input array.
 * @returns {Array<T>} - The array with unique elements.
 */
export function uniqueArray<T>(array: Array<T>): Array<T> {
    return array ? [... new Set(array)] : array;
}

/**
 * Joins multiple path segments into a single path string.
 * Removes duplicate slashes and handles file protocol (file://) properly.
 *
 * @param {...string[]} args - Path segments to be joined.
 * @returns {string} - The concatenated path.
 */
export function joinAsPath(...args: string[]): string {
    if (args.length === 0)
        return '';
    return args.map((part, i) => {
        if (isString(part)) {
            part = part.replace(/\/\/+/g, '/').replace(/^[/]+/, '').replace(/[/]+$/, '');
            if (i == 0) {
                const protocolFixer = part.match(/^file:/) ? '//' : '/';
                if (part.endsWith(':'))
                    part += protocolFixer;
                else
                    part = part.replace(':/', `:/${protocolFixer}`);
            }
            return part;
        }
        return '';
    }).filter(x => x.length).join('/');
}

/**
 * Creates an array of numbers in a specified range, including both endpoints.
 * 
 * @param {number} start - The starting number of the range.
 * @param {number} end - The ending number of the range.
 * @returns {number[]} - The array of numbers within the specified range.
 */
export function enumerableRange(start: number, end: number): number[] {
    return Array.from(Array(end + 1 - start), (_, index) => index + start);
}

/**
 * Removes the specified item from the array and returns its index.
 * If the item is not found, returns -1.
 * 
 * @template T - The type of array elements.
 * @param {Array<T>} source - The source array.
 * @param {T} item - The item to remove.
 * @returns {number} - The index of the removed item, or -1 if not found.
 */
export function removeFromArray<T>(source: Array<T>, item: T): number {
    if (!Array.isArray(source) || !item) { return -1; }
    const index = source.indexOf(item);
    if (index >= 0) {
        source.splice(index, 1);
        return index;
    }
    return -1;
}

/**
 * Converts an array to a Map using the specified key getter function.
 *
 * @template V - The type of array elements.
 * @template K - The type of Map keys.
 * @param {Array<V>} array - The input array.
 * @param {IFunc<V, K>} keyGetter - The function to extract keys from array elements.
 * @returns {Map<K, V>} - The Map with keys and array elements.
 */
export function arrayToMap<V, K = string>(array: Array<V>, keyGetter: IFunc<V, K>): Map<K, V> {
    const map = new Map<K, V>();
    array.forEach(item => map.set(keyGetter(item), item));
    return map;
}

/**
 * Get the intersection of two arrays which are common to both arrays. 
 * The order of the elements in the intersection are same as order in first array.
 * @param arr1 first array to check
 * @param arr2 second array to check
 * @returns  The array of items which are common to both arrays.
 */
export function arrayIntersect<T>(arr1: T[], arr2: T[]): T[] {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    return [...new Set([...set1].filter((item) => set2.has(item)))];
}

/**
 * Computes the sum of the sequence of number values that are obtained by invoking a transform function on each element of the input array.
 * if transform is not exist assums that array is a number array. 
 * @param array An array of values that are used to calculate a sum.
 * @param transform A transform function to apply to each element.
 * @returns The sum of the projected values.
 * @summary if value is not a number it will be eliminated
 */
export function arraySum<T>(array: T[], transform?: IFunc<T, unknown>): number {
    const getter = transform ?? (v => v);
    return array.reduce((acc, value) => acc + toNumber(getter(value), 0), 0) ?? 0;
}

/**
* Sorts ascending an array in place and providing a transform function to obtain specific value from element if it is an object.
* this function handles the correct type of the elements.
* @param array An array of values that are used to calculate a sum.
* @param transform A transform function to apply to each element.
* @param direction 1 for ascending sort and -1 for descending. default is 1.
* @param locale a string represnet a locale to used when comparing string in a local language. defaule is undefined
* @returns a reference to the same array.
*/
export function arraySort<T>(array: T[], transform: IFunc<T, unknown> | undefined = undefined, direction: 1 | -1 = 1, locale?: string): T[] {
    return sortCore(array, direction, transform, locale);
}

// /**
// * Sorts descending an array in place and providing a transform function to obtain specific value from element if it is an object.
// * this function handles the correct type of the elements.
// * @param array An array of values that are used to calculate a sum.
// * @param transform A transform function to apply to each element.
// * @returns a reference to the same array.
// */
// export function arraySortDescending<T>(array: T[], transform?: IFunc<T, unknown>): T[] {
//     return sortCore(array, -1, transform);
// }

// export const arrays = {
//     unique,
//     joinAsPath,
//     enumerableRange,
//     remove,
//     toMap,
//     intersect,
//     sum,
//     sort,
//     sortDescending
// }

//TODO: add min and max

function sortCore<T>(array: T[], direction: 1 | -1, transform?: IFunc<T, unknown>, locale?: string): T[] {
    if (!Array.isArray(array))
        return array;
    const getter = transform ?? (v => v);
    const safeGetter = (v: T) => convertToSafeValue(getter(v));
    const collator = typeof locale === 'string' ? new Intl.Collator(locale) : undefined;
    return array.sort((a, b) => performSort(safeGetter(a), safeGetter(b), direction, collator));
}

function convertToSafeValue(value: unknown) {
    if (isDate(value))
        return value.valueOf();
    if (isNumber(value)) {
        return value < MAX_SAFE_INTEGER ? value : value + '';
    }
    return value;
}

function performSort(valueA: unknown, valueB: unknown, direction: 1 | -1, collator?: Intl.Collator) {
    const valueAType = typeof valueA;
    const valueBType = typeof valueB;
    if (valueAType !== valueBType) {
        if (valueAType === 'number')
            valueA += '';
        if (valueBType === 'number')
            valueB += '';
    }

    let comparatorResult = 0;
    if (valueA != null && valueB != null) {
        // Check if one value is greater than the other; if equal, comparatorResult should remain 0.
        if (collator && typeof valueA === 'string' && typeof valueB === 'string') {
            comparatorResult = collator.compare(valueA, valueB);
        } else {
            if (valueA > valueB)
                comparatorResult = 1;
            else if (valueA < valueB)
                comparatorResult = -1;
        }
    } else if (valueA != null) {
        comparatorResult = 1;
    } else if (valueB != null) {
        comparatorResult = -1;
    }

    return comparatorResult * direction;
}


/**
 * Adds utility functions as prototype extensions to the Array object.
 * Used to enable Array.prototype methods for convenience.
 */
// export function addProtoTypeExtensions() {
//     // if (!Array.prototype.unique)
//     //     Array.prototype.unique = function () { return unique(this); }
//     // if (!Array.prototype.joinAsPath)
//     //     Array.prototype.joinAsPath = function () { return joinAsPath(...this); }
//     // if (!Array.enumerableRange)
//     //     Array.enumerableRange = enumerableRange;
// }


// Declaration merging for Array prototype extensions
declare global {

    interface Array<T> {
        unique(): Array<T>;
        joinAsPath(): string;
        remove<T>(source: Array<T>, item: T): number;
        toMap<V, K = string>(array: Array<V>, keyGetter: IFunc<V, K>): Map<K, V>;
    }

    interface ArrayConstructor {
        enumerableRange(start: number, end: number): number[];
    }
}