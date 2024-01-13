import { Directive } from '@angular/core';
import { ITableEditorElement, ITableEditorContext } from './types';

const NoOp = () => { };

@Directive({
    host: {
        'class': 'cell-editor-element',
    },
})
export abstract class TableEditorElementBase<TValue = unknown, TOptions = unknown, TData = unknown>
    implements ITableEditorElement<TData, TValue, TOptions> {

    focusInput(): void { }

    protected options: TOptions = {} as TOptions;
    protected commit: (keepFocus?: boolean) => void = NoOp;
    protected commitHandeled: (value?: TValue) => void = NoOp;
    protected undo: () => void = NoOp;
    protected canEdit = () => false;
    protected editorContext: ITableEditorContext<TData, TValue> | null = null;
    value = () => null;
    data = () => null;

    registerCommitHandeled(fn: (value?: TValue) => void): void {
        this.commitHandeled = fn;
    }

    registerCommit(fn: (keepFocus?: boolean) => void): void {
        this.commit = fn;
    }

    registerUndo(fn: () => void): void {
        this.undo = fn;
    }

    registerCanEdit(fn: () => boolean): void {
        this.canEdit = fn;
    }

    setEditorContext(editorContext: ITableEditorContext<TData, TValue> | null): void {
        this.editorContext = editorContext;
    }

    setOptions(options: TOptions): void {
        this.options = options;
    }

}