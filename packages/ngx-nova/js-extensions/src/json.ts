import { is } from "./is";
import { IGenericDictioanry, IStringDictioanry } from "./types";

export namespace json {
    /**
     * Converts a JavaScript value to a JavaScript Object Notation (JSON) string and return empty string when error occured. 
     * @param value A JavaScript value, usually an object or array, to be converted.
     * @param replacer A function that transforms the results.
     * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
     * @returns valid JSON string or empty string.
     */
    export function stringifySafe(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number) {
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
    export function parseSafe(input: string | Object, reviver?: (this: any, key: string, value: any) => any) {
        try {
            if (is.object(input))
                return input;
            else if (is.string(input))
                return JSON.parse(input, reviver);
        } catch { }
        return null;
    };
    /**
     * Transform a JavaScript Object Notation (JSON) object which has nested properties into flat JSON object.
     * @param source A JavaScript nested object to be flatten.
     * @param connector the character used to connect nested keys. default value is '-'
     * @returns object contains one level with all nested properties.
     */
    export function flatten(source: IGenericDictioanry, connector = '_') {
        const target: any = {};
        function _flatObject(srcObj: any, key: string): void {
            forEach(srcObj, (k, v) => {
                const newKey = key ? `${key}${connector}${k}` : k;
                if (is.object(v))
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
    export function forEach(source: { [key: string]: any }, callback: (key: string, value: any) => void,
        filter?: (key: string, value: any) => boolean) {
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
    export function map(source: IGenericDictioanry, callback: (value: any, key: string) => any, ignoreNull: boolean = false) {
        return Object.keys(source).reduce((ob, k) => {
            const v = source[k];
            const res = callback(v, k);
            if (res != null || !ignoreNull)
                ob[k] = res;
            return ob;
        }, {} as any);
    };

    /**
     * Converts a JavaScript value to a an XML string. 
     * @param obj A JavaScript value, usually an object to be converted.
     * @param rootKey XML root node name. default is 'Data' 
     * @param placeInNode true to create sub node for each property. otherwise create an attribute. default is false.
     * @returns valid XML string.
     */

    export function toXml(obj: IGenericDictioanry, rootKey = 'Data', placeInNode = false): string {
        const doc = document.implementation.createDocument('', '', null);
        return createXmlElement(doc.createElement(rootKey), obj, placeInNode).outerHTML;
    }

    function addAttribute(element: Element, key: string, value: string): void {
        element.setAttribute(key, value);
    };

    function addTextNode(element: Element, key: string, value: string): void {
        element.appendChild(element.ownerDocument.createElement(key)).textContent = value;
    };

    function createXmlElement(node: HTMLElement, obj: IStringDictioanry, isNode: boolean): HTMLElement {
        for (const [key, value] of Object.entries(obj))
            addXmlValue(node, key, value, isNode);
        return node;
    }

    function addXmlValue(element: HTMLElement, key: string, value: any, subNode: boolean): void {
        if (!value)
            return;
        const addFucntion = subNode ? addTextNode : addAttribute;
        if (is.date(value)) {
            addFucntion(element, key, value.toJSON());
        } else if (is.object(value)) {
            element.appendChild(createXmlElement(element.ownerDocument.createElement(key), value, false));
        } else if (Array.isArray(value)) {
            const arrayNode = element.appendChild(element.ownerDocument.createElement(key));
            value.forEach(i => addXmlValue(arrayNode, 'item', i, true));
        } else {
            addFucntion(element, key, value);
        }
    }
}