import { TableColumnDataDef } from './dataDef.directive';
import { CdkTableDataSourceDirective } from './datasource.directive';
import { CdkTableReactiveCell } from './reactive-cell';
import { CdkTableFooterReactiveCell } from './reactive-footer-cell';
import { CdkTableReadonlyCell } from './readonly-cell';

export * from './datasource.directive';
export * from './row-data.directive';
export * from './dataDef.directive';
export * from './reactive-footer-cell';
export * from './reactive-cell';
export * from './readonly-cell';
export * from './default-data-def.directive';
export * from './datasource';
export * from './data-aggregator';
export * from './types';

export const NOVA_TABLE_DATA_DIRECTIVES = [
    TableColumnDataDef, CdkTableDataSourceDirective,
    CdkTableFooterReactiveCell, CdkTableReactiveCell, CdkTableReadonlyCell] as const;