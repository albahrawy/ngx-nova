import { CdkPortalOutletAttachedRef, ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
    Component, ComponentRef, ContentChild, EventEmitter, HostBinding, Input, OnInit, Output, Type, ViewChild,
    WritableSignal, computed, effect, inject, signal
} from '@angular/core';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { NovaTranslatePipe } from '@ngx-nova/cdk/localization';
import { arrayIntersect, getValue } from '@ngx-nova/js-extensions';
import { CdkFilterCellDef } from '../filter-def.directive';
import { isTableFilterElement } from '../functions';
import { TABLE_FILTER_ELEMENT, FilterPredicates, IFilterChangedArgs, ITableFilterElement, ValueConverterFactoryFn } from '../types';

@Component({
    selector: 'cdk-filter-component, mat-filter-component, [cdkFilterComponent], [matFilterComponent]',
    templateUrl: 'filter.component.html',
    styleUrls: [`./filter.component.scss`],
    standalone: true,
    imports: [MatMenuModule, NovaTranslatePipe, CdkFilterCellDef, PortalModule, NgTemplateOutlet]
})

export class TableFilterComponent implements OnInit {

    private filterCellDef = inject(CdkFilterCellDef);
    private valueConverterFactory?: ValueConverterFactoryFn | null = null;

    protected filterPortal: ComponentPortal<unknown> | null = null;

    private currentFilter: WritableSignal<unknown | null> = signal(null);
    private allPredicates: WritableSignal<FilterPredicates<unknown>> = signal({});
    protected _inputCurrentOperation: WritableSignal<string | null> = signal(null);
    private _userOperations: WritableSignal<string[] | null> = signal(null);

    protected _operations = computed(() => {
        const _allOperations = Object.keys(this.allPredicates());
        const _userOperations = this._userOperations();
        if (!_userOperations)
            return _allOperations;
        return arrayIntersect(_userOperations, _allOperations);
    });

    protected _currentOperation = computed(() => {
        const _operations = this._operations();
        const _inputCurrentOperation = this._inputCurrentOperation();
        if (_inputCurrentOperation && _operations.includes(_inputCurrentOperation))
            return _inputCurrentOperation;
        return _operations.at(0) ?? null;
    });

    private _currentPredicate = computed(() => {
        const _operations = this.allPredicates();
        const _currentOperation = this._currentOperation();
        return _currentOperation ? _operations[_currentOperation] ?? null : null;
    });

    constructor() {
        effect(() => {
            const key = this.filterCellDef.filterkey;
            const currentFilter = this.currentFilter();
            const _predicate = this._currentPredicate();
            if (_predicate && key && currentFilter !== null) {
                const _currentOperation = this._currentOperation();
                const _valueConverter = this.valueConverterFactory?.();
                const value = _valueConverter ? _valueConverter(currentFilter) : currentFilter;
                const predicate = _valueConverter
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? (data: any) => _predicate(_valueConverter(getValue(data, key)), value)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    : (data: any) => _predicate(getValue(data, key), value);
                const filter = `${key} ${_currentOperation} ${value}`;
                const args = { key, value, predicate, filter };
                this.filterChanged.emit(args);
                this.filterCellDef.changeFilter(args);
            }
        })
    }

    @Input()
    get currentOperation(): string | null | undefined { return this._inputCurrentOperation(); }
    set currentOperation(value: string | null | undefined) { this._inputCurrentOperation.set(value || null); }

    @Input('operations')
    get inputOperations(): string[] | null { return this._userOperations(); }
    set inputOperations(value: string[] | undefined | null) { this._userOperations.set(value || null); }

    @Output() filterChanged = new EventEmitter<IFilterChangedArgs>();
    @Output() filterCleared = new EventEmitter<string>();

    @ViewChild(MatMenuTrigger) menu?: MatMenuTrigger;
    @ContentChild(TABLE_FILTER_ELEMENT, { static: true }) customComponent?: ITableFilterElement<unknown>;

    ngOnInit(): void {
        if (this.filterCellDef?.filterComponent instanceof Type)
            this.filterPortal = new ComponentPortal(this.filterCellDef.filterComponent);
        else if (this.customComponent)
            this.assignElementConfig(this.customComponent);

    }

    @HostBinding('class.has-filter')
    get hasValue(): boolean {
        return !!this.currentFilter();
    }

    @HostBinding('class.show-trigger')
    get showTrigger(): boolean {
        return this.menu?.menuOpen || this.hasValue;
    }

    changefilter(value: unknown): void {
        this.currentFilter.set(value);
    }

    clearfilter() {
        const key = this.filterCellDef.filterkey;
        this.currentFilter.set(null);

        if (key) {
            this.filterCleared.emit(key);
            this.filterCellDef.clearFilter(key);
        }

    }

    onAttached(ref: CdkPortalOutletAttachedRef) {
        if (ref instanceof ComponentRef)
            this.assignElementConfig(ref.instance);
    }

    private assignElementConfig(instance: object) {
        if (!isTableFilterElement(instance)) {
            this.filterPortal = null;
            throw new Error(`${instance?.constructor?.name} did not implement ITableFilterElement correctly`);
        }
        this.allPredicates.set(instance.predicates);
        if (!this._inputCurrentOperation() && instance.defaultOperation)
            this._inputCurrentOperation.set(instance.defaultOperation);
        this.valueConverterFactory = instance.valueConverterFactory;
        instance.registerChangeFilter?.(args => this.changefilter(args));
        instance.registerClearFilter?.(() => this.clearfilter());
    }
}