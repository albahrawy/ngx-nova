import { ComponentRef } from "@angular/core";
import { IDictionary, isNumber, isNumberString, isString } from "@ngx-nova/js-extensions";
import { NovaDataSource } from "./types";
import { EMPTY, Observable, isObservable, of } from "rxjs";
import { CollectionViewer, isDataSource } from "@angular/cdk/collections";

export const sizeBreakpoints: IDictionary<number> = { xs: 375, sm: 810, md: 1024, lg: 1440, xl: 2560, sl: 5000 };

export function addStyleSectionToDocument(id: string, cssContent: string): HTMLStyleElementScope | undefined {
    if (!document?.head)
        return;
    if (id && document.getElementById(id)) {
        return;
    }
    let styleElement: HTMLStyleElement | null = document.createElement('style');
    styleElement.id = id;
    styleElement.innerHTML = cssContent;
    document.head.appendChild(styleElement);
    return {
        styleElement, remove: () => {
            if (styleElement != null) {
                document.head.removeChild(styleElement);
                styleElement = null;
            }
        }
    };
}

export interface HTMLStyleElementScope {
    styleElement: HTMLStyleElement;
    remove: () => void;
}

export function getProperCssValue(value?: string | number | null) {
    if (isNumber(value) || isNumberString(value))
        return parseFloat(value!.toString()).toFixed(4) + '%';
    else if (isString(value))
        return value;
    return null;
}

export function findElementAttributeByPrefix(attributes?: NamedNodeMap, ...prefixesToSearch: string[]) {
    const result: Record<string, string> = {};
    if (!attributes)
        return result;
    const prefixSet = new Set(prefixesToSearch);
    const length = attributes.length;
    for (let i = 0; i < length; i++) {
        const item = attributes[i]?.name;
        if (!item)
            break;
        for (const prefix of prefixSet) {
            if (item.startsWith(prefix)) {
                result[prefix] = item;
                prefixSet.delete(prefix);
                break;
            }
        }

        if (prefixSet.size === 0)
            break; // We found all prefixes, no need to continue the loop.
    }
    return result;
}

export function getCssSizeBreakpoint(width?: number) {
    if (!width || width === screen.availWidth)
        return null;

    for (const breakpoint in sizeBreakpoints) {
        if (width <= sizeBreakpoints[breakpoint])
            return breakpoint;
    }
    return null;
}

export function getOuterWidth(element: HTMLElement, margin: boolean = true) {
    let width = element.offsetWidth;

    if (margin) {
        const style = getComputedStyle(element);
        width += parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    }

    return width;
}

export function getOuterHeight(element: HTMLElement, margin: boolean = false) {
    let height = element.offsetHeight;

    if (margin) {
        const style = getComputedStyle(element);
        height += parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    }

    return height;
}

export function preventEvent(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
}

export function updateComponentAttribute<C, K extends string & keyof C>(component: ComponentRef<C> | undefined | null, key: K, value: C[K]) {
    if (component?.instance != null)
        component.setInput(key, value);
}

export function convertToObservable<T>(value: NovaDataSource<T>): Observable<readonly T[]> {

    if (typeof value === 'function')
        value = value();

    if (isObservable(value))
        return value;
    else if (Array.isArray(value))
        return of(value);
    else if (isDataSource(value))
        return value.connect(null as unknown as CollectionViewer);

    return EMPTY;
}

export function focusElement(element: Element | null) {
    if (!element)
        return;
    scrollIntoViewIfNeeded(element, false);
    (element as HTMLElement).focus?.({ preventScroll: true });
}

export function scrollIntoViewIfNeeded(element: Element | null, centerIfNeeded: boolean = true) {
    if (!element)
        return;
    verifyScrollIntoViewIfNeeded();
    element.scrollIntoViewIfNeeded(centerIfNeeded);
}

declare global {
    interface Element {
        scrollIntoViewIfNeeded: (bool?: boolean) => void;
    }
}

verifyScrollIntoViewIfNeeded();
function verifyScrollIntoViewIfNeeded() {
    if (!Element.prototype.scrollIntoViewIfNeeded) {
        Element.prototype.scrollIntoViewIfNeeded = function (centerIfNeeded = true) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const el = this;
            new IntersectionObserver(([entry], self) => {
                const ratio = entry.intersectionRatio;
                if (ratio < 1) {
                    const place = ratio <= 0 && centerIfNeeded ? 'center' : 'nearest';
                    el.scrollIntoView({ block: place, inline: place });
                }
                self.disconnect();
            }).observe(this);
        };
    }
}
