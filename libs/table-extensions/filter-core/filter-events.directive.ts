import { Directive, EventEmitter, Input, Output, booleanAttribute, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CdkTableDataSourceDirective } from '@ngx-nova/table-extensions/data';
import { Subject, debounceTime } from "rxjs";
import { IFilterChangedArgs, ITableFilterChangedArgs } from "./types";

@Directive({
    selector: `cdk-table[attachFilter],mat-table[attachFilter]`,
    standalone: true
})
export class CdkTableFilterEvents {

    private _filterPredicates: Map<string, (data: unknown) => boolean> = new Map();
    private dataSourceDirective = inject(CdkTableDataSourceDirective, { optional: true });

    private _filters: Map<string, string> = new Map();
    private readonly _debounceSubject = new Subject<ITableFilterChangedArgs>();

    constructor() {
        this._debounceSubject.pipe(debounceTime(200), takeUntilDestroyed())
            .subscribe(args => this.filterChanged.emit(args));
    }

    @Input({ transform: booleanAttribute }) attachFilter: boolean = false;

    @Output() filterChanged = new EventEmitter<ITableFilterChangedArgs>();
    @Output() filterCleared = new EventEmitter<void>();

    clearFilter(key: string) {
        this._filterPredicates.delete(key);
        this._filters.delete(key);
        this._emitEvent('clear', key);
    }

    changeFilter(args: IFilterChangedArgs) {
        this._filterPredicates.set(args.key, args.predicate);
        this._filters.set(args.key, args.filter);
        this._emitEvent('change', args);
    }
    private _emitEvent(reason: 'clear', cellArgs: string): void;
    private _emitEvent(reason: 'change', cellArgs: IFilterChangedArgs): void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _emitEvent(reason: any, cellArgs: any): void {
        if (this._filters.size == 0) {
            setTimeout(() => this._onFilterCleared());
        } else {
            const filter = Array.from(this._filters.values()).join(' and ');
            const predicate = (data: unknown) => Array.from(this._filterPredicates.values()).every(p => p(data));
            const args = { reason, predicate, cellArgs, filter };
            this._onFilterChanged(args);
        }
    }

    private _onFilterCleared() {
        this.filterCleared.emit();
        if (this.attachFilter && this.dataSourceDirective) {
            this.dataSourceDirective.clearFilter();
        }
    }

    private _onFilterChanged(args: ITableFilterChangedArgs) {
        this._debounceSubject.next(args);
        if (this.attachFilter && this.dataSourceDirective) {
            this.dataSourceDirective.setFilter(args.predicate, args.filter);
        }
    }
}