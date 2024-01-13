import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { TableEditorElementBase } from '@ngx-nova/table-extensions/edit-core';

@Component({
    selector: 'editor-text-element',
    host: { 'class': 'editor-text-element' },
    template: `<input #_inputElement matInput class="editor-inner-input" (blur)="commit(false)" (keydown.escape)="undo()" 
    (keydown.enter)="commit(true)" [(ngModel)]="editorContext!.value" />`,
    standalone: true,
    imports: [MatInputModule, FormsModule]
})

export class TableEditorString extends TableEditorElementBase<string> {

    @ViewChild("_inputElement") _inputElement?: ElementRef<HTMLInputElement>;

    override focusInput(): void {
        this._inputElement?.nativeElement.select();
    }
}