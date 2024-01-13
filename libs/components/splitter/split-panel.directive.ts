import { DestroyRef, Directive, ElementRef, Input, NgZone, OnDestroy, OnInit, Renderer2, booleanAttribute, inject } from '@angular/core';
import { NovaSplitComponent } from './split.component';
import { Nullable, toPositiveNumber } from '@ngx-nova/js-extensions';
import { ISplitPanelRef, SplitSize, SplitSizeInput } from './types';
import { filter, fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
    selector: 'nova-split-panel, [nova-split-panel]',
    exportAs: 'novaSplitPanel',
    standalone: true,
    host: {
        '[class.nova-split-hidden]': '!visible',
        '[class.nova-split-reachMaxSize]': '_reachMaxSize',
        '[class.nova-split-reachMinSize]': '_reachMinSize',
        'class': 'nova-split-panel'
    }
})
export class NovaSplitPanelDirective implements OnInit, OnDestroy {

    public elementRef = inject(ElementRef);
    private _ngZone = inject(NgZone);
    private _renderer = inject(Renderer2);
    private _splitter = inject(NovaSplitComponent);
    private _destroyRef = inject(DestroyRef);

    private _listeners: Array<() => void> = [];
    private _order: number | null = null;
    private _size: SplitSize = 'auto';
    private _minSize: number | null = null;
    private _maxSize: number | null = null;
    private _freezeSize = false;
    private _visible = true;
    private _overlayGuardRemoverFn: (() => void) | null = null;

    _reachMaxSize: boolean = false;
    _reachMinSize: boolean = false;

    @Input({ transform: booleanAttribute }) overlayGuard = false;

    @Input()
    get order(): number | null { return this._order; }
    set order(value: Nullable<number>) {
        value = value == null ? null : toPositiveNumber(value, 0);
        if (this._order !== value) {
            this._order = value;
            this._splitter.refreshOrders();
        }
    }

    @Input()
    get size(): SplitSize { return this._size; }
    set size(value: SplitSizeInput | 'auto') {
        value ??= 'auto';
        if (value != 'auto')
            value = toPositiveNumber(value);
        if (this._size !== value) {
            this._size = value;
            this._splitter.refreshSizes();
        }
    }

    @Input()
    get minSize(): number | null { return this._minSize; }
    set minSize(value: SplitSizeInput) {
        value = toPositiveNumber(value, null);
        if (this._minSize !== value) {
            this._minSize = value;
            this._splitter.refreshSizes();
        }
    }

    @Input()
    get maxSize(): number | null { return this._maxSize; }
    set maxSize(value: SplitSizeInput) {
        value = toPositiveNumber(value, null);
        if (this._maxSize !== value) {
            this._maxSize = value;
            this._splitter.refreshSizes();
        }
    }

    @Input({ transform: booleanAttribute })
    get freezeSize(): boolean { return this._freezeSize; }
    set freezeSize(value: boolean) {
        if (this._freezeSize !== value) {
            this._freezeSize = value;
            this._splitter.refreshSizes();
        }
    }

    @Input({ transform: booleanAttribute })
    get visible(): boolean { return this._visible; }
    set visible(value: boolean) {
        if (this._visible !== value) {
            this._visible = value;
            this._splitter._handleVisibilty(this);
        }
    }

    readonly renderRef: ISplitPanelRef = {
        order: 0,
        size: 0,
        minSize: null,
        maxSize: null,
        lastSize: null,
        linkedGutterNumber: 0,
        domOrder: 0
    }

    ngOnInit(): void {
        this._ngZone.runOutsideAngular(() => {
            fromEvent<TransitionEvent>(this.elementRef.nativeElement, 'transitionend')
                .pipe(takeUntilDestroyed(this._destroyRef), filter(e => e.propertyName === 'flex-basis'))
                .subscribe(() => this._splitter._emitTransition());
        })
    }

    private _addOverlayGuard(): void {
        if (this.overlayGuard) {
            const origPosition = getComputedStyle(this.elementRef.nativeElement).position;
            const needToSetPosition = origPosition !== 'relative';
            const overlayGuardDiv = this._renderer.createElement('div');
            this._renderer.addClass(overlayGuardDiv, 'overlay-guard');
            if (needToSetPosition)
                this._renderer.setStyle(this.elementRef.nativeElement, 'position', 'relative');
            this._renderer.appendChild(this.elementRef.nativeElement, overlayGuardDiv);
            this._overlayGuardRemoverFn = () => {
                if (needToSetPosition) {
                    if (origPosition !== 'static')
                        this._renderer.setStyle(this.elementRef.nativeElement, 'position', origPosition);
                    else
                        this._renderer.removeStyle(this.elementRef.nativeElement, 'position');
                }
                this._renderer.removeChild(this.elementRef.nativeElement, overlayGuardDiv)
            }
        }
    }

    private _removeOverlayGuard(): void {
        if (this._overlayGuardRemoverFn) {
            this._overlayGuardRemoverFn();
            this._overlayGuardRemoverFn = null;
        }
    }

    // public setStyleFlex(grow: number, shrink: number, basis: string, isMin: boolean, isMax: boolean): void {
    //     // Need 3 separated properties to work on IE11 (https://github.com/angular/flex-layout/issues/323)
    //     this.renderer.setStyle(this.elRef.nativeElement, 'flex-grow', grow)
    //     this.renderer.setStyle(this.elRef.nativeElement, 'flex-shrink', shrink)
    //     this.renderer.setStyle(this.elRef.nativeElement, 'flex-basis', basis)

    //     if (isMin === true) {
    //         this.renderer.addClass(this.elRef.nativeElement, 'as-min')
    //     } else {
    //         this.renderer.removeClass(this.elRef.nativeElement, 'as-min')
    //     }

    //     if (isMax === true) {
    //         this.renderer.addClass(this.elRef.nativeElement, 'as-max')
    //     } else {
    //         this.renderer.removeClass(this.elRef.nativeElement, 'as-max')
    //     }
    // }

    disableEvents(): void {
        this._ngZone.runOutsideAngular(() => {
            this._listeners.push(this._renderer.listen(this.elementRef.nativeElement, 'selectstart', () => false))
            this._listeners.push(this._renderer.listen(this.elementRef.nativeElement, 'dragstart', () => false))
        })
    }

    enableEvents(): void {
        while (this._listeners.length > 0)
            this._listeners.pop()?.();
    }

    ngOnDestroy(): void {
        this.enableEvents()
    }

    // public collapse(newSize = 0, gutter: 'left' | 'right' = 'right'): void {
    //     this.splitter.collapseArea(this, newSize, gutter)
    // }

    // public expand(): void {
    //     this.splitter.expandArea(this)
    // }
}