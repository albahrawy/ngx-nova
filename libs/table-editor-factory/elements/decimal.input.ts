import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { NumericInput } from '@ngx-nova/mat-extensions/inputs';
import { TableEditorNumber } from './number.input';

@Component({
    selector: 'editor-decimal-element',
    host: { 'class': 'editor-decimal-element' },
    template: `
        <input #_inputElement matInput inputmode="decimal" class="editor-inner-input" [allowArrowKeys]="options.allowArrowKeys"
        [currency]="options.currency" [step]="options.step" [min]="options.min" [max]="options.max" [locale]="options.locale"
        [thousandSeparator]="options.thousandSeparator" [percentage]="options.percentage" [decimalDigits]="options.decimalDigits" 
        (blur)="commit()" (keydown.escape)="undo()" (keydown.enter)="commit(true)" 
        [(ngModel)]="editorContext!.value" />
    `,
    standalone: true,
    imports: [MatInputModule, NumericInput, FormsModule]
})

export class TableEditorDecimal extends TableEditorNumber {
}