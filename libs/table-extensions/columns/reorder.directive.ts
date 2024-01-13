import { coerceElement } from '@angular/cdk/coercion';
import { CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { DestroyRef, Directive, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
    selector: 'mat-table[reorderColumns], cdk-table[reorderColumns]',
    hostDirectives: [CdkDropList],
    standalone: true,
    exportAs: 'reorderColumns',
    host: { 'class': 'cdk-table-reorder-columns' },
})
export class CdkTableReorderColumns implements OnInit {
    private dropList = inject(CdkDropList, { self: true });
    private destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.dropList.orientation = 'horizontal';
        this.dropList.lockAxis = 'x';
        this.dropList.dropped.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(d => this._onDrop(d));
        this.dropList.sorted.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this._applyTransform(true));
    }

    @Input() displayedColumns: string[] = [];

    @Input() reorderColumns: boolean = true;

    private _onDrop(event: CdkDragDrop<unknown>) {
        const draggable = event.container.getSortedItems().map(i => i.data);
        const previousIndex = this.displayedColumns.indexOf(draggable[event.previousIndex]);
        const currentIndex = this.displayedColumns.indexOf(draggable[event.currentIndex]);
        this._applyTransform(false);
        if (previousIndex < 0 || currentIndex < 0)
            return;
        moveItemInArray(this.displayedColumns, previousIndex, currentIndex);
    }

    private _applyTransform(add: boolean): void {
        const siblings = this.dropList.getSortedItems();
        siblings.forEach(sibling => {
            const columnName = sibling._dragRef.data.data;
            if (add) {
                const transform = sibling._dragRef.getVisibleElement().style.transform
                if (transform)
                    coerceElement(this.dropList.element).style.setProperty(`--nova-${columnName}-drag-transform`, transform);
            } else {
                coerceElement(this.dropList.element).style.removeProperty(`--nova-${columnName}-drag-transform`);
            }
        });
    }
}
