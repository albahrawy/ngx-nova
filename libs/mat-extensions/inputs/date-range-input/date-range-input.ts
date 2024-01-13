import { A11yModule, FocusOrigin } from '@angular/cdk/a11y';
import { BooleanInput } from '@angular/cdk/coercion';
import {
    AfterContentInit,
    ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, OnInit, Renderer2, ViewChild, ViewEncapsulation, booleanAttribute, forwardRef, inject
} from '@angular/core';
import {
    AbstractControl, ControlValueAccessor, FormControl, NG_VALIDATORS, NG_VALUE_ACCESSOR,
    ReactiveFormsModule, ValidationErrors, Validator
} from '@angular/forms';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import {
    DateRange, MatDateRangeInput, MatDateRangePicker, MatDatepickerInputEvent, MatDatepickerModule,
    MatDatepickerToggle,
    MatEndDate, MatStartDate
} from '@angular/material/datepicker';
import { MAT_FORM_FIELD, MatFormFieldControl } from '@angular/material/form-field';
import { isDate, isObject, isString } from '@ngx-nova/js-extensions';
import { DateFormatDirective } from '../date-format.directive';
import { DateMaskInput } from '../date-mask.directive';
import { DateRangeRequired, IDateRange } from '../types';
import { NovaEndDate } from './end-date';
import { NovaStartDate } from './start-date';

const noOp = () => { };
@Component({
    selector: 'nova-date-range-input',
    standalone: true,
    templateUrl: 'date-range-input.html',
    styleUrls: ['./date-range-input.scss'],
    host: { '[class.--focused]': 'focused' },
    imports: [MatDatepickerModule, A11yModule, DateMaskInput, DateFormatDirective, NovaStartDate, NovaEndDate, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [
        { provide: MatFormFieldControl, useExisting: NovaDateRangeInput },
        { provide: NG_VALUE_ACCESSOR, useExisting: NovaDateRangeInput, multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => NovaDateRangeInput), multi: true },
    ],
})
export class NovaDateRangeInput<D> extends MatDateRangeInput<D>
    implements ControlValueAccessor, OnInit, Validator, AfterContentInit {

    private _onTouched = noOp;
    private _validatorOnChange = noOp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _cvaOnChange: (_: any) => void = noOp;

    private _isTouched = false;
    readonly startCtrl = new FormControl<D | string | null>(null);
    readonly endCtrl = new FormControl<D | string | null>(null);

    private __dateAdapter = inject(DateAdapter<D>);
    private __elementRef = inject(ElementRef);
    private _dateFormats = inject(MAT_DATE_FORMATS, { optional: true });
    private formField = inject(MAT_FORM_FIELD, { optional: true });
    private _renderer = inject(Renderer2);

    @ViewChild(NovaStartDate, { static: true }) __startInput!: MatStartDate<D>;
    @ViewChild(NovaEndDate, { static: true }) __endInput!: MatEndDate<D>;
    @ViewChild(MatDatepickerToggle, { static: true, read: ElementRef }) toggle?: ElementRef;
    @ViewChild(MatDateRangePicker, { static: true }) set datePicker(picker: MatDateRangePicker<D>) {
        this.rangePicker = picker;
    }

    @Input() endPlaceholder?: string;
    @Input() startPlaceholder?: string;
    @Input() dateFormat?: string | null;
    @Input() startField?: string | null;
    @Input() endField?: string | null;
    @Input() isRequired: DateRangeRequired;
    @HostBinding('class.datepicker-read-only')
    @Input({ transform: booleanAttribute }) readonly: boolean = false;

    @Input()
    override get required(): boolean {
        return !!this.isRequired;
    }
    override set required(value: BooleanInput) {
    }

    @Input()
    override get value(): DateRange<D> | null { return super.value; }
    override set value(value: IDateRange<D> | null) {
        this._setRangeValue(value);
    }

    override ngAfterContentInit() {
        this._startInput = this.__startInput;
        this._endInput = this.__endInput;
        super.ngAfterContentInit();
    }

    override get errorState(): boolean {
        return this._isTouched && (this.startCtrl.invalid || this.endCtrl.invalid);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    validate(control: AbstractControl): ValidationErrors | null {
        if (this.errorState) {
            const errors: ValidationErrors = {};
            if (this.startCtrl.invalid)
                errors['start'] = this.startCtrl.errors;
            if (this.endCtrl.invalid)
                errors['end'] = this.endCtrl.errors;
            return errors;
        }
        return null;
    }

    ngOnInit(): void {
        if (this.toggle)
            this.fixToggleLocaltion(this.toggle.nativeElement);
    }

    _focusChanged(origin: FocusOrigin) {
        const oldFocus = this.focused;
        this.focused = origin !== null;
        if (!this._isTouched && oldFocus && !this.focused) {
            this._isTouched = true;
            this._onTouched();
        }
        setTimeout(() => this.stateChanges.next());
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onDateChange(event: MatDatepickerInputEvent<Date>) {
        const value = {
            [this.startField ? this.startField : 'start']: this.startCtrl.value,
            [this.endField ? this.endField : 'end']: this.endCtrl.value
        };

        this._cvaOnChange(value);
        this._validatorOnChange();
        this.stateChanges.next();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeValue(obj: any): void {
        if (!obj) {
            this._setRangeValue(null);
            return;
        }

        const value: IDateRange<D> = {};
        if (isDate(obj))
            value.start = obj as D;
        else if (isString(obj))
            value.start = obj;
        else if (isObject(obj)) {
            value.start = this.startField ? obj[this.startField] : obj['start'];
            value.end = this.endField ? obj[this.endField] : obj['end'];
        }
        if (this.__dateAdapter && this._dateFormats) {
            let _updateModel = false;
            if (isString(value.start)) {
                value.start = this.__dateAdapter.parse(value.start, this._dateFormats.parse.dateInput);
                _updateModel = true;
            }
            if (isString(value.end)) {
                value.end = this.__dateAdapter.parse(value.end, this._dateFormats.parse.dateInput);
                _updateModel = true;
            }

            if (_updateModel) {
                setTimeout(() => this._cvaOnChange(value));
            }
        }

        this._setRangeValue(value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerOnChange(fn: any): void {
        this._cvaOnChange = fn;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerOnTouched(fn: any): void {
        this._onTouched = fn;
    }

    registerOnValidatorChange?(fn: () => void): void {
        this._validatorOnChange = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        super.disabled = isDisabled;
        if (isDisabled) {
            if (this.startCtrl.disabled != isDisabled)
                this.startCtrl.disable();
            if (this.endCtrl.disabled != isDisabled)
                this.endCtrl.disable();
        }
        else {
            if (this.startCtrl.disabled != isDisabled)
                this.startCtrl.enable();
            if (this.endCtrl.disabled != isDisabled)
                this.endCtrl.enable();
        }
    }

    private _setRangeValue(value: IDateRange<D> | null) {
        setTimeout(() => {
            this.startCtrl.setValue(value?.end ?? null, { onlySelf: true, emitEvent: false });
            this.endCtrl.setValue(value?.end ?? null, { onlySelf: true, emitEvent: false });
        });
    }

    private fixToggleLocaltion(toggleElement: HTMLElement) {
        if (this.formField) {
            const flexElement = this.formField._elementRef.nativeElement.querySelector('.mat-mdc-form-field-flex');
            const suffix = this._renderer.createElement("div");
            this._renderer.addClass(suffix, 'mat-mdc-form-field-icon-suffix');
            this._renderer.addClass(suffix, 'input-button');
            this._renderer.appendChild(flexElement, suffix);
            this._renderer.appendChild(suffix, toggleElement);
        } else {
            const inputElement = this.__elementRef.nativeElement;
            const element = this._renderer.createElement('div');
            this._renderer.addClass(element, 'date-range-picker-no-mat-field');
            this._renderer.insertBefore(inputElement.parentElement, element, inputElement);
            this._renderer.appendChild(element, inputElement);
            this._renderer.appendChild(element, toggleElement);
            this._renderer.addClass(toggleElement, 'mat-mdc-form-field-icon-suffix');
        }
    }
}
