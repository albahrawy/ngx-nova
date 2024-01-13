/* eslint-disable @typescript-eslint/no-explicit-any */

import { MatTableDataSource } from '@angular/material/table';
import { ISupportAggregation, IHasArrayDataSource, ISupportMatSortDataSource, ISupportFilter, ISupportDataChangedNotifier, IHasRenderedData, ISupportNotify } from './types';
import { isObservable } from 'rxjs';

export function isSupportDataArray<T>(value: any | null): value is IHasArrayDataSource<T> {
    return !!value && Array.isArray(value.data);
}

export function isSupportRenderedData<T>(value: any | null): value is IHasRenderedData<T> {
    return !!value && Array.isArray(value.renderedData);
}

export function isSupportMatSort(value: unknown | null): value is Exclude<ISupportMatSortDataSource, null> {
    return !!value && (value instanceof MatTableDataSource || (value as { supportMatSort: boolean }).supportMatSort === true);
}

export function isSupportFilter(value: unknown | null): value is Exclude<ISupportFilter, null> {
    return !!value;
    // && (value instanceof MatTableDataSource || (Object.hasOwn(value, 'filter') && Object.hasOwn(value, 'filterPredicate')))
}

export function isSupportAggregation(value: any | null): value is ISupportAggregation {
    return (value && typeof value.aggregate === 'function' && value.aggregate.length === 2
        && typeof value.refreshAggregation === 'function'
    );
}

export function isSupportNotify(value: any | null): value is ISupportNotify {
    return (value && typeof value.notifyChanged === 'function');
}

export function isSupportDataChanged(value: any | null): value is ISupportDataChangedNotifier {
    return (value && isObservable(value.dataChanged));
}