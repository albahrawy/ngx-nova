import { NovaSplitPanelDirective } from './splitter/split-panel.directive';
import { NovaSplitComponent } from './splitter/split.component';

export * from './splitter/split-panel.directive';
export * from './splitter/split.component';
export * from './splitter/types';

export const NOVA_SPLITTER = [NovaSplitComponent, NovaSplitPanelDirective] as const;