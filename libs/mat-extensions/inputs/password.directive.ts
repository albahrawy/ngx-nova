import { Component, Directive, Input, ViewEncapsulation } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { NovaInputSuffixButtonComponentBase } from "./base/input-button-base.component";
import { NovaInputSuffixButtonDirectiveBase } from "./base/input-button-base.directive";
import { PasswordRevealButtonMode, PasswordRevealMode } from "./types";

@Component({
    selector: 'input-password-button-component',
    standalone: true,
    imports: [MatButtonModule, MatIconModule],
    encapsulation: ViewEncapsulation.None,
    template: `
            @if(showButton || input?.value) {
                @switch (revealOn) {
                    @case ('hover') {
                        <button [color]="color" class="input-button-inline" [disabled]="disabled" mat-icon-button
                            (mousedown)="onButtonClick($event,state=true)"
                            (mouseup)="onButtonClick($event,state=false)"
                            (touchstart)="onButtonClick($event,state=true)"
                            (touchend)="onButtonClick($event,state=false)">
                <mat-icon class="input-button-icon">{{state?'visibility':'visibility_off'}}</mat-icon>
            </button>
                    }
                    @default {
                        <button [color]="color" class="input-button-inline" [disabled]="disabled" mat-icon-button
                            (click)="onButtonClick($event,state=!state);">
                                <mat-icon class="input-button-icon">{{state?'visibility':'visibility_off'}}</mat-icon>
                        </button>
                    }
                }
            }
    `
})
class PasswordButtonComponent extends NovaInputSuffixButtonComponentBase<boolean> {

    state = false;

    @Input() input?: HTMLInputElement;
    @Input() revealOn: PasswordRevealMode = "hover";
    @Input() showButton = false;
}

@Directive({
    selector: 'input:[type="password"][revealButton]',
    standalone: true,
    exportAs: 'nvPasswordButton',
})
export class NovaPasswordReveal extends NovaInputSuffixButtonDirectiveBase<boolean, PasswordButtonComponent> {

    private _revealButton: PasswordRevealButtonMode = 'value';

    protected readonly componentType = PasswordButtonComponent;
    protected override buttonContainerClass = 'nova-input-password-button-containers';

    @Input()
    get revealOn(): PasswordRevealMode { return this.buttonWrapper.get('revealOn'); }
    set revealOn(value: PasswordRevealMode) {
        this.buttonWrapper.set('revealOn', value);
    }

    @Input()
    get revealButton(): PasswordRevealButtonMode { return this._revealButton; }
    set revealButton(value: PasswordRevealButtonMode) {
        this._revealButton = value;
        this.buttonWrapper.set('showButton', value === 'always');
        super.showButton = value != 'none';
    }

    protected override setupComponent(): void {
        if (this.buttonWrapper.component) {
            this.buttonWrapper.component.input = this.elementRef.nativeElement;
        }
    }

    protected onbuttonClick(show: boolean): void {
        if (!this.elementRef.nativeElement.readOnly) {
            this._renderer.setAttribute(this.elementRef.nativeElement, 'type', show ? 'text' : 'password');
        }
    }
}