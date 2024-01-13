import { RowDataDirective } from '@ngx-nova/table-extensions/data';
import { RowSelectableDirective } from './row-selection.directive';
import { TableSelectableDirective } from './table.selection.directive';

export * from './row-selection.directive';
export * from './table.selection.directive';
export * from './types';

export const TABLE_SELECTION = [RowSelectableDirective, TableSelectableDirective, RowDataDirective] as const;