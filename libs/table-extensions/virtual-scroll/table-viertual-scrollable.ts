/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Directionality } from '@angular/cdk/bidi';
import { ListRange } from '@angular/cdk/collections';
import { Platform } from '@angular/cdk/platform';
import {
    CdkScrollable, CdkVirtualScrollable, CdkVirtualScrollableElement, CdkVirtualScrollViewport,
    ExtendedScrollToOptions, ScrollDispatcher, VIRTUAL_SCROLL_STRATEGY, VIRTUAL_SCROLLABLE, VirtualScrollStrategy
} from '@angular/cdk/scrolling';
import { CDK_TABLE, CdkTable } from '@angular/cdk/table';
import {
    ChangeDetectorRef, Directive, ElementRef, inject, Inject, NgZone, OnDestroy,
    OnInit,
    Optional, Output, Renderer2, Self
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { animationFrameScheduler, asapScheduler, auditTime, Observable, Observer, startWith, Subject, takeUntil } from 'rxjs';
import { ICdkTableVirtualScrollDataHandler } from './interfaces';
import { ResizeObservableService } from '@ngx-nova/cdk/observers';

const SCROLL_SCHEDULER = typeof requestAnimationFrame !== 'undefined' ? animationFrameScheduler : asapScheduler;

function rangesEqual(r1: ListRange, r2: ListRange): boolean {
    return r1.start == r2.start && r1.end == r2.end;
}

@Directive({
    selector: 'cdk-table[virtual-scroll], mat-table[virtual-scroll]',
    standalone: true,
    hostDirectives: [CdkVirtualScrollableElement],
    providers: [
        { provide: CdkVirtualScrollViewport, useExisting: CdkTableVirtualScrollable },
        {
            provide: CdkScrollable,
            useFactory: (
                virtualScrollable: CdkVirtualScrollable | null,
                viewport: CdkTableVirtualScrollable,
            ) => virtualScrollable || viewport,
            deps: [[new Optional(), new Inject(VIRTUAL_SCROLLABLE)], CdkTableVirtualScrollable],
        },
    ],
})
export class CdkTableVirtualScrollable extends CdkVirtualScrollable implements OnInit, OnDestroy {

    private _platform = inject(Platform);

    private _scrollwrapper: VirtualWrapperElementRef;
    private readonly _detachedSubject = new Subject<void>();
    private readonly _renderedRangeSubject = new Subject<ListRange>();
    protected resizeObservable = inject(ResizeObservableService);
    protected readonly sizeChangedStream;

    @Output()
    readonly scrolledIndexChange: Observable<number> = new Observable((observer: Observer<number>) =>
        this._scrollStrategy.scrolledIndexChange.subscribe(index =>
            Promise.resolve().then(() => this.ngZone.run(() => observer.next(index))),
        ),
    );

    /** A stream that emits whenever the rendered range changes. */
    readonly renderedRangeStream: Observable<ListRange> = this._renderedRangeSubject;

    private _totalContentSize = 0;

    /**
     * The CSS transform applied to the rendered subset of items so that they appear within the bounds
     * of the visible viewport.
     */
    private _renderedContentTransform: string = '';

    /** The currently rendered range of indices. */
    private _renderedRange: ListRange = { start: 0, end: 0 };

    /** The length of the data bound to this viewport (in number of items). */
    private _dataLength = 0;

    /** The size of the viewport (in pixels). */
    private _viewportSize = 0;

    /** the currently attached CdkVirtualScrollRepeater. */
    private _repeater: ICdkTableVirtualScrollDataHandler | null = null;

    /** The last rendered content offset that was set. */
    private _renderedContentOffset = 0;

    /**
     * Whether the last rendered content offset was to the end of the content (and therefore needs to
     * be rewritten as an offset to the start of the content).
     */
    private _renderedContentOffsetNeedsRewrite = false;

    /** Whether there is a pending change detection cycle. */
    private _isChangeDetectionPending = false;

    /** A list of functions to run after the next change detection cycle. */
    // eslint-disable-next-line @typescript-eslint/ban-types
    private _runAfterChangeDetection: Function[] = [];

    constructor(
        elementRef: ElementRef<HTMLElement>,
        private _changeDetectorRef: ChangeDetectorRef,
        ngZone: NgZone,
        scrollDispatcher: ScrollDispatcher,
        private renderer: Renderer2,
        @Self() @Inject(CDK_TABLE) _cdkTable: CdkTable<unknown>,
        @Optional() @Inject(VIRTUAL_SCROLL_STRATEGY) private _scrollStrategy: VirtualScrollStrategy,
        @Optional() dir: Directionality,
        @Optional() @Inject(VIRTUAL_SCROLLABLE) private scrollable: CdkVirtualScrollable,
    ) {
        super(createWrapper(renderer, _cdkTable), scrollDispatcher, ngZone, dir);

        this.sizeChangedStream = this.resizeObservable.heightResizeObservable(elementRef.nativeElement);
        //@ts-expect-error ngDevMode is not defined here
        if (!_scrollStrategy && (typeof ngDevMode === 'undefined' || ngDevMode)) {
            throw Error('Error: virtual-scroll cdk-table requires the "rowHeight" property to be set.');
        }

        this._scrollwrapper = this.elementRef as VirtualWrapperElementRef;
        this.sizeChangedStream.pipe(takeUntilDestroyed()).subscribe(() => this.checkViewportSize());

        if (!this.scrollable) {
            // No scrollable is provided, so the virtual-scroll-viewport needs to become a scrollable
            this.elementRef.nativeElement.classList.add('cdk-virtual-scrollable');
            this.scrollable = this;
        }
    }

    get _contentWrapper(): ElementRef<HTMLElement> { return this._scrollwrapper.contentWrapper; }

    set _totalContentHeight(value: string) {
        this.renderer.setStyle(this._scrollwrapper.scrollSpacer, 'height', value);
    }

    override ngOnInit() {
        // Scrolling depends on the element dimensions which we can't get during SSR.
        this._scrollwrapper.init();
        if (!this._platform.isBrowser) {
            return;
        }

        if (this.scrollable === this) {
            super.ngOnInit();
        }
        // It's still too early to measure the viewport at this point. Deferring with a promise allows
        // the Viewport to be rendered with the correct size before we measure. We run this outside the
        // zone to avoid causing more change detection cycles. We handle the change detection loop
        // ourselves instead.
        this.ngZone.runOutsideAngular(() =>
            Promise.resolve().then(() => {
                this._measureViewportSize();
                this._scrollStrategy.attach(this as never);

                this.scrollable
                    .elementScrolled()
                    .pipe(
                        // Start off with a fake scroll event so we properly detect our initial position.
                        startWith(null),
                        // Collect multiple events into one until the next animation frame. This way if
                        // there are multiple scroll events in the same frame we only need to recheck
                        // our layout once.
                        auditTime(0, SCROLL_SCHEDULER),
                        // Usually `elementScrolled` is completed when the scrollable is destroyed, but
                        // that may not be the case if a `CdkVirtualScrollableElement` is used so we have
                        // to unsubscribe here just in case.
                        takeUntil(this._destroyed),
                    )
                    .subscribe(() => this._scrollStrategy.onContentScrolled());

                this._markChangeDetectionNeeded();
            }),
        );
    }

    override ngOnDestroy() {
        this.detach();
        this._scrollStrategy.detach();

        // Complete all subjects
        this._renderedRangeSubject.complete();
        this._detachedSubject.complete();


        super.ngOnDestroy();
    }

    /** Attaches a `CdkVirtualScrollRepeater` to this viewport. */
    attach(repeater: ICdkTableVirtualScrollDataHandler) {
        //@ts-expect-error ngDevMode is not defined here
        if (this._repeater && (typeof ngDevMode === 'undefined' || ngDevMode)) {
            throw Error('CdkVirtualScrollViewport is already attached.');
        }

        // Subscribe to the data stream of the CdkVirtualForOf to keep track of when the data length
        // changes. Run outside the zone to avoid triggering change detection, since we're managing the
        // change detection loop ourselves.
        this.ngZone.runOutsideAngular(() => {
            this._repeater = repeater;
            this._repeater.dataLengthStream.pipe(takeUntil(this._detachedSubject)).subscribe(dataLength => {
                const newLength = dataLength;
                if (newLength !== this._dataLength) {
                    this._dataLength = newLength;
                    this._scrollStrategy.onDataLengthChanged();
                }
                this._doChangeDetection();
            });
        });
    }

    /** Detaches the current `CdkVirtualForOf`. */
    detach() {
        this._repeater = null;
        this._detachedSubject.next();
    }

    /** Gets the length of the data bound to this viewport (in number of items). */
    getDataLength(): number {
        return this._dataLength;
    }

    /** Gets the size of the viewport (in pixels). */
    getViewportSize(): number {
        return this._viewportSize;
    }

    /** Get the current rendered range of items. */
    getRenderedRange(): ListRange {
        return this._renderedRange;
    }

    measureBoundingClientRectWithScrollOffset(from: 'left' | 'top' | 'right' | 'bottom'): number {
        return this.getElementRef().nativeElement.getBoundingClientRect()[from];
    }

    /**
     * Sets the total size of all content (in pixels), including content that is not currently
     * rendered.
     */
    setTotalContentSize(size: number) {
        if (this._totalContentSize !== size) {
            this._totalContentSize = size;
            this._calculateSpacerSize();
            this._markChangeDetectionNeeded();
        }
    }

    /** Sets the currently rendered range of indices. */
    setRenderedRange(range: ListRange) {
        if (!rangesEqual(this._renderedRange, range)) {
            this._renderedRangeSubject.next((this._renderedRange = range));
            this._markChangeDetectionNeeded(() => this._scrollStrategy.onContentRendered());
        }
    }

    /**
     * Gets the offset from the start of the viewport to the start of the rendered data (in pixels).
     */
    getOffsetToRenderedContentStart(): number | null {
        return this._renderedContentOffsetNeedsRewrite ? null : this._renderedContentOffset;
    }

    /**
     * Sets the offset from the start of the viewport to either the start or end of the rendered data
     * (in pixels).
     */
    setRenderedContentOffset(offset: number, to: 'to-start' | 'to-end' = 'to-start') {

        let transform = `translateY(${Number(offset)}px)`;
        this._renderedContentOffset = offset;
        if (to === 'to-end') {
            transform += ` translateY(-100%)`;
            // The viewport should rewrite this as a `to-start` offset on the next render cycle. Otherwise
            // elements will appear to expand in the wrong direction (e.g. `mat-expansion-panel` would
            // expand upward).
            this._renderedContentOffsetNeedsRewrite = true;
        }
        if (this._renderedContentTransform != transform) {
            // We know this value is safe because we parse `offset` with `Number()` before passing it
            // into the string.
            this._renderedContentTransform = transform;
            this._markChangeDetectionNeeded(() => {
                if (this._renderedContentOffsetNeedsRewrite) {
                    this._renderedContentOffset -= this.measureRenderedContentSize();
                    this._renderedContentOffsetNeedsRewrite = false;
                    this.setRenderedContentOffset(this._renderedContentOffset);
                } else {
                    this._scrollStrategy.onRenderedOffsetChanged();
                }
            });
        }
    }

    /**
     * Scrolls to the given offset from the start of the viewport. Please note that this is not always
     * the same as setting `scrollTop` or `scrollLeft`. In a horizontal viewport with right-to-left
     * direction, this would be the equivalent of setting a fictional `scrollRight` property.
     * @param offset The offset to scroll to.
     * @param behavior The ScrollBehavior to use when scrolling. Default is behavior is `auto`.
     */
    scrollToOffset(offset: number, behavior: ScrollBehavior = 'auto') {
        const options: ExtendedScrollToOptions = { behavior };
        options.top = offset;
        this.scrollable.scrollTo(options);
    }

    /**
     * Scrolls to the offset for the given index.
     * @param index The index of the element to scroll to.
     * @param behavior The ScrollBehavior to use when scrolling. Default is behavior is `auto`.
     */
    scrollToIndex(index: number, behavior: ScrollBehavior = 'auto') {
        this._scrollStrategy.scrollToIndex(index, behavior);
    }

    /**
     * Gets the current scroll offset from the start of the scrollable (in pixels).
     * @param from The edge to measure the offset from. Defaults to 'top' in vertical mode and 'start'
     *     in horizontal mode.
     */
    override measureScrollOffset(from?: 'top' | 'left' | 'right' | 'bottom' | 'start' | 'end'): number {
        // This is to break the call cycle
        let measureScrollOffset: InstanceType<typeof CdkVirtualScrollable>['measureScrollOffset'];
        if (this.scrollable == this) {
            measureScrollOffset = (_from: NonNullable<typeof from>) => super.measureScrollOffset(_from);
        } else {
            measureScrollOffset = (_from: NonNullable<typeof from>) =>
                this.scrollable.measureScrollOffset(_from);
        }

        return Math.max(0, measureScrollOffset(from ?? 'top') - this.measureViewportOffset());
    }

    /**
     * Measures the offset of the viewport from the scrolling container
     * @param from The edge to measure from.
     */
    measureViewportOffset(from?: 'top' | 'left' | 'right' | 'bottom' | 'start' | 'end') {
        let fromRect: 'left' | 'top' | 'right' | 'bottom';
        const LEFT = 'left';
        const RIGHT = 'right';
        const isRtl = this.dir?.value == 'rtl';
        if (from == 'start') {
            fromRect = isRtl ? RIGHT : LEFT;
        } else if (from == 'end') {
            fromRect = isRtl ? LEFT : RIGHT;
        } else if (from) {
            fromRect = from;
        } else {
            fromRect = 'top';
        }

        const scrollerClientRect = this.scrollable.measureBoundingClientRectWithScrollOffset(fromRect);
        const viewportClientRect = this.elementRef.nativeElement.getBoundingClientRect()[fromRect];

        return viewportClientRect - scrollerClientRect;
    }

    /** Measure the combined size of all of the rendered items. */
    measureRenderedContentSize(): number {
        return this._contentWrapper.nativeElement.offsetHeight;
    }

    /**
     * Measure the total combined size of the given range. Throws if the range includes items that are
     * not rendered.
     */
    measureRangeSize(range: ListRange): number {
        if (!this._repeater) {
            return 0;
        }
        return this._repeater.measureRangeSize(range, 'vertical');
    }

    /** Update the viewport dimensions and re-render. */
    checkViewportSize() {
        // TODO: Cleanup later when add logic for handling content resize
        this._measureViewportSize();
        this._scrollStrategy.onDataLengthChanged();
    }

    /** Measure the viewport size. */
    private _measureViewportSize() {
        this._viewportSize = this.scrollable.measureViewportSize('vertical');
    }

    /** Queue up change detection to run. */
    // eslint-disable-next-line @typescript-eslint/ban-types
    private _markChangeDetectionNeeded(runAfter?: Function) {
        if (runAfter) {
            this._runAfterChangeDetection.push(runAfter);
        }

        // Use a Promise to batch together calls to `_doChangeDetection`. This way if we set a bunch of
        // properties sequentially we only have to run `_doChangeDetection` once at the end.
        if (!this._isChangeDetectionPending) {
            this._isChangeDetectionPending = true;
            this.ngZone.runOutsideAngular(() =>
                Promise.resolve().then(() => {
                    this._doChangeDetection();
                }),
            );
        }
    }

    /** Run change detection. */
    private _doChangeDetection() {
        this._isChangeDetectionPending = false;

        // Apply the content transform. The transform can't be set via an Angular binding because
        // bypassSecurityTrustStyle is banned in Google. However the value is safe, it's composed of
        // string literals, a variable that can only be 'X' or 'Y', and user input that is run through
        // the `Number` function first to coerce it to a numeric value.
        this._contentWrapper.nativeElement.style.transform = this._renderedContentTransform;
        // Apply changes to Angular bindings. Note: We must call `markForCheck` to run change detection
        // from the root, since the repeated items are content projected in. Calling `detectChanges`
        // instead does not properly check the projected content.
        this.ngZone.run(() => this._changeDetectorRef.markForCheck());

        const runAfterChangeDetection = this._runAfterChangeDetection;
        this._runAfterChangeDetection = [];
        for (const fn of runAfterChangeDetection) {
            fn();
        }
    }

    /** Calculates the `style.width` and `style.height` for the spacer element. */
    private _calculateSpacerSize() {
        this._totalContentHeight = `${this._totalContentSize}px`;
    }
}

function createWrapper(renderer: Renderer2, table: CdkTable<unknown>): VirtualWrapperElementRef {
    const viewport: HTMLDivElement = renderer.createElement("div");
    const contentWrapper: HTMLDivElement = renderer.createElement("div");
    const scrollSpacer: HTMLDivElement = renderer.createElement("div");

    renderer.addClass(viewport, 'table-virtual-scroll-viewport');
    renderer.addClass(viewport, 'cdk-virtual-scroll-orientation-vertical');
    renderer.addClass(contentWrapper, 'cdk-virtual-scroll-content-wrapper');
    renderer.addClass(scrollSpacer, 'cdk-virtual-scroll-spacer');

    renderer.appendChild(viewport, contentWrapper);
    renderer.appendChild(viewport, scrollSpacer);

    const init = () => {
        const _rowOutletNode = table._rowOutlet.elementRef.nativeElement;
        const parent = _rowOutletNode.parentNode;
        renderer.insertBefore(parent, viewport, _rowOutletNode);
        renderer.appendChild(contentWrapper, _rowOutletNode);
    }

    return new VirtualWrapperElementRef(viewport, new ElementRef(contentWrapper), scrollSpacer, init);
}

export class VirtualWrapperElementRef extends ElementRef<HTMLElement> {

    constructor(viewport: HTMLElement,
        public contentWrapper: ElementRef<HTMLElement>,
        public scrollSpacer: HTMLElement, public init: () => void) {
        super(viewport);
    }
}
