import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { CdkTableColumnResize, NOVA_TABLE_COLUMNS_REORDER, NOVA_TABLE_COLUMNS_SORT } from '@ngx-nova/table-extensions/columns';
import { Aggregation, AggregationFn, NOVA_TABLE_DATA_DIRECTIVES } from '@ngx-nova/table-extensions/data';
import { NOVA_TABLE_EDIT_CORE } from '@ngx-nova/table-extensions/edit-core';
import { FilterPredicates, FilterType, ITableFilterElement, NOVA_TABLE_FILTER_CORE, TABLE_FILTER_ELEMENT } from '@ngx-nova/table-extensions/filter-core';
import { TABLE_NAVIGATION } from '@ngx-nova/table-extensions/keyboard-navigation';
import { NOVA_RESPONSIVE_TABLE } from '@ngx-nova/table-extensions/responsive';
import { TABLE_SELECTION } from '@ngx-nova/table-extensions/selection';
import { CdkTableVirtualScrollable, NOVA_TABLE_VIRTUAL_SCROLL } from '@ngx-nova/table-extensions/virtual-scroll';
import { TableButtonsComponent } from './table-buttons/table-buttons';
import { CdKTableHeaderFooter } from '@ngx-nova/table-extensions/extras';
import { NovaTranslatePipe } from '@ngx-nova/cdk/localization';
const NoOp = () => { };

@Component({
  selector: 'filter-text-custom',
  template: 'ahmed',
  standalone: true,
  providers: [{ provide: TABLE_FILTER_ELEMENT, useExisting: FilterTextCustom }]
})
export class FilterTextCustom implements ITableFilterElement<string> {

  defaultOperation = 'custom'
  predicates: FilterPredicates<string> = {
    'custom': (a, b) => a.includes(b),
    'custom1': (a, b) => a.localeCompare(b) === 0,
    'custom2': (a, b) => a.startsWith(b),
  };

  changeFilter: (value: unknown) => void = NoOp;
  clearFilter: () => void = NoOp;

  registerClearFilter(fn: () => void): void {
    this.clearFilter = fn;
  }

  registerChangeFilter(fn: (value: unknown) => void): void {
    this.changeFilter = fn;
  }


}


@Component({
  selector: 'mat-table-virtual-scroll',
  templateUrl: './mat-table.component.html',
  styleUrls: ['./mat-table.component.scss'],
  standalone: true,
  imports: [
    CommonModule, TableButtonsComponent, MatTableModule,
    NOVA_TABLE_VIRTUAL_SCROLL, TABLE_SELECTION, TABLE_NAVIGATION, NOVA_TABLE_COLUMNS_REORDER,
    NOVA_TABLE_COLUMNS_SORT, NOVA_TABLE_DATA_DIRECTIVES, NOVA_TABLE_FILTER_CORE, NOVA_TABLE_EDIT_CORE,
    NOVA_RESPONSIVE_TABLE, MatSortModule,
    CdkTableColumnResize, CdKTableHeaderFooter, FilterTextCustom, NovaTranslatePipe
  ]
})
export class TestMatTableComponent {
  @ViewChild('vsDirective') vsDirective?: CdkTableVirtualScrollable;
  // filters: TableFilters = { 'position': { type: 'string', dataKey: 'abbass' } };
  //filterType: FilterType = 'string';
  nameKey = { ar: 'name_ar', en: 'name_en' };
  numberFilterType: FilterType = 'decimal';

  // changeFilterConfig() {
  //   // const newPosition = {...this.filters['position']};
  //   // newPosition.dataKey='ahmed';
  //   // this.filters['position'] = newPosition;
  //   // this.filters['name'] = { type: 'string', dataKey: 'abbass' };
  //   // this.filters ={...this.filters};
  //   this.filters = { 'position': { type: 'string', dataKey: 'abbass' }, 'name': { type: 'string', dataKey: 'abbass' } };
  //  }
  dateFilterOptions = {
    dateFormat: 'dd-MM-yyyy'
  };
  // drop(event: CdkDragDrop<string[]>, buttons: any) {
  //   const source = buttons.displayedColumns[event.previousIndex];
  //   const target = buttons.displayedColumns[event.currentIndex];
  //   if (!source || !target)
  //     return;

  //   // const targeteInMap = this._columnsMap.get(target);
  //   // const sourceInMap = this._columnsMap.get(source);
  //   // if (sourceInMap && targeteInMap) {
  //   //   const sourceIndex = sourceInMap.displayIndex;
  //   //   sourceInMap.displayIndex = targeteInMap.displayIndex;
  //   //   targeteInMap.displayIndex = sourceIndex;
  //   // }
  //   console.log(buttons.displayedColumns, event.previousIndex, event.currentIndex);
  //   moveItemInArray(buttons.displayedColumns, event.previousIndex, event.currentIndex);
  //   console.log(buttons.displayedColumns);
  // }

  // toggleWeightFilterType() {
  //   this.numberFilterType = 'number';
  // }
  footerAggregation: Aggregation | AggregationFn<unknown> = 'sum';
  sortPredicate = (index: number, drag: CdkDrag, drop: CdkDropList) => {
    const dropped = drop.getSortedItems()[index];
    return !dropped?.disabled;
  };

  changeAggregation() {
    this.footerAggregation = (k, d, r) => d?.length && r?.length ? d.length / r.length : 0;
  }
}