import {
    ChangeDetectionStrategy,
    Component,
    Directive, ElementRef, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges,
    ViewContainerRef, ViewEncapsulation, booleanAttribute, inject, numberAttribute
} from "@angular/core";
import { ThemePalette } from "@angular/material/core";
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompositeComponentWrapper } from "./component-wrapper";
import { ProgressMode, ProgressPosition, ProgressType } from './types';
//TODO: handle disabled
@Component({
    selector: 'loading-inline-component',
    standalone: true,
    imports: [MatProgressBarModule, MatProgressSpinnerModule],
    host: {
        'class': 'nova-progress-addon-host',
        '[class.inline-spinner]': 'addOnProgress=="spinner"',
        '[class.end-position]': '!position || position=="end"',
        '[class.start-position]': 'position=="start"'
    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @switch (addOnProgress) {
         @case ('bar') {
            <mat-progress-bar [value]="progressValue" [mode]="progressMode" [color]="progresscolor||color"></mat-progress-bar>
         }
         @case ('spinner') {
            <mat-spinner  [diameter]="diameter" [value]="progressValue" [mode]="progressMode" [color]="progresscolor||color"></mat-spinner>
         }
        }
    `
})
class ProgressInlineComponent {
    @Input() addOnProgress: ProgressType = 'spinner'
    @Input() progressMode: ProgressMode = 'indeterminate';
    @Input() progressValue: number = 0;
    @Input() color: ThemePalette;
    @Input() progresscolor: ThemePalette;
    @Input() diameter: number = 20;
    @Input() position: ProgressPosition;
}

@Directive({
    selector: '[addOnProgress]',
    exportAs: 'addOnProgress',
    standalone: true,
})
export class NovaOverlayProgress implements OnChanges, OnDestroy {

    private _origDisabled?: boolean = undefined;

    private _elementRef = inject(ElementRef);
    private _viewContainerRef = inject(ViewContainerRef);
    private _renderer = inject(Renderer2);

    private _wrapper = new CompositeComponentWrapper(() => ({
        progressMode: 'indeterminate',
        addOnProgress: 'spinner',
        position: 'end',
        progressValue: 0,
        diameter: 20
    } as Partial<ProgressInlineComponent>));

    @Input({ transform: booleanAttribute }) keepElementActive: boolean = false;
    @Input({ transform: booleanAttribute }) progressVisible: boolean = false;

    @Input()
    get addOnProgress(): ProgressType { return this._wrapper.get('addOnProgress'); }
    set addOnProgress(value: ProgressType) { this._wrapper.set('addOnProgress', value); }

    @Input()
    get progressPosition(): ProgressPosition { return this._wrapper.get('position'); }
    set progressPosition(value: ProgressPosition) { this._wrapper.set('position', value); }

    @Input()
    get progressMode(): ProgressMode { return this._wrapper.get('progressMode'); }
    set progressMode(value: ProgressMode) { this._wrapper.set('progressMode', value ?? 'indeterminate'); }

    @Input({ transform: numberAttribute })
    get progressValue(): number { return this._wrapper.get('progressValue'); }
    set progressValue(value: number) { this._wrapper.set('progressValue', value ?? 0); }

    @Input({ transform: numberAttribute })
    get progressDiameter(): number { return this._wrapper.get('diameter'); }
    set progressDiameter(value: number) { this._wrapper.set('diameter', value ?? 20); }

    @Input()
    get progressColor(): ThemePalette { return this._wrapper.get('progresscolor'); }
    set progressColor(value: ThemePalette) { this._wrapper.set('progresscolor', value); }

    @Input()
    get color(): ThemePalette { return this._wrapper.get('color'); }
    set color(value: ThemePalette) { this._wrapper.set('color', value); }

    @Input() disabled: boolean = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (!changes["progressVisible"]) {
            return;
        }
        if (changes["progressVisible"].currentValue) {
            this._setDisabled(true);
            this._displayProgress();
        } else if (!changes["progressVisible"].firstChange) {
            this._setDisabled(false);
            this._hideProgress();
        }
    }

    ngOnDestroy(): void {
        this._wrapper.detach();
    }

    private _setDisabled(value: boolean) {
        const element = this._elementRef.nativeElement;
        if (value) {
            const currentDisabled = element.getAttribute('disabled') || this.disabled;
            if (currentDisabled)
                this._origDisabled = currentDisabled;
            if (!this.keepElementActive)
                element.setAttribute('disabled', '');
        } else {
            if (!this.keepElementActive && !this._origDisabled) {
                element.removeAttribute('disabled');
                this._origDisabled = undefined;
            }
        }
    }

    private _displayProgress(): void {
        if (!this._wrapper.componentRef)
            this._wrapper.attach(this._viewContainerRef.createComponent(ProgressInlineComponent));
        if (this._wrapper?.htmlElement)
            this._renderer.appendChild(this._elementRef.nativeElement, this._wrapper.htmlElement);
        this._renderer.addClass(this._elementRef.nativeElement, '--has-inline-progress');
    }

    private _hideProgress() {
        if (this._wrapper?.htmlElement)
            this._renderer.removeChild(this._elementRef.nativeElement, this._wrapper?.htmlElement);
        this._renderer.removeClass(this._elementRef.nativeElement, '--has-inline-progress');
    }
}