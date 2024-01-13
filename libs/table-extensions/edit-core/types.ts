import { ComponentType } from "@angular/cdk/portal";
import { InjectionToken, Type } from "@angular/core";
import { Nullable } from "@ngx-nova/js-extensions";

export type EditorType = 'string' | 'number' | 'decimal' | 'date' | 'dropdown'
    | ComponentType<unknown> | HandledComponent | null | undefined | '' | string;
export type CellType = 'readonly' | 'editable' | 'reactive' | null | '';
export const TABLE_EDITOR_ELEMENT = new InjectionToken<ITableEditorElement<unknown>>('EDITOR_ELEMENT');
export const TABLE_EDITOR_COMPONENT_FACTORY = new InjectionToken<ITableEditorComponentFactory>('EDITOR_COMPONENT_FACTORY');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ITableEditorContext<TData, TValue = any> {
    data: Nullable<TData>;
    columnKey?: string;
    value: Nullable<TValue>;
    editor: ITableEditorCell;
}

export interface HandledComponent {
    component: ComponentType<unknown>;
    handledView?: boolean;
}

export interface ITableEditorCell {
    commitPending(): void;
    undo(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ITableEditorElement<TData = any, TValue = any, TOptions = any> = {
    value(): Nullable<TValue>;
    data(): Nullable<TData>;
    registerCommit(fn: (keepFocus?: boolean) => void): void;
    registerCommitHandeled(fn: (value?: TValue) => void): void;
    registerUndo(fn: () => void): void;
    setEditorContext(editorContext: ITableEditorContext<TData, TValue> | null): void;
    focusInput(): void;
    setOptions(options: TOptions): void;
    registerCanEdit(fn: () => boolean): void;
}

export interface ITableEditorComponentFactory {
    getComponent(type: string | null | undefined): Type<ITableEditorElement> | HandledComponent | null;
}