import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { TableEditorElementBase } from '@ngx-nova/table-extensions/edit-core';

@Component({
    selector: 'editor-checkbox-element',
    host: { 'class': 'editor-checkbox-element' },
    template: `
        <div class="mdc-checkbox" [class.mdc-checkbox--disabled]="!canEdit()" (click)="checkChanged(!_inputElement.checked)">
            <input type="checkbox" #_inputElement class="mdc-checkbox__native-control" [checked]="value()"   />
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

export class TableEditorCheckBox extends TableEditorElementBase<boolean> {

    @ViewChild("_inputElement") _inputElement?: ElementRef<HTMLInputElement>;

    override focusInput(): void {
        this._inputElement?.nativeElement.select();
    }

    checkChanged(value: boolean) {
        this.commitHandeled(value);
    }
}