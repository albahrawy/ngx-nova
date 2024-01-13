import { Directive, Input, OnDestroy, Output } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { MatTableDataSource } from "@angular/material/table";
import { NovaDataSource } from "@ngx-nova/cdk/shared";
import { ReplaySubject, debounceTime, distinctUntilChanged, of, switchMap } from "rxjs";
import { isSupportAggregation, isSupportDataArray, isSupportDataChanged, isSupportFilter, isSupportNotify, isSupportRenderedData } from "./functions";
import { Aggregation } from "./types";

@Directive({
    selector: 'mat-table[virtual-scroll],cdk-table[virtual-scroll], mat-table[dataSource],cdk-table[dataSource]',
    standalone: true,
    exportAs: 'novaDatasourceDirective'
})
export class CdkTableDataSourceDirective<T = unknown> implements OnDestroy {

    private _virtualDataSource: NovaDataSource<T> = null;
    private _normalDataSource: NovaDataSource<T> = null;
    private _dataSourceChanged = new ReplaySubject<NovaDataSource<T>>(1);

    @Output() dataSourceChanged = this._dataSourceChanged.asObservable().pipe(distinctUntilChanged());
    @Output() dataChanged = this.dataSourceChanged
        .pipe(switchMap(d => isSupportDataChanged(d) ? d.dataChanged.pipe(debounceTime(1)) : of([])));

    @Input() set dataSource(value: NovaDataSource<T>) {
        this._normalDataSource = value;
        this._dataSourceChanged.next(this.dataSource);
    }

    @Input('virtual-scroll') set vsDataSource(value: NovaDataSource<T>) {
        this._virtualDataSource = value;
        this._dataSourceChanged.next(this.dataSource);
    }

    get dataSource(): NovaDataSource<T> {
        return this._virtualDataSource ?? this._normalDataSource;
    }

    dataNotifier = toSignal(this.dataChanged);

    notifyChanged() {
        this.refreshAggregation();
        if (isSupportNotify(this.dataSource))
            this.dataSource.notifyChanged();
        else if (this.dataSource instanceof MatTableDataSource)
            this.dataSource._updateChangeSubscription();

    }

    getData(): T[] {
        return isSupportDataArray<T>(this.dataSource)
            ? this.dataSource.data
            : Array.isArray(this.dataSource)
                ? this.dataSource
                : [];
    }

    getRenderedData(): T[] {
        return isSupportRenderedData<T>(this.dataSource) ? this.dataSource.renderedData : [];
    }

    aggregate(key: string, type: Aggregation): unknown {
        if (isSupportAggregation(this.dataSource))
            return this.dataSource.aggregate(key, type);
        return null;
    }

    refreshAggregation(key?: string): void {
        if (isSupportAggregation(this.dataSource))
            this.dataSource.refreshAggregation(key);
    }

    clearFilter() {
        if (isSupportFilter(this.dataSource)) {
            this.dataSource.filterPredicate = () => true;
            this.dataSource.filter = '';
        }
    }

    setFilter(predicate: (data: unknown) => boolean, filter: string) {
        if (isSupportFilter(this.dataSource)) {
            this.dataSource.filterPredicate = predicate;
            this.dataSource.filter = filter;
        }
    }

    ngOnDestroy(): void {
        this._dataSourceChanged.complete();
    }
}
