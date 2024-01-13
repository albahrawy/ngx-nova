import { Observable } from "rxjs";
import { ThemePalette } from "@angular/material/core";
import { ISelectionListChange, NovaDataSource, ListMemberGetterType } from '@ngx-nova/cdk/shared';

export interface IDropDownList<TRow, TValue> {
    showIndex: boolean;
    iconColor: ThemePalette;
    color: ThemePalette;
    optionHeight: number;
    multiple: boolean;
    displayMember: ListMemberGetterType<TRow>;
    valueMember: ListMemberGetterType<TRow, TValue>;
    disableMember: ListMemberGetterType<TRow, boolean>;
    iconMember: ListMemberGetterType<TRow>;
    dataSource: NovaDataSource<TRow>;
    disabled: boolean;
    value: TValue | TValue[] | null;
    focus(): void;
    readonly selectionChange: Observable<ISelectionListChange<TValue>>;
}