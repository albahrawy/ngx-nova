import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
    AfterViewChecked,
    AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, Input, OnChanges,
    OnDestroy, Optional, Self, ViewEncapsulation
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormGroupDirective, NgControl, NgForm, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldControl, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatList, MatListModule } from '@angular/material/list';
import { EvaluatePipe } from '@ngx-nova/cdk/shared';
import { Subject } from 'rxjs';
import { NovaSelectionListPanel } from './selection-list-panel';
import { NOVA_SELECTION_LIST, NovaListOption } from './list-option';

@Component({
    selector: 'nova-selection-list',
    exportAs: 'novaSelectionList',
    templateUrl: './selection-list.html',
    styleUrls: ['./selection-list.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [MatFormFieldModule, MatInputModule, MatDividerModule, EvaluatePipe, NovaListOption,
        MatIconModule, MatListModule, ScrollingModule, NgTemplateOutlet],
    providers: [
        { provide: MatFormFieldControl, useExisting: NovaSelectionList },
        { provide: MatList, useExisting: NovaSelectionList },
        { provide: NOVA_SELECTION_LIST, useExisting: NovaSelectionList },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovaSelectionList<TRow, TValue> extends NovaSelectionListPanel<TRow, TValue>
    implements ControlValueAccessor,
    MatFormFieldControl<TValue[] | TValue>,
    AfterViewInit, AfterViewChecked, OnChanges, OnDestroy, DoCheck {

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _defaultErrorStateMatcher: ErrorStateMatcher,
        @Optional() private _parentForm: NgForm | null,
        @Optional() private _parentFormGroup: FormGroupDirective | null,
        @Self() @Optional() public ngControl: NgControl | null,
    ) {
        super();
        if (ngControl) {
            ngControl.valueAccessor = this;
        }
    }

    //#region ControlValueAccessor

    protected override _notifyValueChange() {
        this._onChange(this.value);
        this.stateChanges.next();
    }

    private _touched = false;

    private _onChange: (value: TValue | TValue[] | null) => void = () => { };
    private _onTouched: () => void = () => { };

    override _notifyTouched() {
        if (!this._touched) {
            this._touched = true;
            this._onTouched();
            this.stateChanges.next();
        }
    }

    writeValue(value: TValue[] | TValue | null): void {
        this._setValue(value);
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
        this._markOptionsForCheck();
        this._changeDetectorRef.markForCheck();
        this.stateChanges.next();
    }

    registerOnChange(fn: (value: unknown) => void): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this._onTouched = fn;
    }

    //#endregion

    //#region MatFormFieldControl

    private static nextUniqueId = 0;
    readonly controlType: string = 'nova-selection-list';
    readonly id = `${this.controlType}-${NovaSelectionList.nextUniqueId++}`;

    private _placeholder!: string;
    private _required: boolean | undefined;
    private _focused = false;

    errorState: boolean = false;
    readonly stateChanges = new Subject<void>();

    get focused(): boolean { return this._focused; };
    get shouldLabelFloat(): boolean { return true; }
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

    private setFocused(value: boolean) {
        if (this._focused != value) {
            this._focused = value;
            this.stateChanges.next();
        }
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onContainerClick(event: MouseEvent): void {
        if (!this.focused) {
            this.focus();
        }
        this.stateChanges.next();
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.stateChanges.complete();
    }

    protected override notifyFocused(focused: boolean) {
        this.setFocused(focused);
    }

    //#endregion
}