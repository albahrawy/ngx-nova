export type SplitOrientation = 'horizontal' | 'vertical';
export type SplitSize = number | 'auto';
export type SplitSizeInput = number | `${number}` | null | undefined;

export interface ISplitter {
  getPanelSizes(): Array<SplitSize>;
}

export interface ISplitPanelRef {
  readonly order: number;
  readonly domOrder: number;
  readonly size: SplitSize;
  readonly minSize: number | null;
  readonly maxSize: number | null;
  readonly lastSize: SplitSize | null;
  readonly linkedGutterNumber: number;
}

export interface SplitterResizeEvent {
  event?: TouchEvent | MouseEvent | KeyboardEvent;
  gutterIndex: number;
  getPanelSizes(): Array<SplitSize>;
}