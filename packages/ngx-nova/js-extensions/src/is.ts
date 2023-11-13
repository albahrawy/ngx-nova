import { Constructor } from "./types";

export namespace is {
    type TypeArrayLike = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array
        | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray;

    const typeArrayReqx = /^\[object (?:Float(?:32|64)|(?:Int|Uint)(?:8|16|32)|Uint8Clamped)Array\]$/;
    const arrowFuncRegx = /\([a-z|A-Z|0-9|_|\s|,|:]*\)[\s|:|a-z|A-Z|0-9|_|<|>]*=>/;
    const funcRegx = /function[\s|a-z|A-Z|0-9|_]*\([a-z|A-Z|0-9|_|\s|,|:]*\)\s*{/;
    const classReqx = /^\s*class/;
    const hexRegex = /^0x[0-9a-fA-F]+$/;
    const imageExtensions = ['jpg', 'png', 'gif', 'bmp', 'jpeg', 'jpe', 'tif', 'tiff'];

    const getType = (value: any) => Object.prototype.toString.call(value).slice(8, -1);
    const isType = (value: any, type: string, instance: any): boolean => typeof value === type || value instanceof instance;

    /**
     * Type-checking utility function to determine if the given value is an object.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is an object, false otherwise.
     */
    export const object = (value: any): value is Record<string, any> => typeof value === 'object' && value.constructor === Object;

    /**
     * Type-checking utility function to determine if the given value is a class.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a class, false otherwise.
     */
    export const Class = (value: any): boolean => typeof value === 'object' && classReqx.test(value.constructor.toString());

    /**
     * Type-checking utility function to determine if the given value is a string.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a string, false otherwise.
     */
    export const string = (value: any): value is string => isType(value, 'string', String);

    /**
     * Type-checking utility function to determine if the given value is a boolean.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a boolean, false otherwise.
     */
    export const boolean = (value: any): value is boolean => isType(value, 'boolean', Boolean);

    /**
     * Type-checking utility function to determine if the given value is a number.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a number, false otherwise.
     */
    export const number = (value: any): value is number => isType(value, 'number', Number) && Number.isFinite(value);

    /**
     * Type-checking utility function to determine if the given value is a bigInt.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a bigInt, false otherwise.
     */
    export const bigInt = (value: any): value is bigint => isType(value, 'bigint', BigInt);

    /**
     * Type-checking utility function to determine if the given value is a Hexdecimal number.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a Hexdecimal number, false otherwise.
     */
    export const numberHex = (value: any): value is string => typeof value === 'string' && hexRegex.test(value);

    /**
     * Type-checking utility function to determine if the given value is a number in a string format.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a number in a string format, false otherwise.
     */
    export const numberString = (value: any): boolean => typeof value === 'string' && !!value && (+value).toString() === value;

    /**
     * Type-checking utility function to determine if the given value is a symbol.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a symbol, false otherwise.
     */
    export const symbol = (value: any): value is symbol => typeof value == 'symbol' || getType(value) === 'Symbol';

    /**
     * Type-checking utility function to determine if the given value is a array.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a array, false otherwise.
     */
    export const array = (value: any): value is Array<any> => Array.isArray?.(value) || value instanceof Array;

    /**
     * Type-checking utility function to determine if the given value is a TypedArray.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a TypedArray, false otherwise.
     * @description TypedArray is one of  Float32Array | Float64Array | Int8Array | Int16Array | Int32Array
        | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray
     */
    export const typedArray = (value: any): value is TypeArrayLike => value != null && typeArrayReqx.test(Object.prototype.toString.call(value));

    /**
     * Type-checking utility function to determine if the given value is a Arguments.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a Arguments, false otherwise.
     */
    export const argumentsArray = (value: any): value is ArrayLike<any> => getType(value) === 'Arguments';

    /**
     * Type-checking utility function to determine if the given value is a function.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a function, false otherwise.
     */
    export const Function = (value: any): value is Function => typeof value === 'function';

    /**
     * Type-checking utility function to determine if the given value is a string represented JS function.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a string represented JS function, false otherwise.
     */
    export const functionString = (value: any): boolean => typeof value === 'string' && (funcRegx.test(value) || arrowFuncRegx.test(value));

    /**
     * Type-checking utility function to determine if the given value is a JS date.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a JS date, false otherwise.
     */
    export const date = (value: any): value is Date => value instanceof Date || getType(value) === 'Date';

    /**
     * Type-checking utility function to determine if the given value is a Map.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a Map, false otherwise.
     */
    export const map = (value: any): value is Map<any, any> => value instanceof Map || getType(value) === 'Map';

    /**
     * Type-checking utility function to determine if the given value is a Set.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is a Set, false otherwise.
     */
    export const set = (value: any): value is Set<any> => value instanceof Set || getType(value) === 'Set';

    /**
     * Type-checking utility function to determine if the given extension is an image file extension.
     * @param {string} extension - The extension to be checked.
     * @returns {boolean} - True if the extension is an image file extension, false otherwise.
     */
    export const imageFile = (extension: string): boolean => imageExtensions.includes(extension?.toLowerCase());

    /**
     * Type-checking utility function to determine if the given value is a primitive type.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is not an object and not a function, false otherwise.
     */
    export const primitive = (value: any): boolean => value == null || (typeof value != 'object' && typeof value != 'function');

    /**
     * Type-checking utility function to determine if the given value is a RegExp.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is RegExp, false otherwise.
     */
    export const regExp = (value: any): value is RegExp => value instanceof RegExp;

    /**
     * Type-checking utility function to determine if the given value is an empty value.
     * @param {any} value - The value to be checked.
     * @returns {boolean} - True if the value is empty, false otherwise.
     */
    export function empty(value: any): boolean {
        if (value == null)
            return true;
        if (boolean(value))
            return false;
        if (array(value) || string(value) || typedArray(value) || argumentsArray(value))
            return !value.length;
        if (map(value) || set(value))
            return !value.size;
        if (object(value))
            return !Object.keys(value).length;
        return true;
    }

    /**
     * Type-checking utility function to determine if two values are equal.
     * @param {any} first - The first value to compare.
     * @param {any} second - The second value to compare.
     * @returns {boolean} - True if the values are equal, false otherwise.
     */
    export function equal(first: any, second: any): boolean {
        if (first == null && second == null || first === second)
            return true;

        if (getType(first) != getType(second))
            return false;

        if (date(first) && date(second))
            return first.valueOf() === second.valueOf();

        if (object(first) && object(second)) {
            const keys1 = Object.keys(first);
            if (keys1.length !== Object.keys(second).length)
                return false;
            return keys1.every(k => equal(first[k], second[k]));
        }

        if (array(first) && array(second)) {
            if (first.length !== second.length)
                return false;
            const counts = new Map();
            const updateMap = (reqKey: any, addition: 1 | -1) => {
                if (object(reqKey) || array(reqKey) || date(reqKey)) {
                    for (let selfKey of counts.keys())
                        if (equal(selfKey, reqKey)) {
                            reqKey = selfKey;
                            break;
                        }
                }
                counts.set(reqKey, (counts.get(reqKey) ?? 0) + addition);
            }
            first.forEach((v: any) => updateMap(v, 1));
            second.forEach((v: any) => updateMap(v, -1));
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
    export function is(Ctor: Constructor, value: any): boolean {
        return value instanceof Ctor || value != null &&
            (value.constructor === Ctor || (Ctor.name === 'Object' && typeof value === 'object'));
    }

    /**
     * Adds utility functions as prototype extensions to the object.
     * Used to enable Object.prototype methods for convenience.
     */
    export function addProtoTypeExtensions() { }
}