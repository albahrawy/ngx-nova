import { Directive, ElementRef, OnInit, Renderer2, inject } from "@angular/core";
import { TableSelectableDirective } from "./table.selection.directive";
import { RowDataDirective } from "../data/row-data.directive";

@Directive({
    selector: "mat-row, cdk-row",
    host: {
        '[class.selected]': 'isSelected'
    },
    standalone: true,
})
export class RowSelectableDirective implements OnInit {

    private _rowDataDirective = inject(RowDataDirective);
    private _elementRef: ElementRef<HTMLElement> = inject(ElementRef);
    private renderer = inject(Renderer2);
    private tableSelection = inject(TableSelectableDirective, { optional: true });

    ngOnInit(): void {
        if (this.tableSelection) {
            this.renderer.listen(this._elementRef.nativeElement, 'mousedown', (e) => this._selectFromEvent(e));
            this.renderer.listen(this._elementRef.nativeElement, 'keydown.space', (e) => this._selectFromEvent(e));
        }
    }

    private _selectFromEvent(e: Event): void {
        if (Array.from(this._elementRef.nativeElement.children).includes(e.target as HTMLElement))
            this._select();
    }

    get isSelected() {
        return this.canSelect() && (this.tableSelection?.isSelected(this._rowDataDirective.data) ?? false);
    }

    _select() {
        if (this.canSelect()) {
            this.tableSelection?.select(this._rowDataDirective.data!);
        }
    }

    canSelect() {
        const tableSelection = this.tableSelection?.selectionType;
        return !!tableSelection && tableSelection !== 'none' && !!this._rowDataDirective.data;
    }
}
