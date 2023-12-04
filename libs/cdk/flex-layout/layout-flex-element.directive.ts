import { NumberInput, coerceNumberProperty } from "@angular/cdk/coercion";
import { Directive, OnChanges, inject, ElementRef, Renderer2, Input, SimpleChanges, RendererStyleFlags2, HostBinding } from "@angular/core";
import { getProperCssValue } from "@ngx-nova/cdk/shared";

@Directive({
    selector: '[layout-flex-element]',
    standalone: true,
    inputs: ['flex-basis', 'flex-basis-xs', 'flex-basis-sm', 'flex-basis-md', 'flex-basis-lg', 'flex-basis-xl', 'flex-basis-sl'],
    host: { 'class': 'layout-flex-element' },
})
export class LayoutFlexElementDirective implements OnChanges {

    private _order?: number;
    private elementRef = inject(ElementRef);
    private renderer = inject(Renderer2);

    @HostBinding('style.order')
    @Input('flex-order')
    get order(): number | undefined { return this._order; }
    set order(value: NumberInput) {
        this._order = value == null ? undefined : coerceNumberProperty(value);
    }

    ngOnChanges(changes: SimpleChanges): void {
        const basis = Object.keys(changes).filter(k => k.startsWith('flex-basis'));
        if (basis?.length) {
            const el = this.elementRef.nativeElement;
            for (const bas of basis) {
                const cssBasis = getProperCssValue(changes[bas].currentValue);
                if (cssBasis)
                    this.renderer.setStyle(el, `--layout-${bas}`, cssBasis, RendererStyleFlags2.DashCase);
                else
                    this.renderer.removeStyle(el, `--layout-${bas}`, RendererStyleFlags2.DashCase);

            }
        }
    }
}