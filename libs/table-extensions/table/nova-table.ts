import { CommonModule } from '@angular/common';
import { Component, DoCheck, EventEmitter, Input, IterableDiffer, IterableDiffers, OnChanges, OnInit, Output, SimpleChanges, booleanAttribute, inject, numberAttribute } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { NovaTranslatePipe } from '@ngx-nova/cdk/localization';
import { EvaluatePipe, ListMemberGetterType, NovaDataSource } from '@ngx-nova/cdk/shared';
import { IFunc, IStringDictionary, arraySort, getValue, isFunction, isString } from '@ngx-nova/js-extensions';
import { CdkTableColumnResize, NOVA_TABLE_COLUMNS_REORDER, NOVA_TABLE_COLUMNS_SORT } from '@ngx-nova/table-extensions/columns';
import { NOVA_TABLE_DATA_DIRECTIVES } from '@ngx-nova/table-extensions/data';
import { NOVA_TABLE_EDIT_CORE } from '@ngx-nova/table-extensions/edit-core';
import { CdKTableHeaderFooter } from '@ngx-nova/table-extensions/extras';
import { NOVA_TABLE_FILTER_CORE } from '@ngx-nova/table-extensions/filter-core';
import { TABLE_NAVIGATION } from '@ngx-nova/table-extensions/keyboard-navigation';
import { ISelectionChangingArgs, SelectionType, TABLE_SELECTION } from '@ngx-nova/table-extensions/selection';
import { CdkTableVirtualScrollable } from '@ngx-nova/table-extensions/virtual-scroll';
import { NOVA_RESPONSIVE_TABLE } from '../responsive';
import { FormatTranslatePipe } from './format.pipe';
import { ITableColumn, ITableRsponsiveInfo } from './types';

export function keyboardNavigationTransform(value?: 'row' | 'cell' | '' | 'none'): 'row' | 'cell' | '' | 'none' {
    return value && ['row', 'cell', '', 'none'].includes(value) ? value : 'row';
}

export function iconTypeTransform(value: 'icon' | 'avatar' | undefined): 'icon' | 'avatar' {
    return value && ['icon', 'avatar'].includes(value) ? value : 'icon';
}

@Component({
    selector: 'nova-table',
    templateUrl: './nova-table.html',
    styleUrl: './nova-table.scss',
    standalone: true,
    imports: [
        CommonModule, MatTableModule, CdkTableVirtualScrollable, MatIconModule,
        NOVA_RESPONSIVE_TABLE, TABLE_SELECTION, TABLE_NAVIGATION, NOVA_TABLE_COLUMNS_REORDER,
        NOVA_TABLE_COLUMNS_SORT, NOVA_TABLE_DATA_DIRECTIVES, NOVA_TABLE_FILTER_CORE, NOVA_TABLE_EDIT_CORE,
        CdkTableColumnResize, CdKTableHeaderFooter, NovaTranslatePipe, FormatTranslatePipe, EvaluatePipe
    ]
})

export class NovaTable<TData> implements OnChanges, DoCheck, OnInit {

    private _differs = inject(IterableDiffers);
    private _columnsDiffer?: IterableDiffer<ITableColumn<TData, unknown>>;
    private _initialized: boolean = false;
    private _selectColumn: 'after' | 'before' | 'none' = 'none';
    private _iconColumn: 'after' | 'before' | 'none' = 'none';
    private _showRowNo = false;
    private _columns: ITableColumn<TData>[] = []
    private _selectable: SelectionType = 'single';
    private _iconMember: ListMemberGetterType<TData>;

    iconMemberFn: IFunc<TData, string> = () => '';
    _showSelectColumn = false;

    @Output() created = new EventEmitter<typeof this>();

    @Input({ transform: booleanAttribute }) editable = false;
    @Input({ transform: booleanAttribute }) commitOnDestroy: boolean = false;
    @Input({ transform: booleanAttribute }) editWithF2: boolean = true;
    @Input({ transform: booleanAttribute }) editWithEnter: boolean = true;
    @Input({ transform: numberAttribute }) rowHeight: number = 40;
    @Input({ transform: booleanAttribute }) attachFilter = true;
    @Input({ transform: booleanAttribute }) reorderColumns = true;
    @Input({ transform: booleanAttribute }) sortable = true;
    @Input({ transform: booleanAttribute }) showHeader = true;
    @Input({ transform: booleanAttribute }) showFilter = false;
    @Input({ transform: booleanAttribute }) showFooter = false;
    @Input({ transform: booleanAttribute }) stickyHeader = true;
    @Input({ transform: booleanAttribute }) stickyFilter = true;
    @Input({ transform: booleanAttribute }) stickyFooter = true;
    @Input({ transform: booleanAttribute }) disabled = false;
    @Input() editablePredicate: ((columnName: string, data: TData | null) => boolean) | undefined | null;
    @Input() selectionPredicate?: (args: ISelectionChangingArgs<TData>) => boolean;
    @Input() noDataText?: string | IStringDictionary = "NovaTable.NoData";
    @Input() responsive?: ITableRsponsiveInfo = { enabled: true };
    @Input() dataSource: NovaDataSource<TData>;
    @Input({ transform: keyboardNavigationTransform }) keyboardNavigation: 'row' | 'cell' | '' | 'none' = 'row';

    @Input()
    get columns(): ITableColumn<TData>[] { return this._columns; }
    set columns(value: ITableColumn<TData>[]) { this._columns = value || []; }


    @Input()
    get selectColumn() { return this._selectColumn; }
    set selectColumn(value: 'after' | 'before' | 'none' | undefined) {
        this._selectColumn = value ?? 'none';
        this._handleSelectColumn();
    }

    @Input()
    get iconColumn() { return this._iconColumn; }
    set iconColumn(value: 'after' | 'before' | 'none' | undefined) {
        this._iconColumn = value ?? 'none';
        if (this._initialized)
            this.updateColumns();
    }

    @Input({ transform: booleanAttribute })
    get showIndex() { return this._showRowNo; }
    set showIndex(value: boolean) {
        this._showRowNo = value;
        if (this._initialized)
            this.updateColumns();
    }

    @Input({ transform: iconTypeTransform }) iconType?: 'icon' | 'avatar' = 'icon';
    @Input() iconColor: ThemePalette = 'primary';

    @Input()
    get iconMember(): ListMemberGetterType<TData> { return this._iconMember; }
    set iconMember(value: ListMemberGetterType<TData>) {
        this._iconMember = value;
        this.iconMemberFn = isFunction(value)
            ? value
            : isString(value)
                ? i => getValue(i, value)
                : () => '';
    }

    @Input()
    get selectable(): SelectionType { return this._selectable; }
    set selectable(value: SelectionType | undefined) {
        this._selectable = value && ['none', 'multiple', 'single'].includes(value) ? value : 'single';
        this._handleSelectColumn();
    }

    displayedColumns: string[] = [];

    ngOnInit(): void {
        this.created.emit(this);
        this._initialized = true;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this._columnsDiffer) {
            const columns = (changes['columns'] && changes['columns'].currentValue) || [];
            this._columnsDiffer = this._differs.find(columns).create();
        }
    }

    ngDoCheck(): void {
        if (this._columnsDiffer?.diff(this.columns)) {
            this.updateColumns();
        }
    }

    updateColumns() {
        const columnNames = this.columns.filter(c => !c.hidden).map((c, i) => ({ name: c.name, order: c.order ?? i }));
        let displayedColumns = arraySort(columnNames, c => c.order).map(c => c.name);
        if (this._showSelectColumn) {
            if (this.selectColumn === 'after')
                displayedColumns.push('select-column');
            else if (this.selectColumn === 'before')
                displayedColumns = ['select-column', ...displayedColumns];
        }

        if (this.iconColumn === 'after')
            displayedColumns.push('icon-column');
        else if (this.iconColumn === 'before')
            displayedColumns = ['icon-column', ...displayedColumns];

        if (this.showIndex)
            displayedColumns = ['row-no-column', ...displayedColumns];
        this.displayedColumns = displayedColumns;
    }

    private _handleSelectColumn() {
        this._showSelectColumn = this._selectable && this._selectable != 'none' && (this._selectColumn === 'after' || this._selectColumn === 'before');
        if (this._initialized)
            this.updateColumns();
    }
}