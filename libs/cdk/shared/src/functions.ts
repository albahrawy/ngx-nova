import { ComponentRef } from "@angular/core";
import { IDictioanry, isNumber, isNumberString, isString } from "@ngx-nova/js-extensions";

export const sizeBreakpoints: IDictioanry<number> = { xs: 375, sm: 810, md: 1024, lg: 1440, xl: 2560, sl: 5000 };

export function addStyleSheet(id: string, cssContent: string): HTMLStyleElementScope | undefined {
    if (!document?.head)
        return;
    const styleElement: HTMLStyleElement = document.createElement('style');
    styleElement.id = id;
    styleElement.innerHTML = cssContent;
    document.head.appendChild(styleElement);
    return { styleElement, remove: () => document.head.removeChild(styleElement) };
}

export interface HTMLStyleElementScope {
    styleElement: HTMLStyleElement;
    remove: () => void;
}

export function getProperCssValue(value?: string | number) {
    if (isNumber(value) || isNumberString(value))
        return value + '%';
    else if (isString(value))
        return value;
    return null;
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

export function preventEvent(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
}

export function updateComponentAttribute<C, K extends string & keyof C>(component: ComponentRef<C> | undefined | null, key: K, value: C[K]) {
    if (component?.instance != null)
        component.setInput(key, value);
}