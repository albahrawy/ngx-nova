/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { isEmpty, isObject, isString } from "./is";
import { toStringValue } from "./to";
import { IDictionary, IGenericDictionary, Nullable } from "./types";

// export namespace json {
/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string and return empty string when error occured. 
 * @param value A JavaScript value, usually an object or array, to be converted.
 * @param replacer A function that transforms the results.
 * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
 * @returns valid JSON string or empty string.
 */
export function jsonStringify(value: unknown, replacer?: (this: unknown, key: string, value: unknown) => unknown, space?: string | number) {
    try { return JSON.stringify(value, replacer, space); } catch {
        return '';
    }
};

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 * @param input A valid JSON string or JSON object or an array
 * @param reviver A function that transforms the results. This function is called for each member of the object.
 * If a member contains nested objects, the nested objects are transformed before the parent object is.
 * @returns input object or array or parsed object from JSON string if value. otherwise null.
 */
export function jsonParse(input: string | object, reviver?: (this: unknown, key: string, value: unknown) => unknown) {
    try {
        if (isObject(input))
            return input;
        else if (isString(input))
            return JSON.parse(input, reviver);
    } catch { /* empty */ }
    return null;
};
/**
 * Transform a JavaScript Object Notation (JSON) object which has nested properties into flat JSON object.
 * @param source A JavaScript nested object to be flatten.
 * @param connector the character used to connect nested keys. default value is '-'
 * @returns object contains one level with all nested properties.
 */
export function jsonFlatten(source: IGenericDictionary, connector = '_') {
    const target: IGenericDictionary = {};
    function _flatObject(srcObj: IGenericDictionary, key: string): void {
        jsonForEach(srcObj, (k, v) => {
            const newKey = key ? `${key}${connector}${k}` : k;
            if (isObject(v))
                _flatObject(v, newKey);
            else
                target[newKey] = v;
        });
    }

    _flatObject(source, '');
    return target;
};
/**
 * An iterative method. It calls a provided callback function once for each property in a JSON object.
 * @param source A JavaScript value, usually an object.
 * @param callback A function to execute for each proeprty in the object. The function is called with the arguments:key and value.
 * @param filter A function to execute if exists for each proeprty in the object before executing a callback function and executes callback only if it returns true.
 */
export function jsonForEach(source: { [key: string]: unknown }, callback: (key: string, value: unknown) => void,
    filter?: (key: string, value: unknown) => boolean) {
    if (!source || Object.keys(source).length === 0 || !callback)
        return;

    if (typeof filter === 'function') {
        for (const key in source) {
            if (filter(key, source[key]) === true)
                callback(key, source[key]);
        }
    } else {
        for (const key in source)
            callback(key, source[key]);
    }
};

/**
 * An iterative method. It calls a provided callback function once for each property in an object and constructs a new object from the results.
 * @param source A JavaScript value, usually an object.
 * @param callback A function to execute for each property in the object. Its return value is added as a value for the key in the new object.
 * The function is called with the following arguments value and key.
 * @param ignoreNull true to eliminate keys with null or undefined value from the new object. default is false.
 * @returns A new object with each property with key and value being the result of the callback function.
 */
export function jsonMap<T>(source: IDictionary<T>, callback: (value: T, key: string) => unknown, ignoreNull: boolean = false) {
    return Object.keys(source).reduce((ob, k) => {
        const v = source[k];
        const res = callback(v, k);
        if (res != null || !ignoreNull)
            ob[k] = res;
        return ob;
    }, {} as IGenericDictionary);
};


/**
 * An iterative method. It calls a provided callback function once for each property in an object and constructs a new Array from the results.
 * @param source A JavaScript value, usually an object.
 * @param callback A function to execute for each property in the object. Its return value is added as an item in the new Array.
 * The function is called with the following arguments value and key.
 * @param ignoreNull true to eliminate keys with null or undefined value from the new array. default is false.
 * @returns A new Array contains each property value being the result of the callback function.
 */
export function jsonToArray<T, O>(source: IDictionary<T>, callback: (value: T, key: string) => O, ignoreNull: boolean = false) {
    return Object.keys(source).reduce((ob, k) => {
        const v = source[k];
        const res = callback(v, k);
        if (res != null || !ignoreNull)
            ob.push(res);
        return ob;
    }, [] as O[]);
};

/**
 * Convert JSON object to array of key-value pair.
 * @param source A JavaScript value, usually an object.
 * @param ignoreNull true to eliminate keys with null or undefined value from the returned result. default is true.
 * @returns Array of key-value pair from Object key and value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonToKeyValueArray<TValue>(source: Nullable<IDictionary<TValue>>, ignoreNull: boolean = true): ({ key: string; value: TValue; })[] {
    if (!source || isEmpty(source))
        return [];
    const result: ({ key: string; value: TValue; })[] = [];
    Object.keys(source).forEach(key => {
        const value = source[key];
        if (value != null || !ignoreNull)
            result.push({ key, value });
    });
    return result;
};

/**
 * Converts a JavaScript value to a an XML string. 
 * @param obj A JavaScript value, usually an object to be converted.
 * @param rootKey XML root node name. default is 'Data' 
 * @param placeInNode true to create sub node for each property. otherwise create an attribute. default is false.
 * @returns valid XML string.
 */

export function jsonToXml(obj: IGenericDictionary, rootKey = 'Data', placeInNode = false): string {
    const doc = document.implementation.createDocument('', '', null);
    return createXmlElement(doc.createElement(rootKey), obj, placeInNode).outerHTML;
}

function addAttribute(element: Element, key: string, value: string): void {
    element.setAttribute(key, value);
};

function addTextNode(element: Element, key: string, value: string): void {
    element.appendChild(element.ownerDocument.createElement(key)).textContent = value;
};

function createXmlElement(node: HTMLElement, obj: IGenericDictionary, isNode: boolean): HTMLElement {
    for (const [key, value] of Object.entries(obj))
        addXmlValue(node, key, value, isNode);
    return node;
}

function addXmlValue(element: HTMLElement, key: string, value: unknown, subNode: boolean): void {
    if (!value)
        return;
    const addFucntion = subNode ? addTextNode : addAttribute;
    if (isObject(value)) {
        element.appendChild(createXmlElement(element.ownerDocument.createElement(key), value, false));
    } else if (Array.isArray(value)) {
        const arrayNode = element.appendChild(element.ownerDocument.createElement(key));
        value.forEach(i => addXmlValue(arrayNode, 'item', i, true));
    } else {
        addFucntion(element, key, toStringValue(value));
    }
}