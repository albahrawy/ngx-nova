import { DataSource } from "@angular/cdk/collections";
import { IFunc } from "@ngx-nova/js-extensions";
import { Observable } from "rxjs";

export type NovaDataSource<T> = readonly T[] | Observable<T[]> | (() => T[] | Observable<T[]>) | DataSource<T> | undefined | null;
export type ListMemberGetterType<I, O = string> = string | IFunc<I, O> | undefined | null;
export interface ISelectionListChange<TValue> {
    value: TValue | TValue[] | null;
}

export type ProgressType = 'spinner' | 'bar' | 'none' | undefined;
export type ProgressPosition = "start" | "end" | "center" | '' | undefined;
export type ProgressMode = 'determinate' | 'indeterminate';
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type FlexPosition = 'end' | 'start' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
