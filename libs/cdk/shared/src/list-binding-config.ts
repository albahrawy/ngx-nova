import { IFunc, getValue, isFunction, isString } from "@ngx-nova/js-extensions";
import { ListMemberGetterType } from "./types";

const DefaultIconFn = () => '';
const DefaultDisableFn = () => false;
const DefaultMemberFn = <T, V>(record: T) => record as unknown as V;

export class ListBindingConfig<TRow, TValue>   {

    private _displayMember: ListMemberGetterType<TRow>;
    private _valueMember?: ListMemberGetterType<TRow, TValue>;
    private _iconMember?: ListMemberGetterType<TRow>;
    private _disableMember?: ListMemberGetterType<TRow, boolean>;

    displayMemberFn: IFunc<TRow, string> = DefaultMemberFn;
    valueMemberFn: IFunc<TRow, TValue> = DefaultMemberFn;
    iconMemberFn: IFunc<TRow, string> = DefaultIconFn;
    disableMemberFn: IFunc<TRow, boolean> = DefaultDisableFn;

    get displayMember(): ListMemberGetterType<TRow> { return this._displayMember; }
    set displayMember(value: ListMemberGetterType<TRow>) {
        this._displayMember = value;
        this.displayMemberFn = this._convertMember<string>(value, DefaultMemberFn);
    }

    get valueMember(): ListMemberGetterType<TRow, TValue> { return this._valueMember; }
    set valueMember(value: ListMemberGetterType<TRow, TValue>) {
        this._valueMember = value;
        this.valueMemberFn = this._convertMember<TValue>(value, DefaultMemberFn);
    }

    get iconMember(): ListMemberGetterType<TRow> { return this._iconMember; }
    set iconMember(value: ListMemberGetterType<TRow>) {
        this._iconMember = value;
        this.iconMemberFn = this._convertMember(value, DefaultIconFn);
    }

    get disableMember(): ListMemberGetterType<TRow, boolean> { return this._disableMember; }
    set disableMember(value: ListMemberGetterType<TRow, boolean>) {
        this._disableMember = value;
        this.disableMemberFn = this._convertMember(value, DefaultDisableFn);
    }

    getSelectedItems(data?: readonly TRow[], selected?: TValue[] | null): TRow[] | null {
        if (!selected?.length || !data?.length)
            return null;
        const selectedSet = new Set(selected);
        const _cValueFn = this.valueMemberFn;
        return data?.filter(record => selectedSet.has(_cValueFn(record))) ?? null;
    }

    getSelectedTitles(data?: readonly TRow[], selected?: TValue[] | null): string[] | null {
        if (!selected?.length || !data?.length)
            return null;
        const _titleFn = this.displayMemberFn;
        const _cValueFn = this.valueMemberFn;
        const selectedSet = new Set(selected);
        const titles: string[] = [];
        for (const record of data) {
            if (selectedSet.has(_cValueFn(record)))
                titles.push(_titleFn(record));
            if (titles.length === selected.length)
                break;
        }

        return titles;
    }

    getAllActiveValues(data?: readonly TRow[]): TValue[] | null {
        if (!data?.length)
            return null;
        const _cDisableFn = this.disableMemberFn;
        const _cValueFn = this.valueMemberFn;
        const active: TValue[] = [];
        data.forEach(r => {
            if (this.disableMember && !_cDisableFn(r))
                active.push(_cValueFn(r));
        });
        return active;
    }

    protected _convertMember<V>(value: ListMemberGetterType<TRow, V>, defaultFn: IFunc<TRow, V>): IFunc<TRow, V> {
        return isFunction(value)
            ? value
            : isString(value)
                ? i => getValue(i, value)
                : defaultFn;
    }
}