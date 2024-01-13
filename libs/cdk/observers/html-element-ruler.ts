import { Directive, ElementRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ResizeObservableService } from "./resize-observer.service";

@Directive({ standalone: true })
export class HtmlElementRuler {

    private _elementRef = inject(ElementRef);
    private _resizeService = inject(ResizeObservableService);
    private readonly _resizeObserver = this._resizeService
        .widthResizeObservable(this._elementRef.nativeElement)
        .pipe(takeUntilDestroyed());

    change() {
        return this._resizeObserver;
    }
}