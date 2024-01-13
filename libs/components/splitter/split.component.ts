import { Directionality } from '@angular/cdk/bidi';
import { CommonModule } from '@angular/common';
import {
    AfterContentInit,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ContentChildren,
    DestroyRef,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    OnDestroy,
    Output,
    QueryList,
    Renderer2,
    ViewEncapsulation,
    booleanAttribute,
    inject,
    numberAttribute
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { arraySort, arraySum, removeFromArray, toPositiveNumber } from '@ngx-nova/js-extensions';
import { Observable, Observer, Subject } from 'rxjs';
import { NovaSplitPanelDirective } from './split-panel.directive';
import { ISplitPanelRef, ISplitter, SplitOrientation, SplitSize, SplitSizeInput, SplitterResizeEvent } from './types';
import { INovaSplitSnapshot, IPanelDragRef, Writable, getElementPixelSize, getGutterSideAbsorptionCapacity, getKeyboardEndpoint, getPanelMaxSize, getPanelMinSize, getPointFromEvent, updateAreaSize } from './internals';

const DEFAULT_GUTTER_SIZE = 8;

@Component({
    selector: 'nova-splitter',
    exportAs: 'novaSplitter',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule, NovaSplitPanelDirective,
        // SplitGutterDragHandleDirective,
        // SplitGutterExcludeFromDragDirective
    ],
    styleUrls: [`./split.component.scss`],
    templateUrl: './split.component.html',
    host: {
        'class': 'nova-splitter',
        '[class.nova-split-horizontal]': 'orientation==="horizontal"',
        '[class.nova-split-vertical]': 'orientation==="vertical"',
        '[class.nova-split-transition]': 'enableTransition',
        '[class.nova-split-disabled]': 'disabled',
        '[class.nova-split-dragging]': '_isResizing'
    }
})
export class NovaSplitComponent implements AfterViewInit, AfterContentInit, OnDestroy {

    private _destroyRef = inject(DestroyRef);
    private _direction = inject(Directionality);
    private _ngZone = inject(NgZone);
    private _elementRef: ElementRef<HTMLElement> = inject(ElementRef);
    private _renderer = inject(Renderer2);
    private _cdRef = inject(ChangeDetectorRef);

    private hiddenPanels: Array<NovaSplitPanelDirective> = [];

    protected visiblePanels: Array<NovaSplitPanelDirective> = [];
    protected _activeRef: { start: number | null, end: number | null, gutterIndex: number | null } = { start: null, end: null, gutterIndex: null };

    private _transitionSubject = new Subject<void>();
    private _initialized = false;
    private _orientation: SplitOrientation = 'horizontal';
    //    private _usePixels = false;
    private _gutterSize = DEFAULT_GUTTER_SIZE;
    private _gutterStep = 1;
    private _guttersCount = 0;
    private _documentDragListeners: Array<() => void> = [];
    private _isResizing = false;
    private _isWaitingClear = false;
    private _isWaitingInitialMove = false;

    @Output()
    readonly transitionEnd: Observable<ISplitter> = new Observable((observer: Observer<ISplitter>) =>
        this._transitionSubject.subscribe(() =>
            Promise.resolve().then(() => this._ngZone.run(() => observer.next(({ getPanelSizes: () => this.getPanelSizes() })))),
        ),
    );

    @Output() resizeFinish = new EventEmitter<SplitterResizeEvent>();

    @Output() resizeBegin = new EventEmitter<SplitterResizeEvent>();

    @Input({ transform: numberAttribute })
    get gutterStep(): number { return this._gutterStep; }
    set gutterStep(value: number) { this._gutterStep = toPositiveNumber(value, 1); }

    @Input()
    get orientation(): SplitOrientation { return this._orientation; }
    set orientation(value: SplitOrientation) {
        this._orientation = value;
        this.refresh(false, false);
    }

    // @Input({ transform: booleanAttribute })
    // get usePixels(): boolean { return this._usePixels; }
    // set usePixels(value: boolean) {
    //     this._usePixels = value;
    //     this.refreshSizes();
    // }

    @Input()
    get gutterSize(): number { return this._gutterSize; }
    set gutterSize(value: SplitSizeInput) {
        this._gutterSize = toPositiveNumber(value, DEFAULT_GUTTER_SIZE);
        this.refreshSizes();
    }

    @Input({ transform: booleanAttribute }) overlapDrag = false;
    @Input({ transform: booleanAttribute }) enableTransition = true;
    @Input({ transform: booleanAttribute }) disabled = false;
    @Input({ transform: booleanAttribute }) collapseByDblClick = true;

    @ContentChildren(NovaSplitPanelDirective) _panels?: QueryList<NovaSplitPanelDirective>;

    getPanelSizes(): Array<SplitSize> {
        return arraySort(this.visiblePanels.slice(), p => p.renderRef.domOrder).map(p => p.renderRef.size);
    }

    refresh(force = false, recalculate = true) {
        if (!force && !this._initialized)
            return;
        if (recalculate) {
            this.refreshOrders(force);
            this.refreshSizes(force);
        } else {
            this._cdRef.markForCheck();
        }
    }
    //TODO: handle freezSize and min and max
    refreshSizes(force = false) {
        if (!force && !this._initialized)
            return;

        this._stopResizing();
        const sizedPanel = this.visiblePanels.filter(p => p.size !== 'auto');
        let total = arraySum(sizedPanel, p => p.size);
        const autoPanels = this.visiblePanels.length - sizedPanel.length;
        const remaining = 100 - total;
        let autoSize = 0;
        let factor = 1;
        if (remaining < 0) {
            factor = 1 + (remaining / total);
            total = Math.ceil(factor * total);
        }
        if (remaining > 0) {
            if (autoPanels > 0) {
                autoSize = remaining / autoPanels;
            } else {
                factor = 1 + (remaining / total);
            }
        } else if (autoPanels > 0) {
            const autoFactor = autoPanels / (this.visiblePanels.length * 2);
            autoSize = (autoFactor * total) / autoPanels;
            factor *= (1 - autoFactor);
        }

        this.visiblePanels.forEach((panel) => {
            const renderRef = panel.renderRef as Writable<ISplitPanelRef>;
            renderRef.size = panel.size === 'auto'
                ? autoPanels === 1
                    ? 'auto'
                    : autoSize
                : factor * panel.size;
            renderRef.minSize = getPanelMinSize(panel);
            renderRef.maxSize = getPanelMaxSize(panel);
        })

        this._setSizeCss();
    }

    refreshOrders(force = false) {
        if (!force && !this._initialized)
            return;
        if (this.visiblePanels.length == 3)
            console.log("before", this.visiblePanels.map(p => ({ order: p.order, domOrder: p.renderRef.domOrder })));
        this.visiblePanels.sort((a, b) => {
            const orderA = a.order ?? Infinity;
            const orderB = b.order ?? Infinity;

            if (orderA === orderB)
                return a.renderRef.domOrder - b.renderRef.domOrder;
            if (orderB === Infinity)
                return orderA - b.renderRef.domOrder || -1;
            if (orderA === Infinity) {
                return a.renderRef.domOrder - orderB || 1;
            }
            return orderA - orderB;
        });
        if (this.visiblePanels.length == 3)
            console.log("after", this.visiblePanels.map(p => ({ order: p.order, domOrder: p.renderRef.domOrder })));

        this.visiblePanels.forEach((panel, i) => {
            (panel.renderRef as Writable<ISplitPanelRef>).order = i * 2;
            this._renderer.setStyle(panel.elementRef.nativeElement, 'order', panel.renderRef.order);
        })
    }

    collapsePanel(panel: NovaSplitPanelDirective | number, collapseSize: number = 0): void {
        const reqPanel = typeof panel === 'number' ? this.visiblePanels.at(panel) : this.visiblePanels.find(p => p === panel);
        if (reqPanel === undefined || !reqPanel.visible) {
            return
        }

        const _renderRef: Writable<ISplitPanelRef> = reqPanel.renderRef;
        if (!_renderRef.lastSize) {
            _renderRef.lastSize = _renderRef.size;
        }
        reqPanel.size = collapseSize;
        //this._setSizeCss();
    }

    expandPanel(panel: NovaSplitPanelDirective | number): void {
        const reqPanel = typeof panel === 'number' ? this.visiblePanels.at(panel) : this.visiblePanels.find(p => p === panel);
        if (reqPanel === undefined || !reqPanel.renderRef.lastSize) {
            return
        }
        const renderRef = reqPanel.renderRef as Writable<ISplitPanelRef>;
        reqPanel.size = renderRef.lastSize!;
        renderRef.lastSize = null;
        //this._setSizeCss();
    }

    ngAfterViewInit(): void {
        this._ngZone.runOutsideAngular(() => {
            setTimeout(() => this._renderer.addClass(this._elementRef.nativeElement, 'nova-split-initialized'))
        })
    }

    ngAfterContentInit(): void {
        this._initialized = true;
        this._buildRefs();
        this._panels?.changes.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this._buildRefs());
    }

    ngOnDestroy(): void {
        while (this._documentDragListeners.length > 0)
            this._documentDragListeners.pop()?.();
    }

    /** @internal */
    _emitTransition(): void {
        this._transitionSubject.next();
    }

    /** @internal */
    _handleVisibilty(panel: NovaSplitPanelDirective) {
        if (!this._initialized)
            return;
        let changed = false;
        if (panel.visible) {
            const removed = removeFromArray(this.hiddenPanels, panel);
            if (removed >= 0) {
                panel.size = panel.renderRef.size;
                this.visiblePanels.push(panel);
                changed = true;
            }
        } else {
            const removed = removeFromArray(this.visiblePanels, panel);
            if (removed >= 0) {
                this.hiddenPanels.push(panel);
                changed = true;
            }
        }
        if (changed)
            this.refresh();
    }

    protected _dblClickCollapse(event: MouseEvent | TouchEvent, panel: NovaSplitPanelDirective) {
        if (event instanceof MouseEvent)
            event.preventDefault();
        event.stopPropagation();
        if (this.collapseByDblClick) {
            if (panel.renderRef.lastSize == null)
                this.collapsePanel(panel);
            else
                this.expandPanel(panel);
        }
    }


    protected _mouseResize(event: MouseEvent | TouchEvent, gutterOrder: number, gutterIndex: number): void {
        if (event instanceof MouseEvent)
            event.preventDefault();
        event.stopPropagation();

        if (this.disabled || this._isWaitingClear)
            return;
        this._activeRef.start = getPointFromEvent(event, this.orientation);
        const snapShot = this._createSnapShot(gutterOrder, gutterIndex);

        this._documentDragListeners.push(this._renderer.listen('document', 'mouseup', event => this._stopResizing(snapShot, event)));
        this._documentDragListeners.push(this._renderer.listen('document', 'touchend', event => this._stopResizing(snapShot, event)));
        this._documentDragListeners.push(this._renderer.listen('document', 'touchcancel', event => this._stopResizing(snapShot, event)));

        this._ngZone.runOutsideAngular(() => {
            this._documentDragListeners.push(this._renderer.listen('document', 'mousemove', (event) => this._mouseMove(event, snapShot)));
            this._documentDragListeners.push(this._renderer.listen('document', 'touchmove', (event) => this._mouseMove(event, snapShot)));
        })

        this._startResizing();
    }

    protected _KeyboardResize(event: KeyboardEvent, gutterOrder: number, gutterIndex: number) {
        event.preventDefault();
        event.stopPropagation();

        if (this.disabled === true || this._isWaitingClear === true) {
            return
        }

        const endPoint = getKeyboardEndpoint(event, this.orientation, this.gutterStep);
        if (endPoint === null) {
            return
        }
        this._activeRef.end = endPoint;
        this._activeRef.start = getPointFromEvent(event, this.orientation);

        this._startResizing();
        const snapshot = this._createSnapShot(gutterOrder, gutterIndex);
        this.drag(snapshot, event);
        this._stopResizing(snapshot, event);
    }
    private _createSnapShot(gutterOrder: number, gutterIndex: number): INovaSplitSnapshot {
        const snapshot: INovaSplitSnapshot = {
            gutterIndex,
            lastOffset: 0,
            totalSizePixel: getElementPixelSize(this._elementRef, this.orientation) - this._guttersCount * this.gutterSize,
            totalSizePercent: 100,
            panelsBefore: [],
            panelsAfter: [],
        }

        this.visiblePanels.forEach((panel) => {
            const areaSnapshot: IPanelDragRef = {
                panel,
                startSize: panel.renderRef.size,
                startSizeInPixels: getElementPixelSize(panel.elementRef, this.orientation)
            }

            if (panel.renderRef.order < gutterOrder) {
                if (this.overlapDrag)
                    snapshot.panelsBefore.unshift(areaSnapshot)
                else
                    snapshot.panelsBefore = [areaSnapshot]
            } else if (panel.renderRef.order > gutterOrder) {
                if (this.overlapDrag) {
                    snapshot.panelsAfter.push(areaSnapshot)
                } else {
                    if (snapshot.panelsAfter.length === 0)
                        snapshot.panelsAfter = [areaSnapshot]
                }
            }
        });

        if (!this.overlapDrag) {
            const _panelBefore = snapshot.panelsBefore[0].panel;
            const _panelAfter = snapshot.panelsAfter[0].panel;

            if (_panelBefore.renderRef.size === 'auto' || _panelAfter.renderRef.size === 'auto') {
                snapshot.totalSizePercent = 100 - arraySum(this.visiblePanels, panel => panel !== _panelBefore && panel !== _panelAfter ? panel.renderRef.size : 0);
            } else {
                snapshot.totalSizePercent = arraySum([...snapshot.panelsBefore, ...snapshot.panelsAfter], s => s.startSize);
            }
        }

        return snapshot;
    }

    private _buildRefs() {
        const _visiblePanels: NovaSplitPanelDirective[] = [];
        const _hiddenPanels: NovaSplitPanelDirective[] = [];
        this._panels?.forEach((p, i) => {
            (p.renderRef as Writable<ISplitPanelRef>).domOrder = i;
            if (p.visible)
                _visiblePanels.push(p);
            else
                _hiddenPanels.push(p);
        });
        this.visiblePanels = _visiblePanels;
        this.hiddenPanels = _hiddenPanels;
        this._guttersCount = Math.max(0, this.visiblePanels.length - 1);
        this.refresh(true);
    }

    private _setSizeCss() {
        if (this.visiblePanels.length === 1) {
            this._setPanelFlex(this.visiblePanels[0], 0, 0, `100%`);
        } else {
            const sumGutterSize = this._guttersCount * this.gutterSize;
            this.visiblePanels.forEach((panel) => {
                if (panel.renderRef.size === 'auto') {
                    this._setPanelFlex(panel, 1, 1, `auto`);
                } else {
                    this._setPanelFlex(panel, 0, 0,
                        `calc( ${panel.renderRef.size}% - ${(panel.renderRef.size / 100) * sumGutterSize}px )`,
                        panel.renderRef.minSize !== null && panel.renderRef.minSize === panel.renderRef.size,
                        panel.renderRef.maxSize !== null && panel.renderRef.maxSize === panel.renderRef.size,
                    )
                }
            })
        }
        this._cdRef.markForCheck();
    }

    private _setPanelFlex(panel: NovaSplitPanelDirective, grow: number, shrink: number, basis: string, isMin = false, isMax = false) {
        this._renderer.setStyle(panel.elementRef.nativeElement, 'flex', `${grow} ${shrink} ${basis}`);
        panel._reachMaxSize = isMax;
        panel._reachMinSize = isMin;
    }

    private _mouseMove(event: MouseEvent | TouchEvent, snapShot: INovaSplitSnapshot): boolean | void {
        if (event instanceof MouseEvent)
            event.preventDefault();
        event.stopPropagation();

        if (this._isResizing === false)
            return;

        this._activeRef.end = getPointFromEvent(event, this.orientation);
        this.drag(snapShot, event);
    }

    private drag(snapshot: INovaSplitSnapshot, event: MouseEvent | TouchEvent | KeyboardEvent) {
        if (!this._activeRef.start || !this._activeRef.end)
            return;
        if (this._isWaitingInitialMove) {
            if (this._activeRef.start !== this._activeRef.end) {
                this._ngZone.run(() => {
                    this._isWaitingInitialMove = false;

                    //this._renderer.addClass(this.elRef.nativeElement, 'as-dragging')
                    this._activeRef.gutterIndex = snapshot.gutterIndex;
                    this._cdRef.markForCheck();
                    this.resizeBegin.emit({ getPanelSizes: () => this.getPanelSizes(), event, gutterIndex: snapshot?.gutterIndex });

                })
            } else {
                return
            }
        }

        // Calculate steppedOffset

        let offset = this._activeRef.start - this._activeRef.end;
        // RTL requires negative offset only in horizontal mode as in vertical
        // RTL has no effect on drag direction.
        if (this._direction.value === 'rtl' && this.orientation === 'horizontal')
            offset = -offset;

        const steppedOffset = Math.round(offset / this.gutterStep) * this.gutterStep;

        if (steppedOffset === snapshot.lastOffset)
            return;

        snapshot.lastOffset = steppedOffset;

        // Need to know if each gutter side areas could reacts to steppedOffset

        let areasBefore = getGutterSideAbsorptionCapacity(
            snapshot.panelsBefore,
            -steppedOffset,
            snapshot.totalSizePixel,
        )
        let areasAfter = getGutterSideAbsorptionCapacity(
            snapshot.panelsAfter,
            steppedOffset,
            snapshot.totalSizePixel,
        )

        // Each gutter side areas can't absorb all offset
        if (areasBefore.remain !== 0 && areasAfter.remain !== 0) {
            if (Math.abs(areasBefore.remain) > Math.abs(areasAfter.remain)) {
                areasAfter = getGutterSideAbsorptionCapacity(
                    snapshot.panelsAfter,
                    steppedOffset + areasBefore.remain,
                    snapshot.totalSizePixel,
                );
            } else if (Math.abs(areasBefore.remain) !== Math.abs(areasAfter.remain)) {
                areasBefore = getGutterSideAbsorptionCapacity(
                    snapshot.panelsBefore,
                    -(steppedOffset - areasAfter.remain),
                    snapshot.totalSizePixel,
                );
            }
        } else if (areasBefore.remain !== 0) {
            // Areas before gutter can't absorbs all offset > need to recalculate sizes for areas after gutter.
            areasAfter = getGutterSideAbsorptionCapacity(
                snapshot.panelsAfter,
                steppedOffset + areasBefore.remain,
                snapshot.totalSizePixel,
            );
        } else if (areasAfter.remain !== 0) {
            // Areas after gutter can't absorbs all offset > need to recalculate sizes for areas before gutter.
            areasBefore = getGutterSideAbsorptionCapacity(
                snapshot.panelsBefore,
                -(steppedOffset - areasAfter.remain),
                snapshot.totalSizePixel,
            );
        }

        // Hack because of browser messing up with sizes using calc(X% - Ypx) -> el.getBoundingClientRect()
        // If not there, playing with gutters makes total going down to 99.99875% then 99.99286%, 99.98986%,..
        const all = [...areasBefore.list, ...areasAfter.list];
        const wildcardArea = all.find((a) => a.percentAfterAbsorption === 'auto');
        // In case we have a wildcard area - always align the percents on the wildcard area.
        const areaToReset =
            wildcardArea ??
            all.find(
                (a) =>
                    a.percentAfterAbsorption !== 0 &&
                    a.percentAfterAbsorption !== a.areaSnapshot.panel.renderRef.minSize &&
                    a.percentAfterAbsorption !== a.areaSnapshot.panel.renderRef.maxSize,
            )

        if (areaToReset) {
            areaToReset.percentAfterAbsorption =
                snapshot.totalSizePercent -
                all.filter((a) => a !== areaToReset).reduce((total, a) => total + (a.percentAfterAbsorption as number), 0);
        }

        // Now we know areas could absorb steppedOffset, time to really update sizes

        areasBefore.list.forEach((item) => updateAreaSize(item));
        areasAfter.list.forEach((item) => updateAreaSize(item));

        this._setSizeCss();
        //this.notify('progress', snapshot.gutterNum)
    }

    private _startResizing() {
        this.visiblePanels.forEach((panel) => panel.disableEvents());

        this._isResizing = true;
        this._isWaitingInitialMove = true;
    }

    private _stopResizing(snapshot?: INovaSplitSnapshot, event?: TouchEvent | MouseEvent | KeyboardEvent) {
        if (event instanceof MouseEvent)
            event?.preventDefault();
        event?.stopPropagation();

        if (this._isResizing === false)
            return;

        this.visiblePanels.forEach((panel) => panel.enableEvents());

        while (this._documentDragListeners.length > 0)
            this._documentDragListeners.pop()?.();

        this._isResizing = false;

        // If moved from starting point, notify end
        if (!this._isWaitingInitialMove && snapshot) {
            this.resizeFinish.emit({ getPanelSizes: () => this.getPanelSizes(), event, gutterIndex: snapshot?.gutterIndex });
        }

        this._activeRef.gutterIndex = null;
        this._cdRef.markForCheck();

        this._isWaitingClear = true;

        this._ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                this._activeRef.start = null;
                this._activeRef.end = null;
                this._isWaitingClear = false;
            });
        });
    }
}