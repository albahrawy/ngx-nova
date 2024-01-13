import { BooleanInput } from "@angular/cdk/coercion";
import { Component, Directive, Input, ViewEncapsulation } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { NovaInputSuffixButtonComponentBase } from "./base/input-button-base.component";
import { NovaInputSuffixButtonDirectiveBase } from "./base/input-button-base.directive";

@Component({
    selector: 'input-suffix-button-component',
    standalone: true,
    imports: [MatButtonModule, MatIconModule],
    encapsulation: ViewEncapsulation.None,
    template: `
            @if(showAlways || (input?.value && !disabled)){
                <button [color]="color" class="input-button-inline" [disabled]="disabled" 
                (click)="onButtonClick($event)" mat-icon-button>
                    <mat-icon class="input-button-icon">close</mat-icon>
                </button>
            }
    `
})
class InputSuffixClearComponent extends NovaInputSuffixButtonComponentBase<void> {

    @Input() input?: HTMLInputElement;
    @Input() showAlways: boolean = false;
}


@Directive({
    selector: `input:not([type="radio"])[allowClear],
               input:not([type="select"])[allowClear],
               input:not([type="checkbox"])[allowClear]`,
    standalone: true,
    exportAs: 'novaClear',
})
export class ClearInputButton extends NovaInputSuffixButtonDirectiveBase<void, InputSuffixClearComponent> {

    protected readonly componentType = InputSuffixClearComponent;
    protected override buttonContainerClass = 'nova-input-clear-button-containers';

    @Input("allowClear")
    override get showButton(): boolean { return super.showButton; }
    override set showButton(value: BooleanInput) { super.showButton = value; }

    protected override setupComponent(): void {
        if (this.buttonWrapper.component) {
            this.buttonWrapper.component.input = this.elementRef.nativeElement;
        }
    }

    protected onbuttonClick(): void {
        if (!this.elementRef.nativeElement.readOnly) {
            this.elementRef.nativeElement.value = '';
            this.elementRef.nativeElement.dispatchEvent(new Event('input'));
        }
    }
}