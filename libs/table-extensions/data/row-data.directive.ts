import { CdkCellOutletRowContext } from '@angular/cdk/table';
import { Directive, ViewContainerRef, inject } from '@angular/core';
import { CONTXT_VIEW_INDEX } from '../internal/constants';


@Directive({
    selector: 'cdk-row,mat-row',
    standalone: true
})
export class RowDataDirective<T> {

    private _viewContainer = inject(ViewContainerRef);
    //@ts-expect-error get context from private array
    private _context = this._viewContainer._hostLView[CONTXT_VIEW_INDEX];

    get context(): CdkCellOutletRowContext<T> { return this._context; }
    get data(): T | undefined { return this._context.$implicit; }
}