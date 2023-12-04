import { Directive, ViewContainerRef } from "@angular/core";

@Directive({
    selector: '[nova-outlet]',
    exportAs: 'novaOutlet',
    standalone: true
})
export class NovaOutletDirective {
    constructor(public viewContainerRef: ViewContainerRef) { }
}