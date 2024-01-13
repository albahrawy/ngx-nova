/* eslint-disable @angular-eslint/no-input-rename */
/* eslint-disable @angular-eslint/no-output-rename */
import { ConnectedPosition, Overlay, OverlayConfig, OverlayRef, OverlaySizeConfig } from '@angular/cdk/overlay';
import { CdkPortal } from '@angular/cdk/portal';
import { ViewportRuler } from '@angular/cdk/scrolling';
import {
    Attribute, ChangeDetectorRef, Directive, ElementRef, EventEmitter, Input, Output, inject, numberAttribute
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_FORM_FIELD } from '@angular/material/form-field';
import { Observable, Subject, distinctUntilChanged, filter, map, take } from 'rxjs';

export type CloseReson = 'Escape' | 'BackDrop' | 'Toggle' | 'Value' | 'Manual';

@Directive()
export abstract class NovaDropdownOverlayBase {

    private _panelOpen = false;
    private readonly openedChange: EventEmitter<boolean> = new EventEmitter<boolean>();
    private _overlayRef?: OverlayRef;

    protected readonly _viewportRuler = inject(ViewportRuler);
    protected readonly _changeDetectorRef = inject(ChangeDetectorRef);
    protected readonly _parentFormField = inject(MAT_FORM_FIELD, { optional: true });
    protected readonly _elementRef = inject(ElementRef);
    protected readonly _overlay = inject(Overlay);

    readonly _panelDoneAnimatingStream = new Subject<string>();

    get panelOpen(): boolean { return this._panelOpen; }
    get panelTheme(): string { return this._parentFormField ? `mat-${this._parentFormField.color}` : ''; }

    @Input({ transform: (value: unknown) => numberAttribute(value, 0) }) tabIndex: number = 0;
    @Input() panelClass!: string | string[];
    @Input() panelWidth: string | number | null = 'auto';

    @Output('opened') readonly _openedStream: Observable<void> = this.openedChange.pipe(filter(o => o), map(() => { }));
    @Output('closed') readonly _closedStream: Observable<void> = this.openedChange.pipe(filter(o => !o), map(() => { }));

    protected abstract disabled: boolean;
    protected abstract portalTemplate: CdkPortal;
    protected abstract toggleTrigger: ElementRef;


    protected connectedPosition: ConnectedPosition[] = [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', panelClass: 'mat-mdc-select-panel-above' },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', panelClass: 'mat-mdc-select-panel-above' },
    ];

    protected _preferredOverlayOrigin?: ElementRef;

    constructor(@Attribute('tabindex') tabIndex: string) {
        this.tabIndex = parseInt(tabIndex) || 0;

        this._panelDoneAnimatingStream
            .pipe(distinctUntilChanged(), takeUntilDestroyed())
            .subscribe(() => {
                this.openedChange.emit(this.panelOpen);
                if (this.panelOpen) {
                    this.panelStateChanged();
                    this.onOpened();
                }
            });

        this._viewportRuler
            .change()
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                if (this.panelOpen) {
                    this._syncOverlaySize();
                    this._changeDetectorRef.detectChanges();
                }
            });
    }

    toggle(): void {
        this.panelOpen ? this.close('Toggle') : this.open();
    }

    open(): void {
        if (this._parentFormField) {
            this._preferredOverlayOrigin = this._parentFormField.getConnectedOverlayOrigin();
        }

        if (this._canOpen()) {
            this.openCore();
            this._changeDetectorRef.markForCheck();
        }
    }

    close(reason: CloseReson): void {
        if (this._panelOpen) {
            this._overlayRef?.detach();
            this._panelOpen = false;
            this._changeDetectorRef.markForCheck();
            this.onClosed(reason);
        }
        this.panelStateChanged();
    }

    focus(options?: FocusOptions): void {
        this._elementRef.nativeElement.focus(options);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onClosed(reason: CloseReson) { }
    protected onOpened() { }

    protected panelStateChanged() {
    }

    protected openCore() {
        this._panelOpen = true;
        this._overlayRef ??= this._overlay.create(this._getOverlayConfig());
        if (!this._overlayRef) {
            this._overlayRef = this._overlay.create(this._getOverlayConfig());
        }

        this._overlayRef.attach(this.portalTemplate);
        this._syncOverlaySize();
        this._overlayRef.backdropClick().pipe(take(1)).subscribe(() => { this.close('BackDrop'); });
    }

    private _getOverlayConfig(): OverlayConfig {
        const positionStrategy = this._overlay.position()
            .flexibleConnectedTo(this._preferredOverlayOrigin ?? this.toggleTrigger)
            .withPush(false)
            .withPositions(this.connectedPosition);

        const scrollStrategy = this._overlay.scrollStrategies.reposition();

        return new OverlayConfig({
            positionStrategy,
            scrollStrategy,
            hasBackdrop: true,
            panelClass: this.panelClass || '',
            backdropClass: 'cdk-overlay-transparent-backdrop'
        });
    }

    protected _syncOverlaySize() {
        if (!this._overlayRef) {
            return;
        }

        this._overlayRef.updateSize(this._getOverlaySize());
    }

    protected _canOpen(): boolean {
        return !this._panelOpen && !this.disabled;
    }

    protected _handleKeydown(event: KeyboardEvent): void {
        if (!this.disabled) {
            const keyCode = event.code;
            if (this.panelOpen) {
                if (keyCode === 'Escape' || keyCode === 'Esc') {
                    this.close('Escape');
                }
            } else {
                const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'].some(v => v === keyCode);
                const isOpenKey = keyCode === 'Enter' || keyCode === 'Space';
                const hasModifierKey = event.altKey || event.shiftKey || event.ctrlKey || event.metaKey;
                if ((isOpenKey && !hasModifierKey) || (event.altKey && isArrowKey)) {
                    event.preventDefault();
                    this.open();
                }
            }
        }
    }

    protected positioningSettled() { }

    protected _getOverlaySize(): OverlaySizeConfig {
        let width: string | number;
        if (this.panelWidth === 'auto') {
            const refToMeasure = this._preferredOverlayOrigin ?? this.toggleTrigger;
            width = refToMeasure.nativeElement.getBoundingClientRect().width;
        } else {
            width = this.panelWidth === null ? '' : this.panelWidth;
        }
        return { width };
    }
}