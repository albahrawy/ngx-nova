import { Component, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { TableEditorElementBase } from '@ngx-nova/table-extensions/edit-core';
import { TableSelectableDirective } from '@ngx-nova/table-extensions/selection';
@Component({
    selector: 'selectable-checkbox-element',
    host: { 'class': 'editor-checkbox-element selectable-element' },
    template: `
        <div class="mdc-checkbox" [class.mdc-checkbox--disabled]="!canSelect()" 
        (click)="_select()">
            <input type="checkbox" class="mdc-checkbox__native-control" [checked]="isSelected" />
            <div class="mdc-checkbox__background" >
            <svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24" aria-hidden="true">
                <path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59" />
            </svg>
            </div>
        </div>
    `,
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [MatInputModule, FormsModule]
})

export class TableSelectableCheckBox extends TableEditorElementBase<boolean> {

    private _tableSelection = inject(TableSelectableDirective);

    get isSelected() {
        return this.canSelect() && (this._tableSelection?.isSelected(this.data()) ?? false);
    }

    _select() {
        if (this.canSelect()) {
            this._tableSelection?.select(this.data());
        }
    }

    canSelect() {
        const tableSelection = this._tableSelection?.selectionType;
        return !!tableSelection && tableSelection !== 'none' && !!this.data();
    }
}