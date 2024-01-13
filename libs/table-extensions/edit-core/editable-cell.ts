import { _getFocusedElementPierceShadowDom } from "@angular/cdk/platform";
import { CdkPortalOutletAttachedRef, ComponentPortal, PortalModule } from "@angular/cdk/portal";
import { Component, ComponentRef, ElementRef, Input, OnInit, Renderer2, Type, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RowDataDirective } from '@ngx-nova/table-extensions/data';
import { debounceTime, filter, fromEvent, merge } from "rxjs";
import { TableEditableCellBase } from "./editable-cell-base.component";
import { isHandledComponent, isTableEditorElement } from "./functions";
import { EditorType, ITableEditorContext, ITableEditorElement, TABLE_EDITOR_COMPONENT_FACTORY } from "./types";

@Component({
    selector: 'mat-cell[editor],cdk-cell[editor]',
    template: `
    @if(_handledView && editorPortal){
        <ng-template [cdkPortalOutlet]="editorPortal" (attached)="onAttached($event)"></ng-template>
    }@else if(isEditing() && editorPortal && editorContext){
        <ng-template [cdkPortalOutlet]="editorPortal" (attached)="onAttached($event)"></ng-template>    
    }@else {
        {{formattedValue()}}
    }
    `,
    host: {
        '(keydown)': '_handelKeydown($event)'
    },
    hostDirectives: [RowDataDirective],
    standalone: true,
    imports: [PortalModule]
})
export class CdkTableEditableCell<TData, TValue, TOptions> extends TableEditableCellBase<TData, TValue> implements OnInit {

    private readonly _rowdataDirective = inject(RowDataDirective, { self: true });
    private readonly _componentFactory = inject(TABLE_EDITOR_COMPONENT_FACTORY, { optional: true });
    private readonly _elementRef: ElementRef<HTMLElement> = inject(ElementRef);
    private readonly _renderer = inject(Renderer2);
    private readonly _focusOutStream = merge(fromEvent(this._elementRef.nativeElement, 'mousedown')
        , fromEvent(this._elementRef.nativeElement, 'focusin'))
        .pipe(takeUntilDestroyed(), debounceTime(1), filter(() => !this.isEditing() && this.isNotOwnEditor()));

    private _editorType: EditorType = null;
    private _options: TOptions | null = null;
    private _editorInstance: ITableEditorElement<TData, TValue, TOptions> | null = null;

    protected editorPortal: ComponentPortal<unknown> | null = null;
    protected _handledView: boolean = false;

    @Input()
    get options(): TOptions { return (this._options || {}) as TOptions; }
    set options(value: TOptions) {
        this._options = value;
        this._editorInstance?.setOptions(this.options);
    }

    @Input()
    get editor(): EditorType { return this._editorType; }
    set editor(value: EditorType) {
        this._editorType = value;
        const editor = typeof value === 'string' ? this._componentFactory?.getComponent(value) : value;
        let editorComponent;
        if (editor instanceof Type) {
            editorComponent = editor;
        } else if (isHandledComponent(editor)) {
            editorComponent = editor.component;
            this._handledView = !!editor.handledView;
        }
        if (editorComponent)
            this.editorPortal = new ComponentPortal(editorComponent);
        else
            this.editorPortal = null;
    }

    onAttached(ref: CdkPortalOutletAttachedRef) {
        if (ref instanceof ComponentRef)
            this.assignElementConfig(ref.instance);
    }

    _handelKeydown(event: KeyboardEvent) {
        if (event.target !== this._elementRef.nativeElement)
            return;
        switch (event.code) {
            case 'Enter':
                if (this.editWithEnter)
                    this.requestEdit();
                break;
            case 'F2':
                if (this.editWithF2)
                    this.requestEdit();
                break;
        }
    }

    private assignElementConfig(instance: object) {
        if (!isTableEditorElement(instance)) {
            this.editorPortal = null;
            throw new Error(`${instance?.constructor?.name} did not implement ITableEditorElement correctly`);
        }
        if (this._handledView)
            instance.registerCommitHandeled(value => this.commitCore(value));
        else
            instance.registerCommit((keepFocus) => this.commit(keepFocus));
        instance.registerUndo(() => this.undo());
        instance.registerCanEdit(() => this.canEdit());
        this._editorInstance = instance;
        this._editorInstance.setEditorContext(this.editorContext);
        this._editorInstance.setOptions(this.options);
        this._editorInstance.value = this._value;
        this._editorInstance.data = this._data;
    }

    protected override focusInput(): void {
        this._editorInstance?.focusInput();
    }

    protected override focusCell(): void {
        this._elementRef.nativeElement.focus();
    }

    protected override setEditorContext(editorContext: ITableEditorContext<TData, TValue> | null): void {
        super.setEditorContext(editorContext);
        this._editorInstance?.setEditorContext(editorContext);
    }

    override ngOnInit() {
        super.data = this._rowdataDirective.data;
        super.ngOnInit();
        this._renderer.listen(this._elementRef.nativeElement, 'dblclick', () => this.requestEdit());
        this._focusOutStream.subscribe(() => this.editableRegistry?.unregisterEditor(true));
    }

    protected _containsFocus() {
        const activeElement = _getFocusedElementPierceShadowDom();
        return activeElement && this._elementRef.nativeElement.contains(activeElement);
    }

}