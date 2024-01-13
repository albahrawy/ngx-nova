import { Directive, inject } from '@angular/core';
import { FilterPredicates, ITableFilterElement, ValueConverterFactoryFn } from "../types";
import { CdkFilterCellDef } from '../filter-def.directive';


const NoOp = () => { };

@Directive({
    host: { 'class': 'cell-filter-element' },
})
export abstract class TableFilterElementBase<TValue, TOptions = unknown> implements ITableFilterElement<TValue> {
    protected readonly filterCellDef = inject(CdkFilterCellDef);

    abstract readonly predicates: FilterPredicates<TValue>;
    abstract readonly defaultOperation: string;

    valueConverterFactory: ValueConverterFactoryFn<TValue> = null;

    changeFilter: (value: unknown) => void = NoOp;
    clearFilter: () => void = NoOp;

    registerClearFilter(fn: () => void): void {
        this.clearFilter = fn;
    }

    registerChangeFilter(fn: (value: unknown) => void): void {
        this.changeFilter = fn;
    }

    onValueChange(value?: TValue | null) {
        if (value)
            this.changeFilter(value);
        else
            this.clearFilter();
    }

    get options(): TOptions { return (this.filterCellDef.options || {}) as TOptions; }
}