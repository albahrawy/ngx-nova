import { Component, OnInit,  ViewChild } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import {
    ScrollingModule,
    CdkVirtualScrollRepeater,
    CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { Observable, ReplaySubject, of } from 'rxjs';
import { ListRange } from '@angular/cdk/collections';

export interface PeriodicElement {
    name: string;
    position: number;
    weight: number;
    symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
    { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H' },
    { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
    { position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li' },
    { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
    { position: 5, name: 'Boron', weight: 10.811, symbol: 'B' },
    { position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C' },
    { position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N' },
    { position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O' },
    { position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F' },
    { position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne' },
];

const BASE_CCOLUMN: string[] = ['name', 'weight', 'symbol', 'position'];

/**
 * @title Table dynamically changing the columns displayed
 */
@Component({
    selector: 'horizontal-table',
    styleUrls: ['./horizontal-table.scss'],
    templateUrl: 'horizontal-table.html',
    standalone: true,
    imports: [MatButtonModule, MatTableModule, ScrollingModule],
})
export class TableDynamicColumnsExample implements OnInit {
    // displayedColumns: string[] = ['name', 'weight', 'symbol', 'position'];
    // columnsToDisplay: string[] = this.displayedColumns.slice();
    @ViewChild(CdkVirtualScrollViewport, { static: true })
    _viewPort!: CdkVirtualScrollViewport;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[] = ELEMENT_DATA.map((d: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dExtends: any = { ...d };
        Object.keys(d).forEach((columnName) => {
            for (let x = 1; x < 50; x++) {
                dExtends[columnName + x] = d[columnName];
            }
        });
        return dExtends;
    });
    allColumns: string[] = BASE_CCOLUMN.reduce((prev, columnName) => {
        for (let x = 1; x < 50; x++) {
            prev.push(columnName + x);
        }
        return prev;
    }, BASE_CCOLUMN.slice());
    columnsToDisplay: string[] = [];

    ngOnInit(): void {
        const handler = new ColumnScrollDataHandler(
            this._viewPort,
            this.allColumns
        );
        handler.columnsToDisplayStream.subscribe(
            (columns) => (this.columnsToDisplay = columns)
        );
    }
}

export class ColumnScrollDataHandler
    implements CdkVirtualScrollRepeater<string>
{
    private columnsToDisplaySubject = new ReplaySubject<string[]>(1);
    readonly columnsToDisplayStream = this.columnsToDisplaySubject.asObservable();

    constructor(
        private viewPort: CdkVirtualScrollViewport,
        private allColumns: string[]
    ) {
        this.dataStream = of(this.allColumns);
        viewPort.renderedRangeStream.subscribe((range) => {
            this.columnsToDisplaySubject.next(
                allColumns.slice(range.start, range.end)
            );
        });
        viewPort.attach(this);
    }
    readonly dataStream: Observable<readonly string[]>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    measureRangeSize(range: ListRange, orientation: 'horizontal' | 'vertical'): number {
        return 0;
    }
}

/**  Copyright 2023 Google LLC. All Rights Reserved.
    Use of this source code is governed by an MIT-style license that
    can be found in the LICENSE file at https://angular.io/license */
