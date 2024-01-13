import { Directive, Input, booleanAttribute } from '@angular/core';
import { ITableEditorContext } from './types';

@Directive({
    selector: 'mat-table[editable],cdk-table[editable]',
    standalone: true,
})
export class CdkTableEditableRegistry<TData>  {

    private _currentEditorContext: ITableEditorContext<TData> | null = null;

    @Input({ transform: booleanAttribute }) editable: boolean = false;
    @Input({ transform: booleanAttribute }) commitOnDestroy: boolean = false;
    @Input({ transform: booleanAttribute }) editWithF2: boolean = true;
    @Input({ transform: booleanAttribute }) editWithEnter: boolean = true;
    @Input() editablePredicate: ((columnName: string, data: TData | null) => boolean) | undefined | null;

    registerEditor(editor: ITableEditorContext<TData>) {
        this.unregisterEditor(true);
        this._currentEditorContext = editor;
    }

    unregisterEditor(commit: boolean) {
        if (this._currentEditorContext && commit) {
            this._currentEditorContext.editor?.commitPending();
        }
        this._currentEditorContext = null;
    }

    getCurrentEditorContext() {
        return this._currentEditorContext;
    }

    getAttachedEditorContext(key?: string, rowData?: TData) {
        if (this._currentEditorContext) {
            const { data, columnKey } = this._currentEditorContext;
            if (columnKey && rowData && columnKey === key && rowData === data)
                return this._currentEditorContext;
        }
        return null;
    }
}