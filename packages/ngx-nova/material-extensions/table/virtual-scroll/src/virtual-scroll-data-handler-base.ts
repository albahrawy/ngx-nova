/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CollectionViewer, ListRange } from "@angular/cdk/collections";
import { CDK_TABLE } from "@angular/cdk/table";
import { AfterViewInit, DestroyRef, Directive, NgZone, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, combineLatest, switchMap, tap } from "rxjs";
import { ICdkTableVirtualScrollDataHandler } from "./interfaces";
import { CdkTableVirtualScrollable } from "./table-viertual-scrollable";

@Directive()
export abstract class CdkTableVirtualScrollDataHandlerBase<T>
    implements ICdkTableVirtualScrollDataHandler, CollectionViewer, AfterViewInit, OnInit {

    private readonly _viewport = inject(CdkTableVirtualScrollable, { self: true });
    private readonly _cdkTable = inject(CDK_TABLE, { self: true });
    private readonly _ngZone = inject(NgZone);
    private readonly _destroyRef = inject(DestroyRef);

    private _cdkTableDataSource: Observable<readonly T[] | null> | null = null;

    readonly viewChange = new Subject<ListRange>();
    abstract readonly dataLengthStream: Observable<number>;
    abstract measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number;
    abstract fetchNextData(range: ListRange, length: number): Observable<readonly T[] | null>;

    ngOnInit(): void {
        this._cdkTable.dataSource = this._cdkTableDataSource =
            combineLatest([this.dataLengthStream, this._viewport.renderedRangeStream]).pipe(
                takeUntilDestroyed(this._destroyRef),
                tap(([_, range]) => {
                    if (this.viewChange.observed) {
                        this._ngZone.run(() => this.viewChange.next(range));
                    }
                }),
                switchMap(([length, range]) => this.fetchNextData(range, length)));
        this._viewport.attach(this);
    }

    ngAfterViewInit(): void {
        if (this._cdkTable.dataSource != this._cdkTableDataSource) {
            this._cdkTable.dataSource = this._cdkTableDataSource;
            throw new Error('Error: Cdk Table datasource can not set.');
        }
    }
}
