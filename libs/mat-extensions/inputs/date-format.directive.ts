import { Directive, ElementRef, Input, inject } from "@angular/core";
import { MAT_DATE_FORMATS } from "@angular/material/core";
import { _addMissingDateComponents } from "./internal/functions";

@Directive({
    standalone: true,
    selector: `input:[inputmode=date][dateFormat],input:[matDatepicker][dateFormat],
               input:[nvEndDate][dateFormat],input:[nvStartDate][dateFormat],
               input:[matEndDate][dateFormat],input:[matStartDate][dateFormat]`,
    providers: [{ provide: MAT_DATE_FORMATS, useExisting: DateFormatDirective }],
})
export class DateFormatDirective {

    private _baseDateFormats = inject(MAT_DATE_FORMATS, { skipSelf: true });
    private _elementRef= inject(ElementRef<HTMLInputElement>);

    private _dateFormat?: string | null;
    private readonly _blurEvent = new Event('blur', { bubbles: true, cancelable: false });
    
    @Input()
    get dateFormat(): string | undefined | null { return this._dateFormat; }
    set dateFormat(value: string | undefined | null) {
        if (value)
            value = _addMissingDateComponents(value);

        if (this._dateFormat != value) {
            this._dateFormat = value;
            setTimeout(() => this._elementRef.nativeElement.dispatchEvent(this._blurEvent));
        }
    }

    get parse() {
        if (this._dateFormat)
            return { dateInput: this._dateFormat };
        else
            return this._baseDateFormats?.parse;
    }

    get display() {
        if (this._dateFormat)
            return { ...this._baseDateFormats?.display || {}, dateInput: this._dateFormat };
        return this._baseDateFormats?.display;
    }
}