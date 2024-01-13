import { Injectable, Type } from '@angular/core';
import { HandledComponent, ITableEditorComponentFactory, ITableEditorElement } from '@ngx-nova/table-extensions/edit-core';
import { TableEditorDate, TableEditorDecimal, TableEditorNumber, TableEditorString } from '../elements';
import { TableEditorCheckBox } from '../elements/checkbox';
import { TableSelectableCheckBox } from '../elements/selectable';


@Injectable({ providedIn: 'root' })
export class DefaultEditorComponentFactory implements ITableEditorComponentFactory {
    getComponent(type?: string | null): Type<ITableEditorElement> | HandledComponent | null {
        switch (type) {
            case 'string':
                return TableEditorString;
            case 'number':
                return TableEditorNumber;
            case 'decimal':
                return TableEditorDecimal;
            case 'date':
                return TableEditorDate;
            case 'checkbox':
                return { component: TableEditorCheckBox, handledView: true };
            case 'selectable':
                return { component: TableSelectableCheckBox, handledView: true };
            default:
                return null;
        }
    }
}