import { ThemePalette } from "@angular/material/core";
import { ListMemberGetterType, NovaDataSource } from "@ngx-nova/cdk/shared";
import { IStringDictionary, Nullable } from "@ngx-nova/js-extensions";
import { Aggregation, AggregationFn, FormatterFn } from "@ngx-nova/table-extensions/data";
import { EditorType } from "@ngx-nova/table-extensions/edit-core";
import { FilterType } from "@ngx-nova/table-extensions/filter-core";
import { ISelectionChangingArgs, SelectionType } from '@ngx-nova/table-extensions/selection';

export interface ITableColumn<TData, TValue = unknown> {
    name: string;
    dataKey?: Nullable<string | IStringDictionary>;
    headerText?: string | IStringDictionary;
    cellFormatter?: string | FormatterFn<TValue>;
    footerFormatter?: string | FormatterFn<TValue>;
    cellValueGetter?: (data: TData | null, key?: string) => Nullable<TValue>;
    cellValueSetter?: (data: TData, value?: Nullable<TValue>, key?: string) => void;
    editablePredicate?: ((data: TData | null) => boolean) | undefined | null;
    footerAggregation?: Aggregation | AggregationFn<TData>;
    cellDefaultValue?: Nullable<TValue>;
    footerDefaultValue?: Nullable<TValue>;
    readOnly?: boolean;
    hidden?: boolean;
    order?: number;
    sticky?: 'start' | 'end';
    width?: string | number;
    sortable?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    filter?: ITableColumnFilter;
    editor?: ITableColumnEditor;
}

export interface ITableColumnFilter {
    type: FilterType;
    initialOperation?: Nullable<string>;
    operations?: Nullable<string[]>;
    options?: unknown;
    filterkey?: Nullable<string>;
}

export interface ITableColumnEditor {
    type: EditorType;
    options?: unknown;
}

export interface ITableRsponsiveInfo {
    enabled: boolean;
    responsiveHeader?: string;
    xs?: number | null;
    sm?: number | null;
    md?: number | null;
    lg?: number | null;
    xl?: number | null;
    sl?: number | null;
}

export interface TableConfig<T = unknown> {
    editable?: boolean;
    commitOnDestroy?: boolean;
    editWithF2?: boolean;
    editWithEnter?: boolean;
    rowHeight?: number;
    attachFilter?: boolean;
    reorderColumns?: boolean;
    sortable?: boolean;
    showHeader?: boolean;
    showFilter?: boolean;
    showFooter?: boolean;
    stickyHeader?: boolean;
    stickyFilter?: boolean;
    stickyFooter?: boolean;
    noDataText?: string | IStringDictionary;
    responsive?: ITableRsponsiveInfo
    dataSource?: NovaDataSource<T>;
    keyboardNavigation?: 'row' | 'cell' | '' | 'none';
    selectColumn?: 'before' | 'after' | 'none';
    iconColumn?: 'before' | 'after' | 'none';
    iconType?: 'icon' | 'avatar';
    iconColor?: ThemePalette;
    iconMember?: ListMemberGetterType<T>;
    showIndex?: boolean;
    selectable?: SelectionType;
    columns: ITableColumn<T>[];
    selectionPredicate?: (args: ISelectionChangingArgs<T>) => boolean;

}