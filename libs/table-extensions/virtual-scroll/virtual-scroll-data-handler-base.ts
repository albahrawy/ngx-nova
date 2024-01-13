/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/albahrawy/ngx-nova/blob/main/LICENSE
 */
import { CollectionViewer, ListRange } from "@angular/cdk/collections";
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import { CDK_TABLE } from "@angular/cdk/table";
import { AfterViewInit, DestroyRef, Directive, NgZone, inject } from "@angular/core";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, asyncScheduler, combineLatest, switchMap, tap, throttleTime } from "rxjs";
import { ICdkTableVirtualScrollDataHandler } from "./types";

@Directive()
export abstract class CdkTableVirtualScrollDataHandlerBase<T>
    implements ICdkTableVirtualScrollDataHandler<T>, CollectionViewer, AfterViewInit {

    private readonly _cdkTable = inject(CDK_TABLE, { self: true });
    private readonly _ngZone = inject(NgZone);
    private readonly _destroyRef = inject(DestroyRef);

    private _cdkTableDataSource: Observable<readonly T[] | null> | null = null;

    readonly viewChange = new Subject<ListRange>();
    abstract readonly dataStream: Observable<readonly T[]>;
    abstract fetchNextData(range: ListRange): Observable<readonly T[] | null>;

    attach(viewport: CdkVirtualScrollViewport): void {
        this._ngZone.runOutsideAngular(() => {
            this._cdkTable.dataSource = this._cdkTableDataSource =
                combineLatest([this.dataStream, viewport.renderedRangeStream]).pipe(
                    takeUntilDestroyed(this._destroyRef),
                    tap(([_, range]) => {
                        if (this.viewChange.observed) {
                            this._ngZone.run(() => this.viewChange.next(range));
                        }
                    }),
                    switchMap(([_, range]) => this.fetchNextData(range)));
            viewport.attach(this);
        });
    }

    measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number {
        return 0;
    }


    ngAfterViewInit(): void {
        if (this._cdkTable.dataSource != this._cdkTableDataSource) {
            this._cdkTable.dataSource = this._cdkTableDataSource;
            throw new Error('Error: Cdk Table datasource can not set.');
        }
    }
}
