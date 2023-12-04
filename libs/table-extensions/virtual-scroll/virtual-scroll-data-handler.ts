/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ArrayDataSource, DataSource, ListRange, isDataSource } from "@angular/cdk/collections";
import { CdkTableDataSourceInput } from "@angular/cdk/table";
import { Directive, Input, NgIterable } from "@angular/core";
import { Observable, ReplaySubject, isObservable, map, of, pairwise, shareReplay, startWith, switchMap } from "rxjs";
import { CdkTableVirtualScrollDataHandlerBase } from "./virtual-scroll-data-handler-base";

@Directive({
    selector: 'cdk-table[virtual-scroll], mat-table[virtual-scroll]',
    standalone: true,
})
export class CdkTableVirtualScrollDataHandler<T> extends CdkTableVirtualScrollDataHandlerBase<T> {

    private _datasource: CdkTableDataSourceInput<T> | NgIterable<T> | null | undefined;
    private readonly _dataSourceChanges = new ReplaySubject<DataSource<T>>();
    private _data: readonly T[] | null = null;

    @Input('virtual-scroll')
    get datasource(): CdkTableDataSourceInput<T> | NgIterable<T> | null | undefined {
        return this._datasource;
    }
    set datasource(value: CdkTableDataSourceInput<T> | NgIterable<T> | null | undefined) {
        this._datasource = value;
        if (isDataSource(value)) {
            this._dataSourceChanges.next(value);
        } else {
            // If value is an an NgIterable, convert it to an array.
            this._dataSourceChanges.next(
                new ArrayDataSource<T>(isObservable(value) ? value : Array.from(value || [])),
            );
        }
    }

    override readonly dataLengthStream: Observable<number> = this._dataSourceChanges.pipe(
        // Start off with null `DataSource`.
        startWith(null),
        // Bundle up the previous and current data sources so we can work with both.
        pairwise(),
        // Use `_changeDataSource` to disconnect from the previous data source and connect to the
        // new one, passing back a stream of data changes which we run through `switchMap` to give
        // us a data stream that emits the latest data from whatever the current `DataSource` is.
        switchMap(([prev, cur]) => this._changeDataSource(prev, cur)),
        // Replay the last emitted data when someone subscribes.
        shareReplay(1),
        map(data => {
            this._data = data;
            return data.length;
        })
    );


    override fetchNextData(range: ListRange): Observable<readonly T[] | null> {
        const renderedData = this._data ? this._data.slice(range.start, range.end) : null;
        return of(renderedData);
    }

    override measureRangeSize(): number {
        return 0;
    }

    private _changeDataSource(oldDs: DataSource<T> | null, newDs: DataSource<T> | null): Observable<readonly T[]> {
        if (oldDs)
            oldDs.disconnect(this);

        return newDs ? newDs.connect(this) : of();
    }
}
