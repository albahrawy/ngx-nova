/**
 * @license
  * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/albahrawy/ngx-nova/blob/main/LICENSE
 */
import { Directive, inject } from "@angular/core";
import { CdkTableVirtualScrollDataHandler, VIRTUAL_TABLE_DATA_HANDLER } from "@ngx-nova/table-extensions/virtual-scroll";
import { Observable, combineLatest, distinctUntilChanged, map, of } from "rxjs";
import { CdkTableResponsiveView } from "./responsive-view";
import { ListRange } from "@angular/cdk/collections";


@Directive({
    selector: 'cdk-table[responsive][virtual-scroll], mat-table[responsive][virtual-scroll]',
    providers: [{ provide: VIRTUAL_TABLE_DATA_HANDLER, useExisting: CdkTableResposiveVirtualScrollDataHandler }],
    standalone: true,
})
export class CdkTableResposiveVirtualScrollDataHandler<T> extends CdkTableVirtualScrollDataHandler<T> {

    private responsiveView = inject(CdkTableResponsiveView);
    private _currentViewColumns: number = 0;;

    override readonly dataStream = combineLatest([
        this.dataSourceChanged,
        this.responsiveView.viewChanged.pipe(distinctUntilChanged())])
        .pipe(map(([data, view]) => {
            const datalength = Math.ceil(view.columns > 0 ? data.length / view.columns : data.length);
            this._currentViewColumns = view.columns;
            return Array(datalength);
        }));

    override fetchNextData(range: ListRange): Observable<readonly T[] | null> {
        const _range = { ...range };
        if (this._currentViewColumns > 0) {
            _range.start *= this._currentViewColumns;
            _range.end *= this._currentViewColumns;
        }
        const renderedData = this._data ? this._data.slice(_range.start, _range.end) : null;
        return of(renderedData);
    }
}
