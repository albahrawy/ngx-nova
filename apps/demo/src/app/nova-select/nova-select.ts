import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ThemePalette } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NOVA_CDK_FLEX_DIRECTIVES } from '@ngx-nova/cdk/flex-layout';
import { NovaMatButtonStyle } from '@ngx-nova/mat-extensions/buttons';
import { NovaSelect } from '@ngx-nova/select';
import { ListCategorizedMode } from '@ngx-nova/selection-list';
import { BehaviorSubject } from 'rxjs';

@Component({
    selector: 'nova-select-example',
    templateUrl: 'nova-select.html',
    styleUrl: './nova-select.scss',
    standalone: true,
    imports: [MatFormFieldModule, ReactiveFormsModule, MatButtonModule,
        NOVA_CDK_FLEX_DIRECTIVES, NovaMatButtonStyle, JsonPipe, MatSelectModule, NovaSelect]
})

export class NovaSelectExample {
    disabled = false;
    color: ThemePalette = 'accent';
    allowClear = true;
    showButtons = true;
    showSearch = false;
    readOnly = false;
    formGroup = new FormGroup({
        number: new FormControl<number>({ value: 180000, disabled: true }),
        selectValue: new FormControl<number | number[]>([1, 4, 5]),
    });
    _categorizedTypes: ListCategorizedMode[] = ['none', 'sticky', 'split'];
    typesOfShoes: unknown[] = Array(400).fill(0).map((v, i) => ({ name: 'item' + i, value: i + 1, icon: 'home', disable: (i + 1) % 15 == 0 }));
    optionHeight = 48;
    categorized: ListCategorizedMode = 'none';
    multiple = true;
    isDefaultDataSource = true;

    toggleReadOnly() {
        this.readOnly = !this.readOnly;
    }

    toggleDisabled() {
        this.disabled = !this.disabled;
        if (this.formGroup.disabled)
            this.formGroup.enable();
        else
            this.formGroup.disable();
    }

    asyncDataSource = new BehaviorSubject(this.typesOfShoes);

    toggleCategorize() {
        let reqtIndex = this._categorizedTypes.indexOf(this.categorized) + 1;
        if (reqtIndex >= this._categorizedTypes.length)
            reqtIndex = 0;
        this.categorized = this._categorizedTypes[reqtIndex];
    }

    toggleDataSource() {
        if (this.isDefaultDataSource) {
            this.isDefaultDataSource = false;
            const smallData = Array(3).fill(0).map((v, i) => ({
                name: 'item' + i, value: i + 1, disable: (i + 1) % 15 == 0,
                icon: (i + 1) % 5 ? 'home' : 'tel',
                avatar: (i + 1) % 3
                    ? 'https://angular.io/generated/images/bios/devversion.jpg'
                    : 'https://angular.io/generated/images/bios/jelbourn.jpg',
            }));
            this.asyncDataSource.next(smallData);
        } else {
            this.isDefaultDataSource = true;
            this.asyncDataSource.next(this.typesOfShoes);
        }
    }
}