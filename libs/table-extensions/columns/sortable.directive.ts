import { Component, DestroyRef, Directive, Input, OnInit, booleanAttribute, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { pairwise, shareReplay, startWith } from 'rxjs';
import { CdkTableDataSourceDirective } from '../data';
import { isSupportMatSort } from '../data/functions';
import { TableColumnDataDef } from '../data/dataDef.directive';
//TODO: think about local compare
@Component({
    selector: 'mat-header-cell[sortable], cdk-header-cell[sortable]',
    template: `<span class="header-cell-body" [mat-sort-header]="_columnDef?.dataKey??''" [disabled]="!sortable">
        <ng-content></ng-content></span>`,
    standalone: true,
    imports: [MatSortModule]
})
export class CdkColumnSortable {

    protected _columnDef = inject(TableColumnDataDef, { optional: true });
    @Input({ transform: booleanAttribute }) sortable: boolean = false;
}

@Directive({
    selector: 'mat-table[sortable],cdk-table[sortable]',
    standalone: true,
    providers: [{ provide: MatSort, useExisting: CdkTableSortableDirective }]
})
export class CdkTableSortableDirective extends MatSort implements OnInit {

    private dataSourceDirective = inject(CdkTableDataSourceDirective, { optional: true });
    private destroyRef = inject(DestroyRef);

    override ngOnInit(): void {
        this.dataSourceDirective?.dataSourceChanged
            .pipe(startWith(null),
                pairwise(),
                shareReplay(1), takeUntilDestroyed(this.destroyRef))
            .subscribe(([prev, cur]) => {
                if (isSupportMatSort(prev))
                    prev.sort = null;
                if (isSupportMatSort(cur))
                    cur.sort = this;
            })
        super.ngOnInit();
    }

    @Input({ transform: booleanAttribute })
    get sortable(): boolean { return !super.disabled; }
    set sortable(value: boolean) { super.disabled = !value; }
}