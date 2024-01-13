import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { arraySort, getValue } from "@ngx-nova/js-extensions";
import { Observable, ReplaySubject, Subject, Subscription, distinctUntilChanged, isObservable, tap } from "rxjs";
import { DefaultDataAggregator } from "./data-aggregator";
import { Aggregation, IDataAggregator, ISupportAggregation, ISupportDataChangedNotifier } from "./types";

export class NovaTableDataSource<T, P extends MatPaginator = MatPaginator>
    extends MatTableDataSource<T, P> implements ISupportAggregation, ISupportDataChangedNotifier {

    private _observableDataSubscription: Subscription | null = null;
    private _dataChanged = new ReplaySubject<T[]>(1);
    private _renderedData: T[] = [];
    private _manualDataChanged = new Subject<void>(); // New Subject for manual notifications

    readonly dataChanged = this._dataChanged.asObservable().pipe(distinctUntilChanged());
    get renderedData() { return this._renderedData; }
    dataAggregator: IDataAggregator<T> = new DefaultDataAggregator<T>();

    override sortData: (data: T[], sort: MatSort) => T[] = (data, sort) => {
        const active = sort.active;
        const direction = sort.direction === 'asc' ? 1 : sort.direction === 'desc' ? -1 : 0;
        if (!active || !direction) {
            return data;
        }
        return arraySort(data, d => getValue(d, active), direction);
    }

    override get data(): T[] { return super.data; }
    override set data(data: Array<T> | Observable<T[]> | undefined | null) {
        if (isObservable(data)) {
            this._observableDataSubscription?.unsubscribe();
            this._observableDataSubscription = data.subscribe(d => super.data = d);
        }
        else { super.data = data || []; }
    }

    override disconnect(): void {
        super.disconnect();
        this._observableDataSubscription?.unsubscribe();
    }
    //@ts-expect-error return Observable instead of BehaviorSubject.
    override connect(): Observable<T[]> {
        return super.connect()
            .pipe(tap(renderedData => {
                this._renderedData = renderedData;
                this.dataAggregator?.setData(renderedData);
                this._dataChanged.next(renderedData);
            }));
    }

    notifyChanged(): void {
        //@ts-expect-error using private memeber
        this._data.next(super.data);
    }

    aggregate(key: string, type: Aggregation): unknown {
        return this.dataAggregator?.aggregate(key, type);
    }

    refreshAggregation(key?: string): void {
        if (key)
            this.dataAggregator?.refresh(key);
        else
            this.dataAggregator?.clear();
    }
}