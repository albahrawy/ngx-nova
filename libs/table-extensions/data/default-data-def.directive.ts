import { CdkColumnDef } from "@angular/cdk/table";
import { IColumnDataAccessor, IColumnDataDef } from "./types";
import { Nullable, getValue, setValue } from "@ngx-nova/js-extensions";
import { WritableSignal, signal } from "@angular/core";

const DefaultFormatter = (value: unknown) => value != null ? String(value) : null;

export class DefaultColumnDataDef<T, V> implements IColumnDataDef<T, V> {

    constructor(private _columnDef: CdkColumnDef) { }

    get columnDef() { return this._columnDef; }
    get dataKey() { return this._columnDef.name; }
    readOnly: boolean = false;

    protected readonly standardValueGetter = (data: T | null) => getValue(data, this.dataKey) as Nullable<V>;
    protected readonly standardValueSetter = (data: T, value: Nullable<V>) => setValue(data, this.dataKey, value);
    cellValueAccessor: WritableSignal<IColumnDataAccessor<T, V>> = signal({
        getValue: this.standardValueGetter,
        setValue: this.standardValueSetter,
        getFooterValue: () => null,
        formatValue: DefaultFormatter,
        formatFooter: DefaultFormatter
    })
}

