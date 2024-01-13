export type SelectionType = 'none' | 'multiple' | 'single';

export interface ISelectionChangingArgs<T> {
    readonly allData?: Array<T>;
    readonly rowData: T;
    readonly selected: Array<T>;
    readonly type: 'select' | 'deselect';
}