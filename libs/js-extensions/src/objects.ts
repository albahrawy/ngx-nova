/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { uniqueArray } from "./array";
import { isArray, isDate, isNumber, isNumberString, isObject, isPrimitive, isRegExp, isTypedArray } from "./is";
import { IGenericDictioanry, MergedObject } from "./types";



function isIndex(value: unknown): boolean {
    return isNumber(value) || isNumberString(value);
}

/**
 * Merges multiple objects together, combining their properties into a single object.
 * If there are conflicts between properties, the latter object's property will overwrite the former one.
 * Arrays are merged by removing duplicates.
 *
 * @param objects Rest parameter that accepts an arbitrary number of objects to be merged.
 * @returns The merged object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeObjects<T extends any[]>(...objects: [...T]): MergedObject<T> {
    if (!objects || objects.length == 0)
        return Object.create({});

    if (objects.length == 1)
        return objects[0];

    const mergeTwo = (first: unknown, second: unknown) => {
        if (isObject(first) && isObject(second)) {
            const result: IGenericDictioanry = {};

            for (const k in first) {
                if (Object.hasOwn(first, k))
                    result[k] = Object.hasOwn(second, k) ? mergeTwo(first[k], second[k]) : first[k];
            }

            for (const k in second) {
                if (Object.hasOwn(second, k) && !(Object.hasOwn(result, k)))
                    result[k] = second[k];
            }

            return result;
        } else if (isArray(first) && isArray(second)) {
            return uniqueArray([...first, ...second]);
        } else {
            return second ?? first;
        }
    }

    const [firstObject, ...restObjects] = objects;
    let result = firstObject;

    for (const obj of restObjects)
        result = mergeTwo(result, obj);

    return result;
}

/**
 * Extracts a subset of properties from an object based on the provided keys and optional filter function.
 *
 * @param source The source object from which to extract the subset.
 * @param keys (Optional) An array of keys to extract from the source object.
 * If not provided, the function returns a shallow copy of the source object.
 * @param filter (Optional) A filter function that determines which properties to include in the subset.
 * Only properties for which the filter function returns `true` will be included.
 * @returns The extracted subset of the source object.
 */
export function subsetObject<T extends object>(source: T): T;
export function subsetObject<T extends object, K extends keyof T>(source: T, keys: K[]): Pick<T, K>;
export function subsetObject<T extends object, K extends keyof T>(source: T, keys: K[], filter?: (k: K, v: T[K]) => boolean): Partial<Pick<T, K>>;
export function subsetObject<T extends object, K extends keyof T>(source: T, keys?: K[], filter?: (k: K, v: T[K]) => boolean): unknown {
    //static subset<T extends { [key: string]: any }, U extends string[]>(source: T, keys: U, filter?: (key: string, value: any) => boolean): Extract<T, keyof U> | T {
    if (!keys?.length || !source)
        return { ...source };
    const result = {} as Record<K, unknown>;
    for (const key of keys) {
        if (!filter || filter(key, source[key]))
            result[key] = source[key];
    }
    return result;
}

/**
 * Merges a subset of properties from one object into another object, optionally only if the target object does not already have the properties.
 *
 * @param target The target object to merge the subset into.
 * @param source The source object from which to extract the subset.
 * @param keys An array of keys to extract from the source object and merge into the target object.
 * @param onlyNoneExist (Optional) If `true`, only merge properties if they do not already exist in the target object.
 * @returns The merged target object.
 */
export function mergePartial<S extends object, T extends object, K extends keyof S>(target: T, source: S, keys: K[], onlyNoneExist?: boolean): T | MergedObject<[T, Partial<Pick<S, K>>]> {
    if (!keys?.length || !source)
        return target;
    let filter = undefined;
    if (onlyNoneExist) {
        filter = (k: K) => !(k in target);
    }
    return mergeObjects(target, subsetObject(source, keys, filter));
}

/**
 * Creates a deep copy of the input value.
 * The function handles primitive types, arrays, objects, dates, typed arrays, and regular expressions.
 *
 * @param value The value to copy.
 * @returns A deep copy of the input value.
 */
export function copyObject<T>(value: T): T {
    if (isPrimitive(value))
        return value;
    let copiedValue: unknown;
    if (isArray(value)) {
        copiedValue = value.map((item) => copyObject(item));
    } else if (isDate(value))
        copiedValue = new Date(value.valueOf()) as T;
    else if (isTypedArray(value))
        copiedValue = value.slice();
    else if (isRegExp(value))
        copiedValue = new RegExp(value);
    else {
        // For objects
        const target = Object.create(Object.getPrototypeOf(value));
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                target[key] = copyObject(value[key]);
            }
        }
        copiedValue = target;
    }

    return copiedValue as T;
}

/**
 * Retrieves a value from an object based on the provided path (string or array of keys).
 * If the path does not exist in the object, it returns the specified default value.
 *
 * @param obj The object from which to retrieve the value.
 * @param path The path to the desired value, represented as a dot-separated string or an array of keys.
 * @param defaultValue (Optional) The default value to return if the path does not exist in the object.
 * @returns The value at the specified path or the default value if the path does not exist.
 */
export function getValue<T>(obj: unknown, path: string | string[], defaultValue?: T): T;
export function getValue(obj: unknown, path: string | string[], defaultValue?: unknown): unknown {
    const adjPath = typeof (path) === 'string' ? path.split('.') : isArray(path) ? path : undefined;
    if (!adjPath)
        return defaultValue;
    if (adjPath.length == 1)
        return (obj as IGenericDictioanry)[adjPath[0]];
    return adjPath.reduce((current, key) =>
        current != null ? current[key] : undefined, obj as IGenericDictioanry) ?? defaultValue;
}

/**
 * Sets a value in an object based on the provided path (string or array of keys).
 * If the path does not exist in the object and `createIfNotExist` is `true`,
 * it creates the necessary nested objects/arrays.
 *
 * @param obj The object in which to set the value.
 * @param path The path to the property, represented as a dot-separated string or an array of keys.
 * @param value The value to set at the specified path.
 * @param createIfNotExist (Optional) If `true`, creates the necessary nested objects/arrays if the path does not exist in the object.
 * @returns The modified object.
 */
export function setValue<T>(obj: T, path: string | string[], value: unknown, createIfNotExist = false): T {
    if (isPrimitive(obj))
        return obj;
    const objReord = obj as IGenericDictioanry;
    const pathSegments = typeof path === 'string' ? path.split('.') : isArray(path) ? path : [];
    const lastIndex = pathSegments.length - 1;
    pathSegments.reduce((sub, key, index) => {
        if (createIfNotExist && sub[key] === undefined) {
            sub[key] = isIndex(pathSegments[index + 1]) ? [] : {};
        }
        return sub[key];
    }, objReord);

    objReord[pathSegments[lastIndex]] = value;

    return obj;
}