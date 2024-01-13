import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { MatInputModule } from '@angular/material/input';
import { DateFormatDirective, DateMaskInput, NovaDateInput } from '@ngx-nova/mat-extensions/inputs';
import { TableEditorElementBase } from '@ngx-nova/table-extensions/edit-core';
import { IDateElementArgs } from '../common/types';

@Component({
    selector: 'editor-date-element',
    host: { 'class': 'editor-date-element' },
    template: `
        <input #_inputElement class="editor-inner-input" inputmode="date" [min]="options.min!" [max]="options.max!" 
        [dateFormat]="options.dateFormat" [matDatepickerFilter]="options.dateFilter!" matInput color="primary" 
        (dateChange)="commit(true)" (keydown.escape)="undo()" (keydown.enter)="commit(true)"
         [(ngModel)]="editorContext!.value"/>
        `,
    standalone: true,
    imports: [MatInputModule, DateMaskInput, DateFormatDirective, NovaDateInput, FormsModule]

})

export class TableEditorDate extends TableEditorElementBase<Date, IDateElementArgs> {
    override focusInput(): void {
        this._inputElement?.nativeElement.select();
    }

    @ViewChild("_inputElement") _inputElement?: ElementRef<HTMLInputElement>;
}

