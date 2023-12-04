import { Directive, ElementRef, OnChanges, OnDestroy, OnInit, Renderer2, RendererStyleFlags2, SimpleChanges, inject } from "@angular/core";
import { getCssSizeBreakpoint, getProperCssValue } from "@ngx-nova/cdk/shared";

@Directive({
    selector: '[layout-flex]',
    host: { 'class': 'layout-flex-container' },
    inputs: ['flex-gap', 'flex-gap-xs', 'flex-gap-sm', 'flex-gap-md', 'flex-gap-lg', 'flex-gap-xl', 'flex-gap-sl'],
    standalone: true
})
export class LayoutFlexDirective implements OnChanges, OnInit, OnDestroy {
    private _resizeObserver?: ResizeObserver;
    private _currentSizeClass?: string;
    private elementRef = inject(ElementRef);
    private renderer = inject(Renderer2);

    ngOnChanges(changes: SimpleChanges): void {
        const gaps = Object.keys(changes).filter(k => k.startsWith('flex-gap'));
        if (gaps?.length) {
            for (const gap of gaps) {
                this._applyGaps(gap, changes[gap].currentValue);
            }
        }
    }

    ngOnInit(): void {
        this._resizeObserver = new ResizeObserver(e => this._applySizeClass(e?.[0]?.borderBoxSize?.[0].inlineSize));
        this._resizeObserver.observe(this.elementRef.nativeElement, { box: 'border-box' });
    }

    ngOnDestroy(): void {
        this._resizeObserver?.disconnect();
    }

    private _applySizeClass(width?: number) {
        const breakpoint = getCssSizeBreakpoint(width);
        const el = this.elementRef.nativeElement;
        if (breakpoint) {
            const cssClass = `layout-flex-container-${breakpoint}`;
            if (cssClass !== this._currentSizeClass) {
                this.renderer.addClass(el, cssClass);
                this._updateCssClassReference(cssClass);
            }
        } else {
            this._updateCssClassReference();
        }
    }

    private _updateCssClassReference(newClass?: string) {
        if (this._currentSizeClass)
            this.renderer.removeClass(this.elementRef.nativeElement, this._currentSizeClass);
        this._currentSizeClass = newClass;
    }

    private _applyGaps(key: string, gap?: string | number) {
        const cssGap = typeof gap === 'number' ?
            gap + '%' :
            typeof gap === 'string' ?
                gap.split(' ').map(g => g.trim()).map(g => getProperCssValue(g)).slice(0, 2).join(' ').trim()
                : undefined;
        const el = this.elementRef.nativeElement;

        if (cssGap)
            this.renderer.setStyle(el, `--layout-${key}`, cssGap, RendererStyleFlags2.DashCase);
        else
            this.renderer.removeStyle(el, `--layout-${key}`, RendererStyleFlags2.DashCase);
    }
}
