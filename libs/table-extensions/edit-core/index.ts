import { CdkTableEditableCell } from './editable-cell';
import { CdkTableEditableRegistry } from './table.editable.directive';

export * from './editable-cell-base.component';
export * from './cell-element.directive';
export * from './editable-cell';
export * from './table-editor-element.base';
export * from './table.editable.directive';
export * from './types';

export const NOVA_TABLE_EDIT_CORE = [CdkTableEditableRegistry, CdkTableEditableCell] as const;