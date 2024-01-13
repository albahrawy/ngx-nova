/**
 * @license
  * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/albahrawy/ngx-nova/blob/main/LICENSE
 */
import { ListRange, isDataSource } from "@angular/cdk/collections";
import { Directive, Input } from "@angular/core";
import { NovaDataSource, convertToObservable } from "@ngx-nova/cdk/shared";
import { Observable, ReplaySubject, map, of, pairwise, shareReplay, startWith, switchMap } from "rxjs";
import { VIRTUAL_TABLE_DATA_HANDLER } from "./types";
import { CdkTableVirtualScrollDataHandlerBase } from "./virtual-scroll-data-handler-base";

@Directive({
    selector: 'cdk-table:not([responsive])[virtual-scroll], mat-table:not([responsive])[virtual-scroll]',
    providers: [{ provide: VIRTUAL_TABLE_DATA_HANDLER, useExisting: CdkTableVirtualScrollDataHandler }],
    standalone: true,
})
export class CdkTableVirtualScrollDataHandler<T> extends CdkTableVirtualScrollDataHandlerBase<T> {

    private _datasource: NovaDataSource<T>;
    private readonly _dataSourceChanges = new ReplaySubject<NovaDataSource<T>>();
    protected _data: readonly T[] | null = null;

    @Input('virtual-scroll')
    get datasource(): NovaDataSource<T> {
        return this._datasource;
    }
    set datasource(value: NovaDataSource<T>) {
        this._datasource = value;
        this._dataSourceChanges.next(value);
    }
    readonly dataSourceChanged = this._dataSourceChanges.pipe(
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
            return data;
        })
    );

    override readonly dataStream = this.dataSourceChanged;

    override fetchNextData(range: ListRange): Observable<readonly T[] | null> {
        const renderedData = this._data ? this._data.slice(range.start, range.end) : null;
        return of(renderedData);
    }

    private _changeDataSource(oldDs: NovaDataSource<T> | null, newDs: NovaDataSource<T> | null): Observable<readonly T[]> {
        if (isDataSource(oldDs))
            oldDs?.disconnect(this);
        return convertToObservable(newDs);
    }
}
