import { Directive, ElementRef, Input, inject } from '@angular/core';
export type ButtonStyle = "button" | "flat" | "raised" | "stroked" | '' | null | undefined;

const HOST_SELECTOR_MDC_CLASS_PAIR: { [key: string]: string[]; } = {
    'button': ['mdc-button', 'mat-mdc-button'],
    'flat': ['mdc-button', 'mdc-button--unelevated', 'mat-mdc-unelevated-button'],
    'raised': ['mdc-button', 'mdc-button--raised', 'mat-mdc-raised-button'],
    'stroked': ['mdc-button', 'mdc-button--outlined', 'mat-mdc-outlined-button']
};

@Directive({
    selector: 'button[mat-button], a[mat-button]',
    standalone: true
})
export class NovaMatButtonStyle {
    private _buttonStyle: ButtonStyle;
    private elementRef: ElementRef<HTMLElement> = inject(ElementRef);

    @Input("mat-button")
    get buttonStyle(): ButtonStyle {
        return this._buttonStyle;
    }
    set buttonStyle(value: ButtonStyle) {
        const _classList = this.elementRef.nativeElement.classList;
        if (this._buttonStyle) {
            const _oldList = HOST_SELECTOR_MDC_CLASS_PAIR[this._buttonStyle];
            if (_oldList)
                _classList.remove(..._oldList);
        }
        if (value) {
            const _newList = HOST_SELECTOR_MDC_CLASS_PAIR[value];
            if (_newList)
                _classList.add(..._newList);
        }
        this._buttonStyle = value;
    }
}