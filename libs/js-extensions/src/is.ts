/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { Constructor } from "./types";

// // eslint-disable-next-line @typescript-eslint/no-namespace
// export namespace is {
type TypeArrayLike = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array
    | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray;

const typeArrayReqx = /^\[object (?:Float(?:32|64)|(?:Int|Uint)(?:8|16|32)|Uint8Clamped)Array\]$/;
const arrowFuncRegx = /\([a-z|A-Z|0-9|_|\s|,|:]*\)[\s|:|a-z|A-Z|0-9|_|<|>]*=>/;
const funcRegx = /function[\s|a-z|A-Z|0-9|_]*\([a-z|A-Z|0-9|_|\s|,|:]*\)\s*{/;
const classReqx = /^\s*class/;
const hexRegex = /^0x[0-9a-fA-F]+$/;
const imageExtensions = ['jpg', 'png', 'gif', 'bmp', 'jpeg', 'jpe', 'tif', 'tiff'];

const getType = (value: unknown) => Object.prototype.toString.call(value).slice(8, -1);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isType = <T>(value: unknown, type: string, instance: T): value is T => typeof value === type || value instanceof (instance as any);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isDOM = (value: any): value is HTMLElement => {
    return value != null && (
        (window.HTMLElement && value instanceof HTMLElement) ||
        (typeof value === "object" && value.nodeType === 1 && value.nodeName)
    );
}

/**
 * Type-checking utility function to determine if the given value is an object.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is an object, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isObject = (value: unknown): value is Record<string, any> => typeof value === 'object' && value?.constructor === Object;

/**
 * Type-checking utility function to determine if the given value is a class.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a class, false otherwise.
 */
export const isClass = (value: unknown): boolean => !!value && typeof value === 'object' && classReqx.test(value.constructor.toString());

/**
 * Type-checking utility function to determine if the given value is a string.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a string, false otherwise.
 */
export const isString = (value: unknown): value is string => isType(value, 'string', String);

/**
 * Type-checking utility function to determine if the given value is a boolean.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a boolean, false otherwise.
 */
export const isBoolean = (value: unknown): value is boolean => isType(value, 'boolean', Boolean);

/**
 * Type-checking utility function to determine if the given value is a number.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a number, false otherwise.
 */
export const isNumber = (value: unknown): value is number => isType(value, 'number', Number) && Number.isFinite(value) && !Number.isNaN(value);

/**
 * Type-checking utility function to determine if the given value is a bigInt.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a bigInt, false otherwise.
 */
export const isBigInt = (value: unknown): value is bigint => isType(value, 'bigint', BigInt);

/**
 * Type-checking utility function to determine if the given value is a Hexdecimal number.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a Hexdecimal number, false otherwise.
 */
export const isNumberHex = (value: unknown): value is string => typeof value === 'string' && hexRegex.test(value);

/**
 * Type-checking utility function to determine if the given value is a number in a string format.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a number in a string format, false otherwise.
 */
export const isNumberString = (value: unknown): boolean => typeof value === 'string' && !!value && (+value).toString() === value;

/**
 * Type-checking utility function to determine if the given value is a symbol.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a symbol, false otherwise.
 */
export const isSymbol = (value: unknown): value is symbol => typeof value == 'symbol' || getType(value) === 'Symbol';

/**
 * Type-checking utility function to determine if the given value is a array.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a array, false otherwise.
 */

export function isArray<T>(value: T[] | readonly T[] | unknown): value is Array<T> | ReadonlyArray<T> {
    return Array.isArray?.(value) || value instanceof Array;
}
/**
 * Type-checking utility function to determine if the given value is a TypedArray.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a TypedArray, false otherwise.
 * @description TypedArray is one of  Float32Array | Float64Array | Int8Array | Int16Array | Int32Array
    | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray
 */
export const isTypedArray = (value: unknown): value is TypeArrayLike => value != null && typeArrayReqx.test(Object.prototype.toString.call(value));

/**
 * Type-checking utility function to determine if the given value is a Arguments.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a Arguments, false otherwise.
 */
export const isArgumentsArray = (value: unknown): value is ArrayLike<unknown> => getType(value) === 'Arguments';

/**
 * Type-checking utility function to determine if the given value is a function.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a function, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const isFunction = (value: unknown): value is Function => typeof value === 'function';

/**
 * Type-checking utility function to determine if the given value is a string represented JS function.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a string represented JS function, false otherwise.
 */
export const isFunctionString = (value: unknown): boolean => typeof value === 'string' && (funcRegx.test(value) || arrowFuncRegx.test(value));

/**
 * Type-checking utility function to determine if the given value is a JS date.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a JS date, false otherwise.
 */
export const isDate = (value: unknown): value is Date => value instanceof Date || getType(value) === 'Date';

/**
 * Type-checking utility function to determine if the given value is a Map.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a Map, false otherwise.
 */
export const isMap = (value: unknown): value is Map<unknown, unknown> => value instanceof Map || getType(value) === 'Map';

/**
 * Type-checking utility function to determine if the given value is a Set.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is a Set, false otherwise.
 */
export const isSet = (value: unknown): value is Set<unknown> => value instanceof Set || getType(value) === 'Set';

/**
 * Type-checking utility function to determine if the given extension is an image file extension.
 * @param {string} extension - The extension to be checked.
 * @returns {boolean} - True if the extension is an image file extension, false otherwise.
 */
export const isImageFile = (extension: string): boolean => imageExtensions.includes(extension?.toLowerCase());

/**
 * Type-checking utility function to determine if the given value is a primitive type.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is not an object and not a function, false otherwise.
 */
export const isPrimitive = (value: unknown): boolean => value == null || (typeof value != 'object' && typeof value != 'function');

/**
 * Type-checking utility function to determine if the given value is a RegExp.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is RegExp, false otherwise.
 */
export const isRegExp = (value: unknown): value is RegExp => value instanceof RegExp;

/**
 * Type-checking utility function to determine if the given value is an empty value.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is empty, false otherwise.
 */
export function isEmpty(value: unknown): boolean {
    if (value == null)
        return true;
    if (isBoolean(value))
        return false;
    if (isArray(value) || isString(value) || isTypedArray(value) || isArgumentsArray(value))
        return !value.length;
    if (isMap(value) || isSet(value))
        return !value.size;
    if (isObject(value))
        return !Object.keys(value).length;
    return true;
}

/**
 * Type-checking utility function to determine if two values are equal.
 * @param {any} first - The first value to compare.
 * @param {any} second - The second value to compare.
 * @returns {boolean} - True if the values are equal, false otherwise.
 */
export function isEqual(first: unknown, second: unknown): boolean {
    if (first == null && second == null || first === second)
        return true;

    if (getType(first) != getType(second))
        return false;

    if (isDate(first) && isDate(second))
        return first.valueOf() === second.valueOf();

    if (isObject(first) && isObject(second)) {
        const keys1 = Object.keys(first);
        if (keys1.length !== Object.keys(second).length)
            return false;
        return keys1.every(k => isEqual(first[k], second[k]));
    }

    if (isArray(first) && isArray(second)) {
        if (first.length !== second.length)
            return false;
        const counts = new Map();
        const updateMap = (reqKey: unknown, addition: 1 | -1) => {
            if (isObject(reqKey) || isArray(reqKey) || isDate(reqKey)) {
                for (const selfKey of counts.keys())
                    if (isEqual(selfKey, reqKey)) {
                        reqKey = selfKey;
                        break;
                    }
            }
            counts.set(reqKey, (counts.get(reqKey) ?? 0) + addition);
        }
        first.forEach((v: unknown) => updateMap(v, 1));
        second.forEach((v: unknown) => updateMap(v, -1));
        return Array.from(counts.values()).every((count) => count === 0);
    }

    return first === second;
}

/**
 * Type-checking utility function to determine if the given value is an instance of a specific class.
 * @param {Constructor} Ctor - The constructor function of the class.
 * @param {any} value - The value to be checked.
 * @returns {boolean} - True if the value is an instance of the class or matches the specified conditions, false otherwise.
 */
export function is(Ctor: Constructor, value: unknown): boolean {
    return value instanceof Ctor || value != null &&
        (value.constructor === Ctor || (Ctor.name === 'Object' && typeof value === 'object'));
}

/**
 * Adds utility functions as prototype extensions to the object.
 * Used to enable Object.prototype methods for convenience.
 */
// export function addProtoTypeExtensions() { }
