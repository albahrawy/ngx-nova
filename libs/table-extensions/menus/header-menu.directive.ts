import { Directive, ElementRef, OnInit, Renderer2, inject } from '@angular/core';

@Directive({
    selector: 'mat-header-cell[contextMenu], cdk-header-cell[contextMenu]',
    standalone: true,
})
export class TableHeaderMenu implements OnInit {

    private elementRef: ElementRef<HTMLElement> = inject(ElementRef);
    private renderer = inject(Renderer2);
    ngOnInit(): void {
        const span = this.renderer.createElement('span');
        this.renderer.addClass(span, 'table-header-menu-span');
        this.elementRef.nativeElement.appendChild(span);
    }
}