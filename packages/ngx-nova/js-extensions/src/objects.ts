import { arrays } from "./array";
import { is } from "./is";
import { MergedObject } from "./types";

export namespace objects {

    function isIndex(value: any): boolean {
        return is.number(value) || is.numberString(value);
    }

    /**
     * Merges multiple objects together, combining their properties into a single object.
     * If there are conflicts between properties, the latter object's property will overwrite the former one.
     * Arrays are merged by removing duplicates.
     *
     * @param objects Rest parameter that accepts an arbitrary number of objects to be merged.
     * @returns The merged object.
     */
    export function merge<T extends any[]>(...objects: [...T]): MergedObject<T> {
        if (!objects || objects.length == 0)
            return Object.create({});

        if (objects.length == 1)
            return objects[0];

        const mergeTwo = (first: any, second: any) => {
            if (is.object(first) && is.object(second)) {
                const result: any = {};

                for (const k in first) {
                    if (Object.hasOwn(first, k))
                        result[k] = Object.hasOwn(second, k) ? mergeTwo(first[k], second[k]) : first[k];
                }

                for (const k in second) {
                    if (Object.hasOwn(second, k) && !(Object.hasOwn(result, k)))
                        result[k] = second[k];
                }

                return result;
            } else if (is.array(first) && is.array(second)) {
                return arrays.unique([...first, ...second]);
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
    export function subset<T extends object, K extends keyof T>(source: T): T;
    export function subset<T extends object, K extends keyof T>(source: T, keys: K[]): Pick<T, K>;
    export function subset<T extends object, K extends keyof T>(source: T, keys: K[], filter?: (k: K, v: T[K]) => boolean): Partial<Pick<T, K>>;
    export function subset<T extends object, K extends keyof T>(source: T, keys?: K[], filter?: (k: K, v: T[K]) => boolean): any {
        //static subset<T extends { [key: string]: any }, U extends string[]>(source: T, keys: U, filter?: (key: string, value: any) => boolean): Extract<T, keyof U> | T {
        if (!keys?.length || !source)
            return { ...source };
        const result = {} as any;
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
    export function mergeSubset<S extends object, T extends object, K extends keyof S>(target: T, source: S, keys: K[], onlyNoneExist?: boolean): T | MergedObject<[T, Partial<Pick<S, K>>]> {
        if (!keys?.length || !source)
            return target;
        let filter = undefined;
        if (onlyNoneExist) {
            filter = (k: K, v: S[K]) => !(k in target);
        }
        return merge(target, subset(source, keys, filter));
    }

    /**
     * Creates a deep copy of the input value.
     * The function handles primitive types, arrays, objects, dates, typed arrays, and regular expressions.
     *
     * @param value The value to copy.
     * @returns A deep copy of the input value.
     */
    export function copy<T>(value: T): T {
        if (is.primitive(value))
            return value;
        let copiedValue: any;
        if (is.array(value)) {
            copiedValue = value.map((item) => copy(item));
        } else if (is.date(value))
            copiedValue = new Date(value.valueOf()) as T;
        else if (is.typedArray(value))
            copiedValue = copiedValue.slice();
        else if (is.regExp(value))
            copiedValue = new RegExp(copiedValue);
        else {
            // For objects
            copiedValue = Object.create(Object.getPrototypeOf(value));
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    (copiedValue as any)[key] = copy(value[key]);
                }
            }
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
    export function get<T>(obj: any, path: string | string[], defaultValue?: T): T;
    export function get(obj: any, path: string | string[], defaultValue?: any): any {
        const adjPath = typeof (path) === 'string' ? path.split('.') : is.array(path) ? path : undefined;
        if (!adjPath) return defaultValue;
        if (adjPath.length == 1)
            return obj[adjPath[0]];
        return adjPath.reduce((current, key) =>
            (current !== undefined && current !== null) ? current[key] : undefined, obj) ?? defaultValue;
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
    export function set<T>(obj: T, path: string | string[], value: any, createIfNotExist = false): T {
        if (is.primitive(obj))
            return obj;
        const objReord = obj as Record<any, any>;
        const pathSegments = typeof path === 'string' ? path.split('.') : is.array(path) ? path : [];
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

    /**
     * Adds utility functions as prototype extensions to the object.
     * Used to enable Object.prototype methods for convenience.
     */
    export function addProtoTypeExtensions() {
    }
}