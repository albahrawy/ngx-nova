import { Type } from "@angular/core";
import { TableEditorElementBase } from "./table-editor-element.base";
import { HandledComponent, ITableEditorElement } from "./types";

export function isTableEditorElement(value: unknown): value is ITableEditorElement {
    if (!value)
        return false;
    if (value instanceof TableEditorElementBase)
        return true;
    const _value = value as ITableEditorElement<unknown>;
    return typeof _value.registerCommit === 'function'
        && typeof _value.registerUndo == 'function'
        && typeof _value.focusInput == 'function'
        && typeof _value.setOptions == 'function' && _value.setOptions.length === 1
        && typeof _value.setEditorContext == 'function' && _value.setEditorContext.length === 1;
}

export function isHandledComponent(value: unknown): value is HandledComponent {
    const _value = value as HandledComponent;
    return _value && _value.component instanceof Type;
}