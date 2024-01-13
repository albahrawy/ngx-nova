import { Input, Output, EventEmitter, booleanAttribute, Directive } from "@angular/core";
import { ThemePalette } from "@angular/material/core";

@Directive({
    host: {
        'class': 'mat-mdc-form-field-icon-suffix input-button',
        '[class.input-read-only]': 'readOnly'
    },
})
export abstract class NovaInputSuffixButtonComponentBase<T> {
    @Input() color: ThemePalette;
    @Output() buttonClick: EventEmitter<T> = new EventEmitter();
    @Input({ transform: booleanAttribute }) disabled: boolean = false;
    @Input({ transform: booleanAttribute }) readOnly: boolean = false;

    onButtonClick(event: Event, value?: T) {
        event.stopPropagation();
        event.preventDefault();
        this.buttonClick.emit(value);
    }
}