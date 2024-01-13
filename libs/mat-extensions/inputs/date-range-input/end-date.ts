import { Directive, Host, ElementRef, Injector, Optional, Inject, DoCheck } from "@angular/core";
import { NG_VALUE_ACCESSOR, NG_VALIDATORS, NgForm, FormGroupDirective } from "@angular/forms";
import { ErrorStateMatcher, DateAdapter, MAT_DATE_FORMATS, MatDateFormats } from "@angular/material/core";
import { MatEndDate } from "@angular/material/datepicker";
import { NovaDateRangeInput } from "./date-range-input";

@Directive({
    selector: 'input[nvEndDate]',
    standalone: true,
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: NovaEndDate, multi: true },
        { provide: NG_VALIDATORS, useExisting: NovaEndDate, multi: true },
        { provide: MatEndDate, useExisting: NovaEndDate },
    ],
})
export class NovaEndDate<D> extends MatEndDate<D> implements DoCheck {

    constructor(
        @Host() rangeInput: NovaDateRangeInput<D>,
        elementRef: ElementRef<HTMLInputElement>,
        defaultErrorStateMatcher: ErrorStateMatcher,
        injector: Injector,
        @Optional() parentForm: NgForm,
        @Optional() parentFormGroup: FormGroupDirective,
        @Optional() dateAdapter: DateAdapter<D>,
        @Optional() @Inject(MAT_DATE_FORMATS) dateFormats: MatDateFormats,
    ) {
        super(
            rangeInput,
            elementRef,
            defaultErrorStateMatcher,
            injector,
            parentForm,
            parentFormGroup,
            dateAdapter,
            dateFormats,
        );
    }
    // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
    override ngDoCheck() { }
}
