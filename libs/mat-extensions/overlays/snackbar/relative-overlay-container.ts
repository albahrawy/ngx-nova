import { Directionality } from '@angular/cdk/bidi';
import {
    Overlay, OverlayContainer, OverlayKeyboardDispatcher, OverlayOutsideClickDispatcher,
    OverlayPositionBuilder, ScrollStrategyOptions
} from '@angular/cdk/overlay';
import { DOCUMENT, Location } from '@angular/common';
import {
    ANIMATION_MODULE_TYPE, ComponentFactoryResolver, Inject, Injectable,
    Injector, NgZone, OnDestroy, Optional
} from '@angular/core';

type SnackBarContainerType = { container: HTMLElement, sticky: HTMLElement };

/** Container inside which all overlays will render. */
@Injectable({ providedIn: 'root' })
export class RelativeOverlayContainer extends OverlayContainer implements OnDestroy {
    private _relativeContainers: { primary: SnackBarContainerType, secondary: SnackBarContainerType } | null = null;
    private _lastChoosed: 'secondary' | 'primary' | null = null;
    /**
     * This method returns the overlay container element. It will lazily
     * create the element the first time it is called to facilitate using
     * the container in non-browser environments.
     * @returns the container element
     */

    public setCurrentContainerElement(element: HTMLElement | null): void {
        if (!this._relativeContainers)
            this._relativeContainers = { primary: this._createRelativeContainer(), secondary: this._createRelativeContainer() };

        if (element == null) {
            if (this._lastChoosed != null) {
                this._relativeContainers[this._lastChoosed].sticky.parentElement?.classList.remove('--overlay-relative-position');
                this._relativeContainers[this._lastChoosed].sticky.remove();
                this._lastChoosed = null;
            }
        } else {
            this._lastChoosed = this._lastChoosed === 'primary' ? 'secondary' : 'primary';
            element.insertBefore(this._relativeContainers[this._lastChoosed].sticky, element.firstChild);
            this._relativeContainers[this._lastChoosed].sticky.parentElement?.classList.add('--overlay-relative-position');
        }
    }

    override getContainerElement(): HTMLElement {
        if (this._lastChoosed != null)
            return this._relativeContainers![this._lastChoosed].container;
        else
            return super.getContainerElement();
    }

    /**
     * Create the overlay container element, which is simply a div
     * with the 'cdk-overlay-container' class on the document body.
     */

    protected _createRelativeContainer(): SnackBarContainerType {
        const container = this._document.createElement('div');
        container.classList.add('cdk-overlay-container');
        container.classList.add('cdk-overlay-container-relative');

        // const sticky = this._document.createElement('div');
        // sticky.classList.add('nova-overlay-container-sticky');
        // sticky.appendChild(container);
        return { container, sticky: container };
    }
}

@Injectable({ providedIn: 'root' })
export class NovaRelativeOverlay extends Overlay {

    private _novaOverlayContainer: RelativeOverlayContainer;

    constructor(
        /** Scrolling strategies that can be used when creating an overlay. */
        scrollStrategies: ScrollStrategyOptions,
        _overlayContainer: RelativeOverlayContainer,
        _componentFactoryResolver: ComponentFactoryResolver,
        _positionBuilder: OverlayPositionBuilder,
        _keyboardDispatcher: OverlayKeyboardDispatcher,
        _injector: Injector,
        _ngZone: NgZone,
        @Inject(DOCUMENT) _document: unknown,
        _directionality: Directionality,
        _location: Location,
        _outsideClickDispatcher: OverlayOutsideClickDispatcher,
        @Inject(ANIMATION_MODULE_TYPE) @Optional() _animationsModuleType?: string,
    ) {
        super(scrollStrategies, _overlayContainer, _componentFactoryResolver, _positionBuilder,
            _keyboardDispatcher, _injector, _ngZone, _document, _directionality, _location,
            _outsideClickDispatcher, _animationsModuleType);
        this._novaOverlayContainer = _overlayContainer;
    }

    attachElementToContainer(element: HTMLElement | null): void {
        this._novaOverlayContainer.setCurrentContainerElement(element);
    }
}