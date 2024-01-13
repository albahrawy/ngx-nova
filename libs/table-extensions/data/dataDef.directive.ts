import { CdkColumnDef } from '@angular/cdk/table';
import { Directive, Input, OnChanges, OnInit, Self, SimpleChanges, booleanAttribute, inject } from '@angular/core';
import { NOVA_VALUE_FORMATTER } from '@ngx-nova/cdk/format';
import { CdkTableDataSourceDirective } from './datasource.directive';
import { DefaultColumnDataDef } from './default-data-def.directive';
import { Aggregation, AggregationFn, FormatterFn } from './types';
import { Nullable } from '@ngx-nova/js-extensions';

const DefaultFormatter = (value: unknown) => value != null ? String(value) : null;

const keysToCheck = [
    'cellFormatter', 'footerFormatter', 'cellValueGetter', 'cellValueSetter',
    'footerAggregation', 'cellDefaultValue', 'footerDefaultValue', 'dataKey'
];

@Directive({
    selector: `[matColumnDef][cellFormatter],
               [matColumnDef][footerFormatter],
               [matColumnDef][cellValueGetter],
               [matColumnDef][cellValueSetter],
               [matColumnDef][footerAggregation],
               [matColumnDef][cellDefaultValue],
               [matColumnDef][footerDefaultValue],
               [matColumnDef][dataKey],
               [matColumnDef][readOnly],
               [matColumnDef][label],
               [cdkColumnDef][cellFormatter],
               [cdkColumnDef][footerFormatter],
               [cdkColumnDef][cellValueGetter],
               [cdkColumnDef][cellValueSetter],
               [cdkColumnDef][footerAggregation],
               [cdkColumnDef][cellDefaultValue],
               [cdkColumnDef][footerDefaultValue],
               [cdkColumnDef][dataKey],
               [cdkColumnDef][readOnly],
               [cdkColumnDef][label]
               `,
    standalone: true,
})
export class TableColumnDataDef<T = unknown, V = unknown> extends DefaultColumnDataDef<T, V> implements OnChanges, OnInit {

    private _dateKey: Nullable<string>;
    protected readonly dataSourceDirective = inject(CdkTableDataSourceDirective, { optional: true });
    protected readonly formatProvider = inject(NOVA_VALUE_FORMATTER, { optional: true });

    constructor(@Self() _columnDef: CdkColumnDef) {
        super(_columnDef);
    }

    @Input() cellValueGetter?: (data: T | null, key?: string) => Nullable<V>;
    @Input() cellValueSetter?: (data: T, value?: Nullable<V>, key?: string) => void;
    @Input() cellDefaultValue?: Nullable<V>;
    @Input() cellFormatter?: string | FormatterFn<V> | null;

    @Input() footerAggregation?: Aggregation | AggregationFn<T>;
    @Input() footerDefaultValue?: Nullable<V>;
    @Input() footerFormatter?: string | FormatterFn<V> | null;
    // using for responsive label 
    @Input() label?: string | null;

    @Input()
    override get dataKey(): string { return this._dateKey ?? super.dataKey; }
    override set dataKey(value: Nullable<string>) {
        this._dateKey = value;
    }

    @Input({ transform: booleanAttribute }) override readOnly: boolean = false;

    ngOnInit(): void {
        this.generateGetters(this.cellValueGetter, this.cellValueSetter, this.footerAggregation, this.cellFormatter,
            this.footerFormatter, this.cellDefaultValue, this.footerDefaultValue);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (keysToCheck.some(key => key in changes && !changes[key].isFirstChange())) {
            this.generateGetters(this.cellValueGetter, this.cellValueSetter, this.footerAggregation, this.cellFormatter,
                this.footerFormatter, this.cellDefaultValue, this.footerDefaultValue);
        }
    }

    protected generateGetters(
        _cValueGetter?: (data: T | null, key?: string) => Nullable<V>,
        _cValueSetter?: (data: T, value?: Nullable<V>, key?: string) => void,
        _fAggregation?: Aggregation | AggregationFn<T>,
        _cFormatter?: string | FormatterFn<V> | null,
        _fFormatter?: string | FormatterFn<V> | null,
        _cDefaultValue?: Nullable<V>,
        _fDefaultValue?: Nullable<V>,
    ) {
        const dataKey = this.dataKey as keyof T & string;
        const _formatterProvider = this.formatProvider;

        const formatValue = typeof _cFormatter === 'function'
            ? _cFormatter
            : _formatterProvider && typeof _cFormatter === 'string'
                ? (value: unknown) => _formatterProvider.format(value, _cFormatter)
                : DefaultFormatter;

        const formatFooter = typeof _fFormatter === 'function'
            ? _fFormatter
            : _formatterProvider && typeof _fFormatter === 'string'
                ? (value: Nullable<V>) => _formatterProvider.format(value, _fFormatter)
                : formatValue;
        const getValue = (typeof _cValueGetter === 'function') ?
            (data: T | null) => (_cValueGetter(data, dataKey) ?? _cDefaultValue)
            : (data: T | null) => this.standardValueGetter(data) ?? _cDefaultValue;

        const setValue = (typeof _cValueSetter === 'function') ?
            (data: T, value: Nullable<V>) => _cValueSetter(data, value, dataKey)
            : this.standardValueSetter;

        const getData = () => this.dataSourceDirective?.getData() ?? [];
        const getRendered = () => this.dataSourceDirective?.getRenderedData() ?? [];

        const aggregator = (type: Aggregation) => this.dataSourceDirective?.aggregate(dataKey, type) ?? null;

        const getFooterValue = typeof _fAggregation === 'function'
            ? () => _fAggregation(dataKey, getData(), getRendered()) ?? _fDefaultValue
            : typeof _fAggregation === 'string'
                ? () => aggregator(_fAggregation) ?? _fDefaultValue
                : () => _fDefaultValue;

        this.cellValueAccessor.set({ getValue, setValue, getFooterValue, formatValue, formatFooter });
    }
}
