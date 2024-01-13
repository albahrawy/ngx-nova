import { WritableSignal } from "@angular/core";
import { MatSort } from "@angular/material/sort";
import { Nullable } from "@ngx-nova/js-extensions";
import { Observable } from "rxjs";

export type Aggregation = 'sum' | 'max' | 'min' | 'count' | 'avg' | 'first' | 'last';
export type AggregationFn<T> = ((key: string, data?: T[], rendered?: T[]) => unknown);
export type FormatterFn<V> = ((value: Nullable<V>, lang?: string) => string | null);

export interface ISupportAggregation {
    aggregate(key: string, type: Aggregation): unknown;
    refreshAggregation(key?: string): void;
}

export interface ISupportNotify {
    notifyChanged(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ISupportDataChangedNotifier<T = any> {
    dataChanged: Observable<T[]>;
}

export interface ISupportFilter {
    filterPredicate: (data: unknown) => boolean;
    filter: string;
}

export interface IDataAggregator<T> {
    setData(data: T[]): void;
    aggregate(key: string, type: Aggregation): unknown;
    refresh(key: string): void;
    clear(): void;
}

export interface IHasArrayDataSource<T> {
    data: Array<T>;
}

export interface IHasRenderedData<T> {
    renderedData: Array<T>;
}



export interface ISupportMatSortDataSource {
    sort: MatSort | null;
}

export interface IColumnDataAccessor<T, V> {
    getValue: (data: T | null) => Nullable<V>;
    getFooterValue: () => Nullable<V> | unknown;
    setValue(data: T, value: Nullable<V>): void;
    formatFooter: FormatterFn<V>;
    formatValue: FormatterFn<V>;
}

export interface IColumnDataDef<T, V> {
    readonly dataKey: string;
    readonly readOnly: boolean
    readonly cellValueAccessor: WritableSignal<IColumnDataAccessor<T, V>>;
}