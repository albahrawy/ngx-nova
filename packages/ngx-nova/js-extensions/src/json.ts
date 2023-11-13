import { is } from "./is";
import { IGenericDictioanry, IStringDictioanry } from "./types";

export namespace json {
    export function stringifySafe(v: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number) {
        try { return JSON.stringify(v, replacer, space); } catch {
            return '';
        }
    };

    export function parseSafe(t: string | Object, reviver?: (this: any, key: string, value: any) => any) {
        try {
            if (is.object(t))
                return t;
            else if (is.string(t))
                return JSON.parse(t, reviver);
        } catch { }
        return null;
    };

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

    export function map(source: IGenericDictioanry, callback: (value: any, key: string) => any, ignoreNull?: boolean) {
        return Object.keys(source).reduce((ob, k) => {
            const v = source[k];
            const res = callback(v, k);
            if (res != null || !ignoreNull)
                ob[k] = res;
            return ob;
        }, {} as any);
    };

    export function toXml(data: IGenericDictioanry, rootKey = 'Data', placeInNode = false): string {
        const doc = document.implementation.createDocument('', '', null);
        return createXmlElement(doc.createElement(rootKey), data, placeInNode).outerHTML;
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