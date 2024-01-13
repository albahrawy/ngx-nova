import { CdkColumnDef } from '@angular/cdk/table';
import { Directive, Input, OnDestroy, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { CdkTableDataSourceDirective, TableColumnDataDef, DefaultColumnDataDef, IColumnDataDef } from '@ngx-nova/table-extensions/data';
import { CdkTableEditableRegistry } from './table.editable.directive';
import { ITableEditorCell, ITableEditorContext } from './types';
import { NOVA_LOCALIZER, NovaDefaultLocalizer } from '@ngx-nova/cdk/localization';
import { Nullable } from '@ngx-nova/js-extensions';


@Directive({
    host: {
        'class': 'table-editable-cell',
        '[class.table-cell--editing]': 'isEditing()'
    }
})
export abstract class TableEditableCellBase<TData, TValue = unknown> implements ITableEditorCell, OnInit, OnDestroy {

    private readonly _cdkColumnDef = inject(CdkColumnDef);
    protected localizer = inject(NOVA_LOCALIZER, { optional: true }) ?? inject(NovaDefaultLocalizer);
    protected readonly editableRegistry = inject(CdkTableEditableRegistry, { optional: true });
    private readonly _dataSourceDirective = inject(CdkTableDataSourceDirective);
    private readonly _columnDataDef: IColumnDataDef<TData, TValue>
        = inject(TableColumnDataDef, { optional: true }) ?? new DefaultColumnDataDef(this._cdkColumnDef);

    protected _data: WritableSignal<TData | null> = signal(null);

    isEditing = signal(false);

    editorContext: ITableEditorContext<TData, TValue> | null = null;

    _value = computed(() => {
        this._dataSourceDirective.dataNotifier();
        const data = this._data();
        return data ? this._columnDataDef.cellValueAccessor().getValue(data) : null;
    });

    formattedValue = computed(() => {
        return this._columnDataDef.cellValueAccessor().formatValue(this._value(), this.localizer.currentLang());
    });

    @Input()
    get data(): TData | null { return this._data(); }
    set data(value: TData | null) { this._data.set(value); }

    protected abstract focusInput(): void;
    protected abstract focusCell(): void;

    get editWithEnter() { return this.editableRegistry?.editWithEnter; }
    get editWithF2() { return this.editableRegistry?.editWithF2; }

    ngOnInit(): void {
        this._restoreEditoState();
    }

    requestEdit() {
        if (!this.isEditing() && this.canEdit()) {
            this.setEditorContext(this.editorContext ?? { data: this.data, columnKey: this._columnDataDef.dataKey, value: this._value(), editor: this });
            this._showEditor();
            this.editableRegistry?.registerEditor(this.editorContext!);
        }
    }

    commitPending() {
        this.isEditing.set(false);
        if (this.editorContext) {
            this.commitCore(this.editorContext.value);
            this.setEditorContext(null);
        }
    }

    commit(keepFocus?: boolean) {
        this.editableRegistry?.unregisterEditor(true);
        if (keepFocus)
            this.focusCell();
    }

    undo() {
        this.isEditing.set(false);
        this.setEditorContext(null);
        this.editableRegistry?.unregisterEditor(false);
        this.focusCell();
    }

    ngOnDestroy(): void {
        if (this.isEditing() && this.editableRegistry?.commitOnDestroy)
            setTimeout(() => this.commit());
    }
    //TODO: emit when cell value Edited
    protected commitCore(value: Nullable<TValue>) {
        const oldValue = this._value();
        if (this.data && value != oldValue) {
            this._columnDataDef.cellValueAccessor().setValue(this.data, value);
            this._dataSourceDirective?.notifyChanged();
        }
    }

    protected canEdit(): boolean {
        let isEditable = this.editableRegistry?.editable && !this._columnDataDef.readOnly;
        if (isEditable && this.editableRegistry?.editablePredicate)
            isEditable = this.editableRegistry.editablePredicate(this._cdkColumnDef.name, this.data);
        return !!isEditable;
    }

    protected setEditorContext(editorContext: ITableEditorContext<TData, TValue> | null) {
        this.editorContext = editorContext;
    }

    protected isNotOwnEditor() {
        const editor = this.editableRegistry?.getCurrentEditorContext()?.editor;
        return !!editor && editor !== this
    }

    private _showEditor() {
        this.isEditing.set(true);
        setTimeout(() => this.isEditing() && this.focusInput());
    }

    private _restoreEditoState(): void {
        if (this.canEdit()) {
            const editorContextToRestore = this.editableRegistry?.getAttachedEditorContext(this._columnDataDef.dataKey, this.data) ?? null;
            this.setEditorContext(editorContextToRestore);
            if (this.editorContext) {
                this.editorContext.editor = this;
                this._showEditor();
            }
        }
    }
}
