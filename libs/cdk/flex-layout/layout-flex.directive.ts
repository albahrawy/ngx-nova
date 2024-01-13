import { Directive, ElementRef, HostBinding, Input, OnChanges, SimpleChanges, WritableSignal, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { getCssSizeBreakpoint, getProperCssValue } from "@ngx-nova/cdk/shared";
import { ResizeObservableService } from "../observers";

@Directive({
    selector: '[layout-flex]',
    host: {
        'class': 'layout-flex-container',
        '[class.--has-flex-gap]': 'hasGap()',
        '[attr.layout-flex-container]': '_currentBreakpoint()',
        '[style.--layout-flex-gap]': 'gaps["flex-gap"]()',
        '[style.--layout-flex-gap-xs]': 'gaps["flex-gap-xs"]()',
        '[style.--layout-flex-gap-sm]': 'gaps["flex-gap-sm"]()',
        '[style.--layout-flex-gap-md]': 'gaps["flex-gap-md"]()',
        '[style.--layout-flex-gap-lg]': 'gaps["flex-gap-lg"]()',
        '[style.--layout-flex-gap-xl]': 'gaps["flex-gap-xl"]()',
        '[style.--layout-flex-gap-sl]': 'gaps["flex-gap-sl"]()',
    },
    inputs: ['flex-gap', 'flex-gap-xs', 'flex-gap-sm', 'flex-gap-md', 'flex-gap-lg', 'flex-gap-xl', 'flex-gap-sl'],
    standalone: true
})
export class LayoutFlexDirective implements OnChanges {

    private _resizeObserverService = inject(ResizeObservableService);
    private elementRef = inject(ElementRef);
    private _widthChanges = toSignal(this._resizeObserverService.widthResizeObservable(this.elementRef.nativeElement));

    private gaps: Record<string, WritableSignal<string | null>> = {
        'flex-gap': signal(null),
        'flex-gap-xs': signal(null),
        'flex-gap-sm': signal(null),
        'flex-gap-md': signal(null),
        'flex-gap-lg': signal(null),
        'flex-gap-xl': signal(null),
        'flex-gap-sl': signal(null)
    };

    private hasGap = computed(() => Object.keys(this.gaps).some(k => this.gaps[k]()));
    private _currentBreakpoint = computed(() => getCssSizeBreakpoint(this._widthChanges()));

    @HostBinding('attr.layout-flex')
    @Input('layout-flex') flexLayout: string = 'row wrap';

    @HostBinding('class.--flex-limit')
    @Input() flexLimit: boolean = true;

    ngOnChanges(changes: SimpleChanges): void {
        const gaps = Object.keys(changes).filter(k => k.startsWith('flex-gap'));
        if (gaps?.length) {
            for (const gap of gaps) {
                this._applyGaps(gap, changes[gap].currentValue);
            }
        }
    }

    private _applyGaps(key: string, gap?: string | number) {
        const cssGap = typeof gap === 'number' ?
            gap + '%' :
            typeof gap === 'string' ?
                gap.split(' ').slice(0, 2).map(g => g.trim()).map(g => getProperCssValue(g)).join(' ').trim()
                : null;
        this.gaps[key].set(cssGap);
    }
}
