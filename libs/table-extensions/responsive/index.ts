import { CdkTableResponsiveVirtualScroll } from './fixed-size-strategy';
import { CdkTableResponsiveView } from './responsive-view';
import { CdkTableResposiveVirtualScrollDataHandler } from './virtual-scroll-data-handler';

export * from './fixed-size-strategy';
export * from './responsive-view';
export * from './virtual-scroll-data-handler';

export const NOVA_RESPONSIVE_TABLE = [CdkTableResponsiveView,
    CdkTableResponsiveVirtualScroll, CdkTableResposiveVirtualScrollDataHandler] as const;