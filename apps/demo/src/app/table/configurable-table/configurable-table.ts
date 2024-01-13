import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NovaMatButtonStyle } from '@ngx-nova/mat-extensions/buttons';
import { NovaTableDataSource } from '@ngx-nova/table-extensions/data';
import { SelectionType } from '@ngx-nova/table-extensions/selection';
import { TableConfig, NovaTable } from '@ngx-nova/table-extensions/table';
export interface PeriodicElement {
    name_en: string;
    name_ar: string;
    position: number;
    weight: number;
    symbol: string;
    nested: { weightx: number, symbolx: string },
    icon: string;
    avatar: string;
}
const BaseData = {
    name_en: ['Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon'],
    name_ar: ['هيدروجين', 'هيليوم', 'ليثيوم', 'بريليوم', 'بورون', 'كربون', 'نيتروجين', 'أكسجين', 'فلورين', 'نيون'],
    weight: 1.001,
    symbol: ['H', 'H', 'L', 'B', 'B', 'C', 'N', 'O', 'F', 'N']
}

@Component({
    selector: 'configurable-table-example',
    templateUrl: './configurable-table.html',
    styleUrl: './configurable-table.scss',
    standalone: true,
    imports: [NovaTable, NovaMatButtonStyle, MatButtonModule]
})
export class ConfigurableTableExample {

    private _table?: NovaTable<PeriodicElement>;
    dataSource = new NovaTableDataSource(this.createData(100));
    disabled = false;
    config: TableConfig<PeriodicElement> = {
        editable: true,
        commitOnDestroy: true,
        editWithF2: true,
        editWithEnter: true,
        rowHeight: 30,
        attachFilter: true,
        reorderColumns: true,
        sortable: true,
        showHeader: true,
        showFilter: true,
        showFooter: true,
        stickyHeader: true,
        stickyFilter: true,
        stickyFooter: true,
        noDataText: 'There is no Data',
        responsive: { enabled: true },
        selectable: 'single',
        selectColumn: 'none',
        iconMember: 'icon',
        columns: [
            {
                name: 'position', footerAggregation: 'sum', headerText: 'No.', sticky: 'start',
                resizable: true, draggable: true, sortable: true, filter: { type: 'number' }, editor: { type: 'number' }
            },
            {
                name: 'date', cellFormatter: 'dd/MM/yyyy', footerDefaultValue: 'Footer', headerText: 'Date',
                resizable: true, draggable: false, sortable: true,
                filter: { type: 'date', operations: ['equals', 'greaterThan'], options: { dateFormat: 'dd-MM-yyyy' } },
                editor: { type: 'date' }
            },
            {
                name: 'weight', footerAggregation: 'avg', headerText: 'Weight', dataKey: "nested.weightx", cellFormatter: "#,###.##",
                footerFormatter: "Avg. {#,###.00}", resizable: true, draggable: true, sortable: true,
                filter: { type: 'decimal', options: { decimalDigits: 3 } }, editor: { type: 'decimal', options: { allowArrowKeys: true } }
            },
            {
                name: 'symbol', headerText: 'Symbol',
                resizable: true, draggable: true, sortable: true, filter: { type: 'string' }, editor: { type: 'string' }
            },
        ]
    }

    createData(count: number): PeriodicElement[] {
        const data = Array.from(Array(count + 1 - 1), (_, index) => {
            const position = index + 1;
            const newIndex = index % 10;
            return {
                name_en: BaseData.name_en[newIndex], name_ar: BaseData.name_ar[newIndex],
                position, symbol: BaseData.symbol[newIndex], weight: BaseData.weight * position,
                nested: { weightx: BaseData.weight * position + 6, symbolx: BaseData.symbol[newIndex] },
                date: new Date(2023, index, newIndex),
                icon: 'home',
                avatar: (index + 1) % 5
                    ? 'https://angular.io/generated/images/bios/devversion.jpg'
                    : 'https://angular.io/generated/images/bios/jelbourn.jpg',
            };
        });
        return data;
    }

    toggleSymbol() {
        const symbolColumn = this.config.columns.find(c => c.name === 'symbol');
        if (symbolColumn) {
            symbolColumn.hidden = !symbolColumn.hidden;
            this._table?.updateColumns();
        }

    }

    private selectColumnOptions: Array<'before' | 'after' | 'none'> = ['before', 'after', 'none'];
    private selectables: Array<SelectionType> = ['single', 'multiple', 'none'];

    toggleSelectColumn() {
        const _current = this.config.selectColumn ?? 'none';
        let index = this.selectColumnOptions.indexOf(_current);
        index++;
        if (index >= this.selectColumnOptions.length)
            index = 0;
        this.config.selectColumn = this.selectColumnOptions[index];
    }

    toggleIconColumn() {
        const _current = this.config.iconColumn ?? 'none';
        let index = this.selectColumnOptions.indexOf(_current);
        index++;
        if (index >= this.selectColumnOptions.length)
            index = 0;
        this.config.iconColumn = this.selectColumnOptions[index];
    }

    toggleSelectable() {
        const _current = this.config.selectable ?? 'none';
        let index = this.selectables.indexOf(_current);
        index++;
        if (index >= this.selectables.length)
            index = 0;
        this.config.selectable = this.selectables[index];
    }
    toggleIconType() {
        this.config.iconType = this.config.iconType === 'icon' ? 'avatar' : 'icon';
        this.config.iconMember = this.config.iconType === 'avatar' ? 'avatar' : 'icon';

    }
    onTableCreated(event: NovaTable<PeriodicElement>) {
        this._table = event;
    }
}