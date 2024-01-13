import { Component, ComponentRef, DestroyRef, Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2, ViewChild, ViewContainerRef, forwardRef, inject } from "@angular/core";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR } from "@angular/forms";
import { MatDatepicker, MatDatepickerInput, MatDatepickerModule, MatDatepickerToggle } from "@angular/material/datepicker";
import { MAT_FORM_FIELD } from "@angular/material/form-field";
import { MAT_INPUT_VALUE_ACCESSOR } from "@angular/material/input";
import { ElementStateObservableService } from '@ngx-nova/cdk/observers';


@Component({
    selector: 'nova-datepicker-control',
    host: { 'class': 'nova-datepicker-control' },
    standalone: true,
    imports: [MatDatepickerModule],
    template: `<mat-datepicker-toggle [for]="picker" [class.datePicker-toggle-read-only]="readonly"
    [disabled]="disabled||readonly"></mat-datepicker-toggle><mat-datepicker #picker></mat-datepicker>`
})
class InternalMatDatePickerComponent<D> {

    private formField = inject(MAT_FORM_FIELD, { optional: true });
    private _renderer = inject(Renderer2);
    private _datePicker?: MatDatepicker<D>;

    @ViewChild(MatDatepickerToggle, { static: true, read: ElementRef }) toggle?: ElementRef;
    @ViewChild(MatDatepicker, { static: true }) set datePicker(picker: MatDatepicker<D>) {
        this._datePicker = picker;
    }

    @Input() readonly: boolean = false;
    @Input() disabled: boolean = false;

    attach(datePickerInput: NovaDateInput<D>, inputElement: HTMLElement) {
        if (this._datePicker)
            datePickerInput.matDatepicker = this._datePicker;
        if (this.toggle)
            this.fixToggleLocaltion(this.toggle.nativeElement, inputElement);
    }

    private fixToggleLocaltion(toggleElement: HTMLElement, inputElement: HTMLElement) {
        if (this.formField) {
            const flexElement = this.formField._elementRef.nativeElement.querySelector('.mat-mdc-form-field-flex');
            const suffix = this._renderer.createElement("div");
            this._renderer.addClass(suffix, 'mat-mdc-form-field-icon-suffix');
            this._renderer.addClass(suffix, 'input-button');
            this._renderer.appendChild(flexElement, suffix);
            this._renderer.appendChild(suffix, toggleElement);
        } else {
            const element = this._renderer.createElement('div');
            this._renderer.addClass(element, 'date-picker-no-mat-field');
            this._renderer.insertBefore(inputElement.parentElement, element, inputElement);
            this._renderer.appendChild(element, inputElement);
            this._renderer.appendChild(element, toggleElement);
            this._renderer.addClass(toggleElement, 'mat-mdc-form-field-icon-suffix');
        }
    }
}

@Directive({
    selector: 'input:[type=text][inputmode="date"], input:not([type])[inputmode="date"]',
    standalone: true,
    exportAs: 'nvDateInput',
    host: {
        'class': 'input-button'
    },
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NovaDateInput), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => NovaDateInput), multi: true },
        { provide: MAT_INPUT_VALUE_ACCESSOR, useExisting: NovaDateInput },
        { provide: MatDatepickerInput, useExisting: NovaDateInput }
    ]
})
export class NovaDateInput<D> extends MatDatepickerInput<D> implements OnInit, OnDestroy {

    private _viewContainerRef = inject(ViewContainerRef);
    private _stateObserverService = inject(ElementStateObservableService);
    private _destroyRef = inject(DestroyRef);
    pickerControl?: ComponentRef<InternalMatDatePickerComponent<D>>;

    ngOnInit(): void {
        const pickerControl = this._viewContainerRef.createComponent(InternalMatDatePickerComponent<D>);
        pickerControl.instance.attach(this, this._elementRef.nativeElement);
        this._stateObserverService.stateObservable(this._elementRef.nativeElement)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe(e => {
                pickerControl.setInput('disabled', e.disabled);
                pickerControl.setInput('readonly', e.readonly);
            });
        this.pickerControl = pickerControl;
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
        this.pickerControl?.destroy();
    }
}