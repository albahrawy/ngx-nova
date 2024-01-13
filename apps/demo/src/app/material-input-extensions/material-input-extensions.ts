import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ThemePalette } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NOVA_CDK_FLEX_DIRECTIVES } from '@ngx-nova/cdk/flex-layout';
import { NovaMatButtonStyle } from '@ngx-nova/mat-extensions/buttons';
import { IDateRange, NOVA_MATERIAL_INPUTS } from '@ngx-nova/mat-extensions/inputs';

@Component({
    selector: 'material-input-extensions',
    templateUrl: 'material-input-extensions.html',
    styleUrl: './material-input-extensions.scss',
    standalone: true,
    imports: [NOVA_MATERIAL_INPUTS, MatFormFieldModule, ReactiveFormsModule, MatInputModule,
        NOVA_CDK_FLEX_DIRECTIVES, NovaMatButtonStyle, JsonPipe]
})

export class MaterialInputExtension {

    locale?: string = undefined;
    currency = 'KWD';
    color: ThemePalette = 'primary';
    //buttonStyle: ButtonStyle = 'flat';
    allowClear = true;
    showButtons = true;
    verticalButton = false;
    readOnly = false;
    minDate = new Date();
    numberMask = '##-####';
    textMask = 'aa (***) a';
    dateformat = "MM/dd/yyyy";
    formGroup = new FormGroup({
        number: new FormControl<number>({ value: 180000, disabled: true }, { nonNullable: true }),
        password: new FormControl<string | null>(null),
        maskedNumber: new FormControl<number>(180000),
        maskedText: new FormControl<string>("Ahmed Albahrawy"),
        date: new FormControl<Date>(new Date()),
        dateRange: new FormControl<IDateRange<Date>>({ start: new Date(2020, 1, 15), end: '02/20/2020' }),
        number1: new FormControl<number>({ value: 180000, disabled: true }, { nonNullable: true }),
        password1: new FormControl<string | null>(null),
        maskedNumber1: new FormControl<number>(180000),
        maskedText1: new FormControl<string>("Ahmed Albahrawy"),
        date1: new FormControl<Date>(new Date()),
        dateRange1: new FormControl<IDateRange<Date>>({ start: new Date(2020, 1, 15), end: '02/20/2020' })
    });

    toggleReadOnly() {
        this.readOnly = !this.readOnly;
    }

    toggleDisabled() {
        if (this.formGroup.disabled)
            this.formGroup.enable();
        else
            this.formGroup.disable();
    }

    formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'dd/M/yyyy', 'MMddyyyy', 'd-M-y', 'yy-M-d'];

    toggleFormat() {
        let index = this.formats.indexOf(this.dateformat);
        index++;
        if (index >= this.formats.length)
            index = 0;
        this.dateformat = this.formats[index];
    }
}