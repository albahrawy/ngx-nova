import { Component, Input, OnInit, numberAttribute } from '@angular/core';
import { NovaTable } from '@ngx-nova/table-extensions/table';
import { IDropDownList } from '../types';
import { ThemePalette } from '@angular/material/core';
import { ListMemberGetterType, ISelectionListChange } from '@ngx-nova/cdk/shared';
import { Observable } from 'rxjs';

@Component({
    selector: 'inner-nova-table',
    templateUrl: './inner-nova-table.html',
    standalone: true
})

export class InnerNovaTable<TRow, TValue> extends NovaTable<TRow> implements IDropDownList<TRow, TValue> {

    @Input() color: ThemePalette;

    @Input()
    get optionHeight() { return this.rowHeight; }
    set optionHeight(value: number) { this.rowHeight = value; }

    @Input()
    get multiple(): boolean { return this.selectable === 'multiple'; }
    set multiple(value: boolean) { this.selectable = value ? 'multiple' : 'single'; }

    displayMember: ListMemberGetterType<TRow>;
    valueMember: ListMemberGetterType<TRow, TValue>;
    disableMember: ListMemberGetterType<TRow, boolean>;
    value: TValue | TValue[] | null;
    focus(): void {
        throw new Error('Method not implemented.');
    }
    selectionChange: Observable<ISelectionListChange<TValue>>;

}