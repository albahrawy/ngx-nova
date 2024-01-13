/* eslint-disable @typescript-eslint/no-explicit-any */
import { BooleanInput } from "@angular/cdk/coercion";
import {
    ChangeDetectionStrategy, Component, Directive, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges,
    ViewEncapsulation, booleanAttribute, forwardRef, numberAttribute
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { NumberParser } from "./internal/number.parser";
import { NovaInputSuffixButtonComponentBase } from "./base/input-button-base.component";
import { NovaInputSuffixButtonDirectiveBase } from "./base/input-button-base.directive";
import { toStringValue } from "@ngx-nova/js-extensions";

const formatAttributes = new Set(['locale', 'inputmode', 'thousandSeparator', 'percentage', 'decimalDigits', 'currency']);
const INPUTNUMBER_VALUE_ACCESSOR = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => NumericInput),
    multi: true
};

@Component({
    selector: 'num-input-buttons-component',
    standalone: true,
    imports: [MatButtonModule, MatIconModule],
    host: {
        'class': 'num-input-buttons',
        '[class.vertical-buttons]': 'verticalButton'

    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
            <button [color]="color" class="input-button-inline" [disabled]="disabled" 
                (click)="onButtonClick($event,1)" mat-icon-button>
                <mat-icon  class="input-button-icon">arrow_drop_up</mat-icon>
            </button>
            <button [color]="color" class="input-button-inline" [disabled]="disabled" 
                (click)="onButtonClick($event,-1)" mat-icon-button>
                <mat-icon  class="input-button-icon">arrow_drop_down</mat-icon>
            </button>   
    `
})
class NumbericInputButtonsComponent extends NovaInputSuffixButtonComponentBase<number> {
    @Input() verticalButton: boolean = false;
}

@Directive({
    selector: 'input:not([type=number])[inputmode=numeric], input:not([type=number])[inputmode=decimal]',
    standalone: true,
    exportAs: 'numberInput',
    providers: [INPUTNUMBER_VALUE_ACCESSOR],
    host: {
        '[disabled]': 'disabled',
        '(input)': '_onInput($event)',
        '(blur)': '_onBlur()',
        '(focus)': '_onFocus()',
        '(keydown)': '_onKeyDown($event)',
        '(keypress)': '_onKeyPress($event)',
        '(paste)': '_onPaste($event)'
    }
})
export class NumericInput extends NovaInputSuffixButtonDirectiveBase<number, NumbericInputButtonsComponent>
    implements ControlValueAccessor, OnInit, OnChanges {

    private readonly _numberParser = new NumberParser();
    private _numberValue?: number | bigint | null;
    private _value: number | bigint | null | undefined;
    private _allowArrowKeys = true;
    private get readOnly() { return this.elementRef?.nativeElement.readOnly; }

    protected readonly componentType = NumbericInputButtonsComponent;
    protected override buttonContainerClass = 'nova-number-input-buttons-containers';
    protected override isLastButton: boolean = true;

    @Output() readonly valueChanged = new EventEmitter<number | bigint | null>();

    @Input("showButtons")
    override get showButton(): boolean { return super.showButton; }
    override set showButton(value: BooleanInput) { super.showButton = value; }

    // eslint-disable-next-line @angular-eslint/no-input-rename
    @Input({ transform: (value: unknown) => numberAttribute(value, 1) }) step: number = 1;
    @Input({ transform: numberAttribute }) min?: number;
    @Input({ transform: numberAttribute }) max?: number;

    @Input()
    get value(): number | bigint | null | undefined { return this._value; }
    set value(value: number | bigint | null | undefined) {
        if (this._parseValueAndValidate(value, true, false).changed) {
            this._value = value;
            this._updateInput(true);
        }
    }
    @Input()
    get inputmode(): 'numeric' | 'decimal' { return this._numberParser.inputmode; }
    set inputmode(value: 'numeric' | 'decimal') { this._numberParser.inputmode = value; }

    @Input()
    get locale(): string | undefined { return this._numberParser.locale; }
    set locale(value: string | undefined) { this._numberParser.locale = value; }

    @Input({ transform: booleanAttribute })
    get allowArrowKeys(): boolean { return this._allowArrowKeys; }
    set allowArrowKeys(value: boolean) { this._allowArrowKeys = value; }

    @Input({ transform: booleanAttribute })
    get thousandSeparator(): boolean { return this._numberParser.thousandSeparator; }
    set thousandSeparator(value: boolean) { this._numberParser.thousandSeparator = value; }

    @Input({ transform: booleanAttribute })
    get percentage(): boolean { return this._numberParser.percentage; }
    set percentage(value: boolean) { this._numberParser.percentage = value; }

    @Input()
    get currency(): string | undefined { return this._numberParser.currency; }
    set currency(value: string | undefined) { this._numberParser.currency = value; }

    @Input({ transform: numberAttribute })
    get decimalDigits(): number | undefined { return this._numberParser.decimalDigits; }
    set decimalDigits(value: number | undefined) { this._numberParser.decimalDigits = value; }

    @Input({ transform: booleanAttribute })
    get verticalButton(): boolean { return this.buttonWrapper.get('verticalButton'); }
    set verticalButton(value: boolean) { this.buttonWrapper.set('verticalButton', value); }

    override ngOnInit(): void {
        this._numberParser.createParser();
        super.ngOnInit();
    }

    _onBlur() {
        if (this.readOnly)
            return;

        this._updateInput(true);
        this._onTouched();
    }

    _onFocus() {
        if (!this.readOnly)
            this._updateInput();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onInput(event: InputEvent) {
        if (this.readOnly)
            return;

        if (this._parseValueAndValidate(this.elementRef.nativeElement.value).invalid)
            this.elementRef.nativeElement.value = `${this._numberValue}`;
    }

    _onKeyDown(event: KeyboardEvent) {
        if (this.readOnly || !event.target || !this._allowArrowKeys) {
            return;
        }
        if (event.altKey) {
            event.preventDefault();
        }

        switch (event.code) {
            //up
            case 'ArrowUp':
                this.spin(1);
                event.preventDefault();
                break;

            //down
            case 'ArrowDown':
                this.spin(-1);
                event.preventDefault();
                break;
        }
    }

    _onKeyPress(event: KeyboardEvent) {
        if (this.readOnly) {
            return;
        }

        if (!this._allowDegit(event.code, event.target)
            && !this._allowDecimal(event.key, event.target)
            && !this._allowMinus(event.key, event.target)
            && event.code != 'Enter')
            event.preventDefault();
    }

    _onPaste(event: ClipboardEvent) {
        if (!this.disabled && !this.readOnly) {
            event.preventDefault();
            if (this._parseValueAndValidate(event.clipboardData?.getData("Text"), false).changed)
                this._updateInput();
        }
    }

    override ngOnChanges(changes: SimpleChanges): void {
        let needUpdate = false;
        if (Object.keys(changes).some(prop => formatAttributes.has(prop))) {
            this._numberParser.createFormatter();
            needUpdate = true;;
        }
        if ((changes["locale"] && !changes["locale"].isFirstChange()) || (changes["currency"] && !changes["currency"].isFirstChange())) {
            this._numberParser.createParser();
        }

        super.ngOnChanges(changes);

        if (needUpdate)
            this._updateInput(true);
    }

    protected onbuttonClick(value: number): void {
        if (!this.readOnly)
            this.spin(value, true);
    }

    /** @internal */
    spin(dir: number, format: boolean = false) {
        const step = this.step * dir;
        let newValue = this._numberValue ?? 0;
        if (typeof newValue === 'number')
            newValue += step;
        else
            newValue += BigInt(step);
        if (this._parseValueAndValidate(newValue).changed)
            this._updateInput(format);
    }

    private _updateInput(formatted: boolean = false) {
        const displayValue = formatted ? this._numberParser.format(this._numberValue) : toStringValue(this._numberValue);;
        this.elementRef.nativeElement.setAttribute('aria-valuenow', displayValue);
        this.elementRef.nativeElement.value = displayValue || '';
    }

    private _parseValueAndValidate(value: number | bigint | null | string | undefined, applyForNull: boolean = true, raiseOnChange: boolean = true)
        : { changed: boolean, invalid: boolean } {
        const result = { changed: false, invalid: false };
        let _value: number | bigint | null | undefined = null;
        if (value == null || typeof value === 'number' || typeof value === 'bigint')
            _value = value;
        else
            _value = this._numberParser.parse(typeof value === 'string' ? value : toStringValue(value));

        if (_value != null) {
            if (this.min != null && _value < this.min) {
                result.invalid = true;
                _value = this.min;
            }

            if (this.max != null && _value > this.max) {
                result.invalid = true;
                _value = this.max;
            }
        }
        const _lastNumberValue = this._numberValue;
        if (_value != null || applyForNull)
            this._numberValue = _value;

        if (_lastNumberValue != this._numberValue) {
            if (raiseOnChange) {
                this.valueChanged.emit(this._numberValue);
                this._onChange(this._numberValue);
            }
            this._value = this._numberValue;
            result.changed = true;
        }
        return result;
    }

    private _allowDecimal(key: string, target: EventTarget | null): boolean {
        if (this.inputmode != 'decimal' || !this.decimalDigits || this.decimalDigits <= 0)
            return false;
        const input = target as HTMLInputElement;
        if (this._numberParser.isDecimalChar(key)) {
            const decimalIndex = this._numberParser.getDecimalIndex(input.value) ?? -1;
            if ((input.selectionStart! <= decimalIndex && input.selectionEnd! >= decimalIndex) ||
                (decimalIndex == -1 && input.value.length - (input.selectionEnd ?? 0) <= this.decimalDigits)) {
                return true;
            }
        }
        return false;
    }

    private _allowDegit(code: string, target: EventTarget | null): boolean {
        if (!code.startsWith("Digit"))
            return false;
        if (this.inputmode == 'decimal' && this.decimalDigits && this.decimalDigits > 0) {
            const input = target as HTMLInputElement;
            const decimalIndex = this._numberParser.getDecimalIndex(input.value) ?? -1;
            if (decimalIndex != -1 && input.selectionStart && input.selectionEnd && input.selectionStart > decimalIndex) {
                return input.value.length - decimalIndex <= this.decimalDigits;
            }
        }

        return true;
    }

    private _allowMinus(key: string, target: EventTarget | null): boolean {
        if (this.min != null && this.min >= 0)
            return false;
        const input = target as HTMLInputElement;
        if (this._numberParser.isMinusSignChar(key)) {
            if ((input.selectionStart == 0 && !this._numberParser.isMinusSignChar(input.value)) ||
                (input.selectionStart == 0 && input.selectionEnd && input.selectionEnd > 0))
                return true;
        }
        return false;

    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _onChange = (value: any) => { };
    private _onTouched = () => { };

    writeValue(obj: any): void {
        this.value = obj;
    }
    registerOnChange(fn: any): void {
        this._onChange = fn;
    }
    registerOnTouched(fn: any): void {
        this._onTouched = fn;
    }
    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
