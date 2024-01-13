import { BooleanInput, coerceBooleanProperty } from "@angular/cdk/coercion";
import { Directive, ElementRef, Input, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges, Type, ViewContainerRef, booleanAttribute, inject } from "@angular/core";
import { ThemePalette } from "@angular/material/core";
import { MAT_FORM_FIELD } from "@angular/material/form-field";
import { ElementStateObservableService } from "@ngx-nova/cdk/observers";
import { CompositeComponentWrapper } from "@ngx-nova/cdk/shared";
import { Subscription } from "rxjs";
import { NovaInputSuffixButtonComponentBase } from "./input-button-base.component";


const noOp = () => { };

@Directive()
export abstract class NovaInputSuffixButtonDirectiveBase<T, C extends NovaInputSuffixButtonComponentBase<T>> implements OnDestroy, OnChanges, OnInit {

    private _showButton: boolean = false;
    private _clickSubscription?: Subscription;
    private _stateSubscription?: Subscription;
    private _removeElement = noOp;

    private _formField = inject(MAT_FORM_FIELD, { optional: true })
    private _viewContainerRef = inject(ViewContainerRef);
    private _stateObserverService = inject(ElementStateObservableService);

    protected buttonWrapper = new CompositeComponentWrapper<C>(() => this.setDefaults());
    protected setDefaults(): Partial<C> {
        return { disabled: false } as C;
    }
    protected abstract componentType: Type<C>;
    protected buttonContainerClass: string = '';
    protected isLastButton: boolean = false;
    protected elementRef: ElementRef<HTMLInputElement> = inject(ElementRef);
    protected _renderer = inject(Renderer2);

    protected get showButton(): boolean { return this._showButton; }
    protected set showButton(value: BooleanInput) { this._showButton = coerceBooleanProperty(value); }

    @Input() noneMatFieldCssClass: string = 'input-with-button-no-mat-field';

    @Input()
    get buttonColor(): ThemePalette { return this.buttonWrapper.get('color'); }
    set buttonColor(value: ThemePalette) { this.buttonWrapper.set('color', value); }

    @Input({ transform: booleanAttribute })
    get disabled(): boolean { return this.buttonWrapper.get('disabled'); }
    set disabled(value: boolean) { this.buttonWrapper.set('disabled', value); }

    ngOnInit(): void {
        if (this.showButton)
            this._manageButton(true);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["showButton"] && !changes["showButton"].isFirstChange()) {
            this._manageButton(this._showButton);
        }
    }

    ngOnDestroy(): void {
        this._destoryButton();
    }

    private _manageButton(show: boolean): void {
        if (!show && this.buttonWrapper.component) {
            this._destoryButton();
        } else if (show && !this.buttonWrapper.component) {
            const nextElement = this.elementRef.nativeElement.nextElementSibling;
            const componentRef = this._viewContainerRef.createComponent(this.componentType);
            this.buttonWrapper.attach(componentRef);
            this._clickSubscription = componentRef?.instance?.buttonClick.subscribe(e => this.onbuttonClick(e));
            this.setupComponent();
            if (this._formField) {
                const flexElement = this._formField._elementRef.nativeElement.querySelector('.mat-mdc-form-field-flex');
                const infixElement = this._formField._elementRef.nativeElement.querySelector('.mat-mdc-form-field-infix');
                this._removeElement = noOp;
                let locationElement = infixElement.nextElementSibling;
                if (this.isLastButton) {
                    while (locationElement)
                        locationElement = locationElement.nextElementSibling;
                }
                if (this.buttonWrapper.htmlElement)
                    this._renderer.insertBefore(flexElement, this.buttonWrapper.htmlElement, locationElement);
            }
            else {
                const element = this._renderer.createElement('div');
                const parentElement = this.elementRef.nativeElement.parentElement;
                if (this.noneMatFieldCssClass)
                    this._renderer.addClass(element, this.noneMatFieldCssClass);
                if (this.buttonContainerClass)
                    this._renderer.addClass(element, this.buttonContainerClass);
                this._renderer.insertBefore(parentElement, element, this.elementRef.nativeElement);
                this._renderer.appendChild(element, this.elementRef.nativeElement);
                this._removeElement = () => {
                    this._renderer.removeChild(parentElement, element);
                    this._renderer.insertBefore(parentElement, this.elementRef.nativeElement, nextElement);
                }
                if (this.buttonWrapper.htmlElement)
                    this._renderer.appendChild(element, this.buttonWrapper.htmlElement);
            }
            this._stateSubscription = this._stateObserverService.stateObservable(this.elementRef.nativeElement)
                .subscribe(e => {
                    this.buttonWrapper.set('readOnly', e.readonly);
                    this.disabled = e.disabled;
                });
        }
    }

    protected setupComponent(): void { };

    protected abstract onbuttonClick(e: T): void;

    private _destoryButton(): void {
        this._clickSubscription?.unsubscribe();
        this._stateSubscription?.unsubscribe();
        this._clickSubscription = undefined;
        this._stateSubscription = undefined;
        this.buttonWrapper.detach();
        this._removeElement();
    }
}