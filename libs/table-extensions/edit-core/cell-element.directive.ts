import { Directive, ElementRef, inject } from "@angular/core";

@Directive({
    selector: 'cdk-cell,mat-cell',
    standalone: true
})
export class TableCellDirective {
    private elementRef = inject(ElementRef);
    cellElement: HTMLElement = this.elementRef.nativeElement;
}