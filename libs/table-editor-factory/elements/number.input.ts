import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { NumericInput } from '@ngx-nova/mat-extensions/inputs';
import { TableEditorElementBase } from '@ngx-nova/table-extensions/edit-core';
import { INumberElementArgs } from '../common/types';


@Component({
    selector: 'filter-number-element',
    host: { 'class': 'filter-number-element' },
    template: `
        <input #_inputElement matInput inputmode="numeric" class="filter-inner-input" [allowArrowKeys]="options.allowArrowKeys"
        [currency]="options.currency" [step]="options.step" [min]="options.min" [max]="options.max" [locale]="options.locale"
        [thousandSeparator]="options.thousandSeparator" [percentage]="options.percentage" [showButtons]="options.showButton"]
        (blur)="commit(false)" (keydown.escape)="undo()" (keydown.enter)="commit(true)" 
        [(ngModel)]="editorContext!.value" />
    `,
    standalone: true,
    imports: [MatInputModule, NumericInput, FormsModule]
})

export class TableEditorNumber extends TableEditorElementBase<number | bigint, INumberElementArgs> {
    @ViewChild("_inputElement") _inputElement?: ElementRef<HTMLInputElement>;

    override focusInput(): void {
        this._inputElement?.nativeElement.select();
    }
}