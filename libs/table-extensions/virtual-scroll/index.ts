import { CdkTableFixedSizeVirtualScroll } from './fixed-size-strategy';
import { CdkTableVirtualScrollable } from './table-viertual-scrollable';
import { CdkTableVirtualScrollDataHandler } from './virtual-scroll-data-handler';

export * from './fixed-size-strategy';
export * from './types';
export * from './table-viertual-scrollable';
export * from './virtual-scroll-data-handler-base';
export * from './virtual-scroll-data-handler';

export const NOVA_TABLE_VIRTUAL_SCROLL = [CdkTableVirtualScrollable,
    CdkTableFixedSizeVirtualScroll,
    CdkTableVirtualScrollDataHandler] as const;