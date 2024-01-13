import { BooleanInput, coerceBooleanProperty } from "@angular/cdk/coercion";
import { CdkPortal } from "@angular/cdk/portal";
import {
    Attribute, Component, ContentChild, DoCheck, ElementRef, Input, OnDestroy, OnInit, Optional, Self,
    Type, ViewChild, ViewContainerRef, booleanAttribute, inject, numberAttribute
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AbstractControl, ControlValueAccessor, FormGroupDirective, NgControl, NgForm, Validators } from "@angular/forms";
import { ErrorStateMatcher, ThemePalette } from "@angular/material/core";
import { MatFormFieldControl } from "@angular/material/form-field";
import { MAT_SELECT_TRIGGER, MatSelectTrigger } from "@angular/material/select";
import {
    CloseReson, CompositeComponentWrapper, ListBindingConfig, ListMemberGetterType, NovaDataSource,
    NovaDropdownOverlayBase, NovaOutletDirective, convertToObservable
} from "@ngx-nova/cdk/shared";
import { isArray } from "@ngx-nova/js-extensions";
import { BehaviorSubject, Subject, Subscription, switchMap } from "rxjs";
import { IDropDownList } from "./types";

@Component({
    selector: 'nova-dropdown-list-base',
    template: '',
    host: {
        'role': 'combobox',
        'aria-autocomplete': 'none',
        'aria-haspopup': 'listbox',
        'class': 'mat-mdc-select',
        '[attr.id]': 'id',
        '[attr.tabindex]': 'disabled ? -1 : tabIndex',
        '[attr.aria-controls]': 'panelOpen ? id + "-panel" : null',
        '[attr.aria-expanded]': 'panelOpen',
        '[attr.aria-label]': 'ariaLabel || null',
        '[attr.aria-required]': 'required.toString()',
        '[attr.aria-disabled]': 'disabled.toString()',
        '[attr.aria-invalid]': 'errorState',
        'ngSkipHydration': '',
        '[class.mat-mdc-select-disabled]': 'disabled',
        '[class.mat-mdc-select-invalid]': 'errorState',
        '[class.mat-mdc-select-required]': 'required',
        '[class.mat-mdc-select-empty]': 'empty',
        '[class.mat-mdc-select-multiple]': 'multiple',
        '(keydown)': '_handleKeydown($event)',
        '(focus)': 'setFocused(true)',
        '(blur)': '_onBlur()',
    },
})
export abstract class NovaDropdownListBase<TComponent extends IDropDownList<TRow, TValue>,
    TRow, TValue = unknown>
    extends NovaDropdownOverlayBase
    implements ControlValueAccessor, MatFormFieldControl<TValue | TValue[]>, OnInit, OnDestroy, DoCheck {

    protected abstract setDefaults(): Partial<TComponent>;
    protected abstract componentType: Type<TComponent>;
    protected innerList?: TComponent;
    protected _data?: readonly TRow[];
    protected suggestedHeight = 0;

    private _dataSourceSubject = new BehaviorSubject<NovaDataSource<TRow>>([]);
    private _valueSubscription?: Subscription;
    private _bindingConfig = new ListBindingConfig<TRow, TValue>();
    private _moreSingleText: string = 'other';
    private _moreText: string = 'others';
    private _initialized = false;

    constructor(@Attribute('tabindex') tabIndex: string, @Self() @Optional() public ngControl: NgControl) {
        super(tabIndex);
        if (ngControl) {
            ngControl.valueAccessor = this;
        }
        this._dataSourceSubject.pipe(switchMap(ds => convertToObservable(ds)), takeUntilDestroyed()).subscribe(d => {
            this.listWrapper.set('dataSource', d);
            this._data = d;
            this.adjustHegiht();
        });
    }

    @ContentChild(MAT_SELECT_TRIGGER) customTrigger?: MatSelectTrigger;
    @ViewChild(NovaOutletDirective) set _outletDirective(outlet: NovaOutletDirective) {
        if (outlet && outlet.viewContainerRef.length === 0) {
            this.createInnerComponent(outlet.viewContainerRef);
        }
    }

    @ViewChild(CdkPortal, { static: true, }) portalTemplate!: CdkPortal;
    @ViewChild('toggleTrigger', { static: true }) toggleTrigger!: ElementRef;

    protected listWrapper = new CompositeComponentWrapper<TComponent>(() => this.setDefaults());

    protected triggerValue: string = '';
    protected triggerValueMore: string = '';

    @Input({ transform: booleanAttribute }) allowClear = false;

    @Input()
    get value(): TValue | TValue[] | null {
        return this.listWrapper.get('value');
    }
    set value(newValue: TValue | TValue[] | null) {
        this.listWrapper.set('value', newValue);
        this.updateTriggerValue();
    }

    @Input({ transform: booleanAttribute })
    get showIndex(): boolean { return this.listWrapper.get('showIndex'); }
    set showIndex(value: boolean) { this.listWrapper.set('showIndex', value); }

    @Input()
    get iconColor(): ThemePalette { return this.listWrapper.get('iconColor'); }
    set iconColor(value: ThemePalette) { this.listWrapper.set('iconColor', value); }

    @Input()
    get color(): ThemePalette { return this.listWrapper.get('color'); }
    set color(value: ThemePalette) { this.listWrapper.set('color', value); }

    @Input({ transform: numberAttribute })
    get optionHeight(): number { return this.listWrapper.get('optionHeight'); }
    set optionHeight(value: number) {
        this.listWrapper.set('optionHeight', value);
        this.adjustHegiht();
    }

    @Input({ transform: booleanAttribute })
    get multiple(): boolean { return this.listWrapper.get('multiple'); }
    set multiple(newValue: boolean) {
        if (newValue !== this.multiple) {
            let oldSelected = this.value;
            this.listWrapper.set('multiple', newValue);
            if (this._initialized) {
                if (!newValue && Array.isArray(oldSelected) && oldSelected?.length > 1)
                    oldSelected = [oldSelected[0]];
                if (oldSelected != this.value)
                    this.value = oldSelected;
            }
        }
    }

    @Input()
    get displayMember(): ListMemberGetterType<TRow> { return this.listWrapper.get('displayMember'); }
    set displayMember(value: ListMemberGetterType<TRow>) {
        this.listWrapper.set('displayMember', value);
        this._bindingConfig.displayMember = value;
    }

    @Input()
    get valueMember(): ListMemberGetterType<TRow, TValue> { return this.listWrapper.get('valueMember'); }
    set valueMember(value: ListMemberGetterType<TRow, TValue>) {
        this.listWrapper.set('valueMember', value);
        this._bindingConfig.valueMember = value;
    }

    @Input()
    get disableMember(): ListMemberGetterType<TRow, boolean> { return this.listWrapper.get('disableMember'); }
    set disableMember(value: ListMemberGetterType<TRow, boolean>) { this.listWrapper.set('disableMember', value); }

    @Input()
    get iconMember(): ListMemberGetterType<TRow> { return this.listWrapper.get('iconMember'); }
    set iconMember(value: ListMemberGetterType<TRow>) { this.listWrapper.set('iconMember', value); }

    @Input({ transform: booleanAttribute })
    get disabled(): boolean { return this.listWrapper.get('disabled'); }
    set disabled(value: boolean) {
        this.listWrapper.set('disabled', value);
        this._changeDetectorRef.markForCheck();
        this.stateChanges.next();
    }

    @Input()
    get dataSource(): NovaDataSource<TRow> { return this.listWrapper.get('dataSource'); }
    set dataSource(value: NovaDataSource<TRow>) { this._dataSourceSubject.next(value); }

    @Input() overlayPanelClass: string | string[] = '';

    @Input()
    get moreSingleText(): string { return this._moreSingleText; }
    set moreSingleText(value: string) {
        if (this._moreSingleText !== value) {
            this._moreSingleText = value;
            this.updateTriggerValue();
        }
    }

    @Input()
    get moreText(): string { return this._moreText; }
    set moreText(value: string) {
        if (this._moreText !== value) {
            this._moreText = value;
            this.updateTriggerValue();
        }
    }

    ngOnInit(): void {
        this.stateChanges.next();
        this._initialized = true;
    }

    protected createInnerComponent(viewContainerRef: ViewContainerRef): void {
        const innerListRef = viewContainerRef.createComponent(this.componentType);
        this.innerList = innerListRef.instance;
        this.listWrapper.attach(innerListRef);
        this._valueSubscription = innerListRef.instance.selectionChange.subscribe(v => {
            this.listWrapper.set('value', v.value, false);
            this.updateTriggerValue();
            this._onChange(this.value);
            if (!this.multiple) {
                this.focus();
                this.close('Value');
            }
        });
    }

    protected clear(event: Event) {
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.value = null;
    }

    protected adjustHegiht() {
        this.suggestedHeight = (this._data?.length ?? 0) * this.optionHeight;
    }

    protected updateTriggerValue() {
        if (this.customTrigger)
            return;
        if (!this.value) {
            this.triggerValue = '';
            return;
        }
        const value: TValue[] = isArray(this.value) ? this.value : [this.value];
        const titles = this._bindingConfig.getSelectedTitles(this._data, value);
        if (!titles) {
            this.triggerValue = '';
            this.triggerValueMore = '';
            return;
        }
        this.triggerValue = titles.at(0) ?? '';
        if (titles.length === 2) {
            this.triggerValueMore = ` (+ ${titles.length - 1} ${this.moreSingleText})`;
        } else if (titles.length > 2) {
            this.triggerValueMore = ` (+ ${titles.length - 1} ${this.moreText})`;
        } else {
            this.triggerValueMore = '';
        }
    }

    getSelectedData(): TRow[] {
        if (!this.value || !this._data)
            return [];
        const value: TValue[] = isArray(this.value) ? this.value : [this.value];
        return this._bindingConfig.getSelectedItems(this._data, value) ?? [];
    }

    protected override _canOpen(): boolean {
        return super._canOpen() && !!this._data?.length;
    }

    //#region valueAccessor

    private touched = false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _onChange = (_: unknown) => { };
    private _onTouched = () => { };

    _onBlur() {
        if (!this.disabled && !this.panelOpen) {
            if (!this.touched) {
                this.touched = true;
                this._onTouched();
            }
        }
        this.setFocused(false);
    }

    writeValue(obj: unknown): void {
        let _value = obj == null ? [] : !Array.isArray(obj) ? [obj] : obj;
        if (!this.multiple && _value && _value.length > 1)
            _value = _value.slice(0, 1);
        this.value = _value;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerOnChange(fn: any): void {
        this._onChange = fn;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerOnTouched(fn: any): void {
        this._onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    //#endregion

    //#region MatFormFieldControl

    abstract readonly controlType: string;
    abstract readonly _uniqueId: string;

    _defaultErrorStateMatcher = inject(ErrorStateMatcher);
    private _parentForm = inject(NgForm, { optional: true });
    private _parentFormGroup = inject(FormGroupDirective, { optional: true });

    private _placeholder!: string;
    private _required: boolean | undefined;
    private _focused = false;
    private _id!: string;

    errorState: boolean = false;
    readonly stateChanges = new Subject<void>();

    get focused(): boolean { return this._focused || this.panelOpen; };
    get shouldLabelFloat(): boolean {
        return this.panelOpen || !this.empty || (this.focused && !!this.placeholder);
    }
    get empty(): boolean { return !this.value || (Array.isArray(this.value) && !this.value.length); }
    get autofilled(): boolean { return false; }

    @Input() errorStateMatcher?: ErrorStateMatcher;

    @Input()
    get placeholder(): string { return this._placeholder; }
    set placeholder(value: string) {
        this._placeholder = value;
        this.stateChanges.next();
    }

    @Input()
    get required(): boolean {
        return this._required ?? this.ngControl?.control?.hasValidator(Validators.required) ?? false;
    }
    set required(value: BooleanInput) {
        this._required = coerceBooleanProperty(value);
        this.stateChanges.next();
    }

    @Input()
    get id(): string {
        return this._id;
    }
    set id(value: string) {
        this._id = value || this._uniqueId;
        this.stateChanges.next();
    }

    protected setFocused(value: boolean) {
        if (!this.disabled) {
            this._focused = value;
        }
        this.stateChanges.next();
    }

    private updateErrorState() {
        const oldState = this.errorState;
        const parent = this._parentFormGroup || this._parentForm;
        const matcher = this.errorStateMatcher || this._defaultErrorStateMatcher;
        const control = this.ngControl ? (this.ngControl.control as AbstractControl) : null;
        const newState = matcher.isErrorState(control, parent ?? null);

        if (newState !== oldState) {
            this.errorState = newState;
            this.stateChanges.next();
        }
    }

    userAriaDescribedBy?: string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setDescribedByIds(ids: string[]): void {
    }

    ngDoCheck(): void {
        if (this.ngControl)
            this.updateErrorState();
    }

    onContainerClick(): void {
        this.focus();
        this.open();
    }

    ngOnDestroy() {
        this.stateChanges.complete();
        this._valueSubscription?.unsubscribe();
    }

    protected override onOpened() {
        this.stateChanges.next();
        this.innerList?.focus();
    }

    protected override onClosed(reason: CloseReson) {
        if (reason !== 'BackDrop' && reason !== 'Manual')
            this.focus();
        this.stateChanges.next();
    }

    //#endregion
}