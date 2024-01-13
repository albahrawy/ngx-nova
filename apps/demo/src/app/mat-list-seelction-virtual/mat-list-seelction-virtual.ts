import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NovaTranslatePipe } from '@ngx-nova/cdk/localization';
import { NovaMatButtonStyle } from '@ngx-nova/mat-extensions/buttons';

import { ListCategorizedMode, ListIconType, ListTogglePosition, NovaSelectionList } from '@ngx-nova/selection-list';
interface KeyValue {
    name: string;
    value: number;
    icon: string,
    avatar: string,
}

@Component({
    selector: 'mat-list-seelction-virtual',
    templateUrl: 'mat-list-seelction-virtual.html',
    styleUrl: 'mat-list-seelction-virtual.css',
    standalone: true,
    imports: [ReactiveFormsModule, NovaSelectionList, MatFormFieldModule, NovaTranslatePipe,
        JsonPipe, MatButtonModule, NovaMatButtonStyle]
})

export class MatSelectionListVirtual {
    togglePosition: ListTogglePosition = 'after';
    iconType: ListIconType = 'icon';
    iconMember: string = 'icon';
    _positions: ListTogglePosition[] = ['after', 'before', 'none'];
    _categorizedTypes: ListCategorizedMode[] = ['none', 'sticky', 'split'];
    _iconTypes: ListIconType[] = ['none', 'icon', 'avatar'];

    typesOfShoes: KeyValue[] = Array(400).fill(0).map((v, i) => (
        {
            name: 'item' + i, value: i + 1,
            icon: 'home',
            avatar: (i + 1) % 5
                ? 'https://angular.io/generated/images/bios/devversion.jpg'
                : 'https://angular.io/generated/images/bios/jelbourn.jpg',
            disable: (i + 1) % 15 == 0
        }));
    optionHeight = 48;
    categorized: ListCategorizedMode = 'none';
    multiple = true;
    showTitle = true;
    showIndex = true;
    listLable = { 'en': 'Virtual Selection List', ar: 'تجربة الليست' };
    frmControl = new FormControl([1, 2, 3]);

    changeDataSource() {
        this.typesOfShoes = Array(20).fill(0).map((v, i) => ({
            name: 'item' + i, value: i + 1, disable: (i + 1) % 15 == 0,
            icon: (i + 1) % 5 ? 'home' : 'tel',
            avatar: (i + 1) % 3
                ? 'https://angular.io/generated/images/bios/devversion.jpg'
                : 'https://angular.io/generated/images/bios/jelbourn.jpg',
        }));
    }
    toggleDisable() {
        const currentstate = this.frmControl.disabled;
        if (currentstate)
            this.frmControl.enable();
        else
            this.frmControl.disable();
    }

    changeControlValue() {
        this.frmControl.setValue([12, 11, 10]);
    }

    togglePositionValue() {
        let reqtIndex = this._positions.indexOf(this.togglePosition) + 1;
        if (reqtIndex >= this._positions.length)
            reqtIndex = 0;
        this.togglePosition = this._positions[reqtIndex];
    }

    toggleCategorize() {
        let reqtIndex = this._categorizedTypes.indexOf(this.categorized) + 1;
        if (reqtIndex >= this._categorizedTypes.length)
            reqtIndex = 0;
        this.categorized = this._categorizedTypes[reqtIndex];
    }

    toggleIconType() {
        let reqtIndex = this._iconTypes.indexOf(this.iconType) + 1;
        if (reqtIndex >= this._iconTypes.length)
            reqtIndex = 0;
        this.iconType = this._iconTypes[reqtIndex];
        this.iconMember = this.iconType === 'avatar' ? 'avatar' : 'icon';
    }
}