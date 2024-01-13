import { ComponentType } from "@angular/cdk/portal";
import { InjectionToken, Type } from "@angular/core";


export type FilterType = 'string' | 'number' | 'decimal' | 'date' | 'dropdown' | ComponentType<unknown> | null | undefined | '' | string;
export const TABLE_FILTER_ELEMENT = new InjectionToken<ITableFilterElement<unknown>>('FILTER_ELEMENT');
export const TABLE_FILTER_COMPONENT_FACTORY = new InjectionToken<ITableFilterComponentFactory>('FILTER_COMPONENT_FACTORY');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ValueConverterFactoryFn<TValue = any> = null | (() => ((value: any) => TValue));
export type FilterPredicate<TValue> = (first: TValue, second: TValue) => boolean;
export type FilterPredicates<TValue> = Record<string, FilterPredicate<TValue>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ITableFilterElement<TValue = any> = {
    registerClearFilter(fn: () => void): void;
    registerChangeFilter(fn: (value: unknown) => void): void;
    valueConverterFactory?: ValueConverterFactoryFn<TValue> | null;
    readonly predicates: FilterPredicates<TValue>;
    readonly defaultOperation: string;
}

export interface ITableFilterComponentFactory {
    getComponent(type: string | null | undefined): Type<ITableFilterElement> | null;
}

export interface IFilterChangedArgs {
    key: string;
    value: unknown;
    predicate: (data: unknown) => boolean;
    filter: string;
}

export interface ITableFilterChangedArg {
    predicate: (data: unknown) => boolean;
    filter: string;
    reason: 'change';
    cellArgs: IFilterChangedArgs;
}

export interface ITableFilterClearedArg {
    predicate: (data: unknown) => boolean;
    filter: string;
    reason: 'clear';
    cellArgs: string;
}

export type ITableFilterChangedArgs = ITableFilterChangedArg | ITableFilterClearedArg;