import { SelectionModel } from "@angular/cdk/collections";
import { Directive, Input, OnChanges, SimpleChanges, inject } from "@angular/core";
import { ISelectionChangingArgs, SelectionType } from "./types";
import { CdkTableDataSourceDirective } from "@ngx-nova/table-extensions/data";

@Directive({
    selector: "mat-table[selectable],cdk-table[selectable]",
    host: {
        '[class.--selectable]': 'selectionType!="none"'
    },
    standalone: true,
})
export class TableSelectableDirective<T> implements OnChanges {
    //TODO: handle selection after data changed
    private _selection = new SelectionModel<T>(false, []);
    private readonly dataSourceDirective = inject(CdkTableDataSourceDirective, { optional: true });


    @Input("selectable") selectionType: SelectionType = 'none';

    @Input() selectionPredicate?: (args: ISelectionChangingArgs<T>) => boolean;

    ngOnChanges(changes: SimpleChanges): void {
        if ('selectionType' in changes)
            this._handleSelectionType();
    }

    select(row: T) {
        if (this.isAllowed(row, 'select')) {
            return this._selection.select(row);
        }
        return false;
    }

    deselect(row: T) {
        if (this.isAllowed(row, 'deselect'))
            return this._selection.deselect(row);
        return false;
    }

    toggle(rowData: T) {
        return this._selection.isSelected(rowData) ? this.deselect(rowData) : this.select(rowData);
    }

    isAllSelected() {
        return this._selection.selected.length > 0 && this._selection.selected.length === this._getData().length;
    }

    isSelected(rowData?: T) {
        return !!rowData && this._selection.isSelected(rowData);
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    toggleAllRows() {
        if (!this._selection.isMultipleSelection())
            return;
        if (this.isAllSelected()) {
            this._selection.clear();
            return;
        }
        if (this.selectionPredicate)
            this._selection.select(...this._getData().filter(d => this.isAllowed(d, 'select')));
        else
            this._selection.select(...this._getData());
    }

    isAllowed(rowData: T, type: 'select' | 'deselect'): boolean {
        if (typeof this.selectionPredicate === 'function') {
            const args = {
                allData: this._getData(),
                selected: this._selection.selected,
                rowData, type
            }
            return this.selectionPredicate(args);
        }
        return true;
    }

    private _getData() {
        return this.dataSourceDirective?.getData() ?? [];
    }

    private _handleSelectionType() {
        const newValue = this.selectionType === 'multiple';
        const oldValue = this._selection.isMultipleSelection();
        if (oldValue != newValue) {
            const newSelection = this._selection.selected.length > 0 ? [this._selection.selected[0]] : [];
            this._selection = new SelectionModel(newValue, newSelection);
        }
    }
}
