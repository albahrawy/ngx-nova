import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { SelectionModel } from '@angular/cdk/collections';
import { _getFocusedElementPierceShadowDom } from '@angular/cdk/platform';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
    AfterViewChecked,
    AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges,
    OnDestroy, Output, QueryList, Signal, SimpleChanges, TemplateRef, ViewChild, ViewChildren, ViewEncapsulation, WritableSignal, booleanAttribute, computed, inject, numberAttribute, signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ThemePalette } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatList, MatListModule, MatListOptionTogglePosition } from '@angular/material/list';
import { BehaviorSubject, switchMap } from 'rxjs';

import {
    EvaluatePipe, ISelectionListChange, ListBindingConfig, ListMemberGetterType, NovaDataSource, convertToObservable,
    preventEvent, focusElement
} from '@ngx-nova/cdk/shared';
import { toStringValue } from '@ngx-nova/js-extensions';
import { NovaListOption, NOVA_SELECTION_LIST, INovaSelectionList } from './list-option';
import { ListCategorizedMode, ListFilterPredicate, ListIconType, ListTogglePosition } from './types';

const OPTION_TAG_NAME = 'NOVA-LIST-OPTION';
const DefaultFilterFn: <T>(data: T, filter: string) => boolean = (d, f) => toStringValue(d).includes(f);
type CategorizedData<T> = { filtered: readonly T[], selected: readonly T[], noneSelected: readonly T[] };

interface MatVirtualSelectionListChangeBase<TRow, TValue = unknown> extends ISelectionListChange<TValue> {
    list: NovaSelectionListPanel<TRow, TValue>;
    type: 'select' | 'deselect';
}

interface MatVirtualSelectionListAllChange<TRow, TValue = unknown> extends MatVirtualSelectionListChangeBase<TRow, TValue> {
    selectedData: readonly TRow[];
    reason: 'all';
}

interface MatVirtualSelectionListSingleChange<TRow, TValue = unknown> extends MatVirtualSelectionListChangeBase<TRow, TValue> {
    optionData: TRow;
    optionValue?: TValue;
    reason: 'option';
}

export type MatVirtualSelectionListChange<TRow, TValue = unknown> =
    MatVirtualSelectionListSingleChange<TRow, TValue> | MatVirtualSelectionListAllChange<TRow, TValue>;

@Component({
    selector: 'nova-selection-list-panel',
    templateUrl: './selection-list.html',
    styleUrls: ['./selection-list.scss'],
    standalone: true,
    host: {
        'class': 'mat-mdc-selection-list mat-mdc-list-base mdc-list nova-selection-list',
        'role': 'listbox',
        '[id]': 'id',
        '[attr.aria-multiselectable]': 'multiple',
        '[class.nova-list--hasIcon]': 'showIcon',
        '[class.nova-list--hasIndex]': 'showIndex',
        '[style.--nova-virtual-list-item-height.px]': 'optionHeight',
        '(keydown)': '_handleKeydown($event)',
    },
    imports: [MatInputModule, MatDividerModule, EvaluatePipe, NovaListOption,
        MatIconModule, MatListModule, ScrollingModule, NgTemplateOutlet],
    providers: [
        { provide: MatList, useExisting: NovaSelectionListPanel },
        { provide: NOVA_SELECTION_LIST, useExisting: NovaSelectionListPanel },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class NovaSelectionListPanel<TRow, TValue = unknown>
    extends MatList implements INovaSelectionList<TRow, TValue>, AfterViewInit, AfterViewChecked, OnChanges, OnDestroy {

    //#region input private fields

    private _multiple = true;
    private _filterPredicate?: ListFilterPredicate<TRow> = DefaultFilterFn;
    private _categorized: ListCategorizedMode;
    private _dataSource: NovaDataSource<TRow>
    private _needToSetFocus = false;

    //#endregion

    //#region life cycle private fields

    private _activeOption: { parent: HTMLElement; index: number; } | null = null;
    private _initialized = false;
    private _isDestroyed: boolean = false;

    //#region 


    //#endregion binding/selection fields

    _bindingConfig = new ListBindingConfig<TRow, TValue>();
    selectedOptions = new SelectionModel<TValue>(this._multiple);

    //#endregion

    //#region injections

    public _elementRef = inject(ElementRef);
    private _ngZone = inject(NgZone);

    //#endregion

    _optionHeight = signal(48);

    protected _optIconPosition: MatListOptionTogglePosition = 'before';
    protected _optTogglePosition: MatListOptionTogglePosition = 'after';
    protected _optToggleType: 'radio' | 'check' | undefined = 'check';
    protected _optIconType: 'icon' | 'avatar' | undefined;

    protected iconTemplate?: TemplateRef<unknown>;
    protected indexTemplate?: TemplateRef<unknown>;
    protected titleTemplate?: TemplateRef<unknown>;

    private _dataSourceSubject = new BehaviorSubject<NovaDataSource<TRow>>([]);
    private _dataSourceStream = this._dataSourceSubject.pipe(switchMap(ds => convertToObservable(ds)));
    private _allData = toSignal(this._dataSourceStream, { initialValue: [] });

    private _filter = signal<string | undefined | null>(null);
    private _isCategorized = signal(false);
    private _coreValue: WritableSignal<TValue[] | null> = signal(null);

    _selectedHeight = computed(() => this._data().selected.length * this._optionHeight());
    _data: Signal<CategorizedData<TRow>> = computed(() => {
        const allData = this._allData();
        const filter = this._filter();
        if (this._isCategorized()) {
            const { selected, noneSelected, filtered } = this._getCategorizedData(allData, filter, this._coreValue());
            return { filtered, selected, noneSelected };
        } else {
            let filtered = allData;
            if (filter) {
                const filterPredicate = this.filterPredicate ?? this._filterPredicate ?? DefaultFilterFn;
                filtered = allData.filter(i => filterPredicate(i, filter));
            }
            return { filtered, selected: [], noneSelected: [] };
        }
    });

    constructor() {
        super();
        this._isNonInteractive = false;
    }

    @ViewChildren(NovaListOption) _items?: QueryList<NovaListOption<TRow>>;
    @ViewChildren(CdkVirtualScrollViewport) _viewports?: QueryList<CdkVirtualScrollViewport>;

    @ViewChild('iconTemp', { static: true }) private _iconTemplate?: TemplateRef<unknown>;
    @ViewChild('avatarTemp', { static: true }) private _avatarTemplate?: TemplateRef<unknown>;
    @ViewChild('indexTemp', { static: true }) private _indexTemplate?: TemplateRef<unknown>;
    @ViewChild('titleTemp', { static: true }) private _titleTemplate?: TemplateRef<unknown>;
    @ViewChild('searchInput') private _searchInput?: ElementRef<HTMLInputElement>;

    @Output() readonly selectionChange: EventEmitter<MatVirtualSelectionListChange<TRow, TValue>> = new EventEmitter();

    @Input() filterPredicate?: ListFilterPredicate<TRow>;
    @Input({ transform: booleanAttribute }) showIndex: boolean = false;
    @Input({ transform: booleanAttribute }) showTitle: boolean = true;
    @Input({ transform: booleanAttribute }) showSearch: boolean = true;
    @Input() togglePosition: ListTogglePosition = 'after';
    @Input() iconType: ListIconType = 'none';
    @Input() iconColor: ThemePalette = 'primary';
    @Input() color: ThemePalette = 'accent';

    @Input()
    get value(): TValue | TValue[] | null {
        const _signalValue = this._coreValue();
        const _value = _signalValue == null ? null : this.multiple ? _signalValue : _signalValue[0] ?? null;
        return _value;
    }
    set value(newValue: TValue | TValue[] | null) {
        this._setValue(newValue);
        this._notifyValueChange();
    }

    @Input()
    get categorized(): ListCategorizedMode { return this._categorized; }
    set categorized(value: ListCategorizedMode) {
        if (this._categorized != value) {
            this._categorized = value;
            this._isCategorized.set(value === 'split' || value === 'sticky');
        }
    }

    @Input({ transform: numberAttribute })
    get optionHeight(): number { return this._optionHeight() }
    set optionHeight(value: number) {
        this._optionHeight.set(value);
    }

    @Input()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: BooleanInput) {
        const newValue = coerceBooleanProperty(value);
        if (newValue !== this._multiple) {
            let oldSelected = this.selectedOptions.selected;
            this._multiple = newValue;
            if (this._initialized) {
                if (!newValue && oldSelected?.length > 1)
                    oldSelected = [oldSelected[0]];
                this.value = oldSelected;
            }

            this.selectedOptions = new SelectionModel(this._multiple, oldSelected);
            if (this._initialized) {
                this._updateOptionsParts();
            }
        }
    }

    @Input()
    get displayMember(): ListMemberGetterType<TRow> { return this._bindingConfig.displayMember; }
    set displayMember(value: ListMemberGetterType<TRow>) {
        this._bindingConfig.displayMember = value;
        const _titleFn = this._bindingConfig.displayMemberFn;
        this._filterPredicate = _titleFn ? ((d, f) => _titleFn(d)?.includes(f)) : DefaultFilterFn;
    }

    @Input()
    get valueMember(): ListMemberGetterType<TRow, TValue> { return this._bindingConfig.valueMember; }
    set valueMember(value: ListMemberGetterType<TRow, TValue>) { this._bindingConfig.valueMember = value; }

    @Input()
    get iconMember(): ListMemberGetterType<TRow> { return this._bindingConfig.iconMember; }
    set iconMember(value: ListMemberGetterType<TRow>) { this._bindingConfig.iconMember = value; }

    @Input()
    get disableMember(): ListMemberGetterType<TRow, boolean> { return this._bindingConfig.disableMember; }
    set disableMember(value: ListMemberGetterType<TRow, boolean>) { this._bindingConfig.disableMember = value; }

    @Input()
    get dataSource(): NovaDataSource<TRow> { return this._dataSource; }
    set dataSource(value: NovaDataSource<TRow>) {
        this._dataSource = value;
        this._dataSourceSubject.next(value);
    }

    deselectAll(): void {
        if (!this.multiple)
            return;
        this.selectedOptions.setSelection(...[]);
        this._reportValueChange();
        this._markOptionsForCheck();
        this._markViewportsForCheck();
        this.selectionChange.emit({ list: this, type: 'deselect', selectedData: [], value: this.value, reason: 'all' });
    }

    selectAll(onlyFiltered: boolean = false): void {
        if (!this.multiple)
            return;
        const _data = onlyFiltered && this._filter() ? this._data().filtered : this._allData();
        const allSeelcted = this._bindingConfig.getAllActiveValues(_data) ?? [];
        this.selectedOptions.setSelection(...allSeelcted);
        this._reportValueChange();
        this._markOptionsForCheck();
        this._markViewportsForCheck();
        this.selectionChange.emit({ list: this, type: 'select', selectedData: _data, value: this.value, reason: 'all' });
    }

    getSelectedData(): TRow[] {
        return this._bindingConfig.getSelectedItems(this._allData(), this._coreValue()) ?? [];
    }

    getSelectedTitles(): string[] {
        return this._bindingConfig.getSelectedTitles(this._allData(), this._coreValue()) ?? [];
    }

    setFilter(value?: string | null) {
        this._filter.set(value);
    }

    _onFilterInput(event: Event) {
        const filterValue = (event.target as HTMLInputElement)?.value;
        this.setFilter(filterValue);
    }

    _identify = (index: number, item: TRow) => {
        return this._bindingConfig.valueMemberFn ? this._bindingConfig.valueMemberFn(item) : item;
    }

    _handleKeydown(event: KeyboardEvent) {
        const el = event.target as HTMLElement;
        if (el.tagName !== OPTION_TAG_NAME)
            return;
        switch (event.code) {
            case 'Tab':
                this._searchInput?.nativeElement?.focus();
                preventEvent(event);
                break;
            case 'Enter':
            case 'Space':
                el.click();
                preventEvent(event);
                break;
            case 'ArrowDown': {
                const next = this.getNextElement(el);
                if (next) {
                    preventEvent(event);
                    focusElement(next);
                }
                break;
            }
            case 'PageUp':
            case 'PageDown':
                this.performPageUpDown(el);
                break;
            case 'ArrowUp': {
                const prev = this.getPreviousElement(el);
                if (prev) {
                    preventEvent(event);
                    focusElement(prev);
                }
                break;
            }
            case "KeyA":
                if (this.multiple && event.ctrlKey) {
                    preventEvent(event);
                    this.selectAll(true);
                }
                break;
        }
    }

    _emitChangeEvent(option: NovaListOption<TRow, TValue>) {
        if (this._isCategorized()) {
            const el = option._elementRef.nativeElement as HTMLLIElement;
            const parent = el.parentElement;
            if (parent) {
                const index = Array.from(parent.childNodes).indexOf(el);
                this._activeOption = { parent, index };
            }
        }
        this._reportValueChange(true);
        this.selectionChange.emit({
            list: this, type: option.selected ? 'select' : 'deselect',
            optionValue: option.value, optionData: option.data,
            value: this.value,
            reason: 'option'
        });
    }

    _changeOptionValue(option: NovaListOption<TRow, TValue>, selected: boolean) {
        if (selected) {
            if (!this.multiple) {
                const old_value = this.selectedOptions.selected[0];
                if (old_value)
                    this._items?.find(o => o.value === old_value)?._markForCheck();
                if (option.value == null)
                    this.selectedOptions.clear();
            }
            if (option.value != null)
                this.selectedOptions.select(option.value);
        } else {
            if (option.value != null)
                this.selectedOptions.deselect(option.value);
        }

        option._markForCheck();
        this._emitChangeEvent(option);
    }

    _notifyTouched() {

    }

    isSelected(value: TValue | null): boolean {
        return (value == null && this.value == null && !this.multiple)
            || (value != null && this.selectedOptions.isSelected(value));
    }

    protected _verifyValues() {
        // const selectedSet = this._value ?? [];
        // if (selectedSet.length > 0) {
        //     const _newSet = new Set(this._data.all.map(d => this._getValueFn()(d)));
        //     const exitsInNewSet = selectedSet.filter(item => _newSet.has(item));
        //     if (exitsInNewSet.length != selectedSet.length) {
        //         this._setValue(exitsInNewSet);
        //         this._notifyValueChange();
        //     }
        // }
    }

    protected onValueSet(value: TValue[], fromClick: boolean = false) {
        if (fromClick && this.categorized === 'split' && value?.length > this._data().selected.length) {
            setTimeout(() => this._getViewPort('selected')?.scrollToIndex(value.length, 'smooth'), 10);
        }
        this._coreValue.set(value);
    }

    protected getPreviousElement(optionElement: HTMLElement): HTMLElement | null {
        const el = optionElement.previousElementSibling as HTMLElement;
        if (!el && this.categorized === 'split') {
            const _parentElement = optionElement.parentElement;
            if (_parentElement && _parentElement === this._getViewPort('none-selected')?._contentWrapper.nativeElement) {
                const selected = this._getViewPort('selected')?._contentWrapper.nativeElement;
                if (selected) {
                    const _lastElementInVirtual = selected.lastElementChild as HTMLElement;
                    if (_lastElementInVirtual?.tagName == OPTION_TAG_NAME) {
                        return _lastElementInVirtual;
                    }
                }
            }
        }
        return el;
    }

    protected getNextElement(optionElement: HTMLElement): HTMLElement | null {
        const el = optionElement.nextElementSibling as HTMLElement;
        if (!el && this.categorized === 'split') {
            const _parentElement = optionElement.parentElement;
            if (_parentElement && _parentElement === this._getViewPort('selected')?._contentWrapper.nativeElement) {
                const noneSelected = this._getViewPort('none-selected')?._contentWrapper.nativeElement;
                if (noneSelected) {
                    const _firstElementInVirtual = noneSelected.firstElementChild as HTMLElement;
                    if (_firstElementInVirtual?.tagName == OPTION_TAG_NAME) {
                        return _firstElementInVirtual;
                    }
                }
            }
        }
        return el;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected performPageUpDown(el: HTMLElement) {
        // setTimeout(() => {
        //     this._element.nativeElement.focus();
        //     if (document.activeElement?.tagName === OptionTagName) {
        //         (document.activeElement as HTMLElement).focus();
        //     }
        // }, 300);
        // const _viewPortWrapper = el.parentElement;
        // const _viewport = _viewPortWrapper?.parentElement;
        // if (_viewport) {
        //     const olcPosition = el.getBoundingClientRect().top;
        //     setTimeout(() => {
        //         const childs = _viewPortWrapper.children;
        //         let diffTop = 0;
        //         for (let i = 0; i < childs.length - 1; i++) {
        //             const newEl1 = childs.item(i)! as HTMLElement;
        //             const newEl2 = childs.item(i + 1)! as HTMLElement;
        //             const el1Top = newEl1.getBoundingClientRect().top;
        //             const el2Top = newEl2.getBoundingClientRect().top;
        //             if (el1Top < 0 && el2Top > 0) {
        //                 diffTop = -el1Top;
        //             }
        //             if (numbers.between(olcPosition + diffTop, el1Top, el2Top)) {
        //                 newEl1.focus();
        //                 console.log(olcPosition, newEl1.getBoundingClientRect().top, diffTop);
        //                 break;
        //             }
        //         }
        //     }, 300);
        // }
    }

    ngAfterViewInit() {
        this._initialized = true;
        this._ngZone.runOutsideAngular(() => {
            this._elementRef.nativeElement.addEventListener('focusin', this._handleFocusin);
            this._elementRef.nativeElement.addEventListener('focusout', this._handleFocusout);
        });
        this._updateTemplateRefs();
        this._updateOptionsParts();
    }

    ngOnChanges(changes: SimpleChanges) {
        if ('iconType' in changes || 'showTitle' in changes || 'showIndex' in changes)
            this._updateTemplateRefs();
        if ('iconType' in changes || 'togglePosition' in changes)
            this._updateOptionsParts();
        const disabledChanges = changes['disabled'];
        const disableRippleChanges = changes['disableRipple'];
        if (
            (disableRippleChanges && !disableRippleChanges.firstChange) ||
            (disabledChanges && !disabledChanges.firstChange)
        ) {
            this._markOptionsForCheck();
        }
    }

    private _updateTemplateRefs() {
        this.iconTemplate = this.iconType === 'icon'
            ? this._iconTemplate : this.iconType === 'avatar'
                ? this._avatarTemplate : undefined;

        this.titleTemplate = this.showTitle ? this._titleTemplate : undefined;

        this.indexTemplate = this.showIndex ? this._indexTemplate : undefined;
    }

    private _updateOptionsParts() {
        this._optToggleType = this.togglePosition === 'none' ? undefined : this.multiple ? 'check' : 'radio';
        this._optIconType = !this.iconType || this.iconType === 'none' ? undefined : this.iconType;
        this._optTogglePosition = !this.togglePosition || this.togglePosition === 'none' ? 'after' : this.togglePosition;
        this._optIconPosition = this._optTogglePosition === 'after' ? 'before' : 'after';
    }

    ngAfterViewChecked(): void {
        if (this._activeOption && this._isCategorized()) {
            const activeOption = this._activeOption;
            this._activeOption = null;
            setTimeout(() => {
                if (this._isCategorized()) {
                    const children = activeOption.parent.children;
                    const _activeIndex = Math.min(activeOption.index, children.length - 1);
                    (children[_activeIndex] as HTMLElement)?.focus();
                }
            }, 100);
        } else if (this._needToSetFocus) {
            this._needToSetFocus = false;
            setTimeout(() => this.focus(), 100);
        }
    }

    ngOnDestroy() {
        this._isDestroyed = true;
        this._elementRef.nativeElement.removeEventListener('focusin', this._handleFocusin);
        this._elementRef.nativeElement.removeEventListener('focusout', this._handleFocusout);
    }

    focus(options?: FocusOptions) {
        if (!this._initialized) {
            this._needToSetFocus = true;
            return;
        }
        if (this._items?.length) {
            this._items.get(0)?.focus();
        } else if (this._searchInput && this.showSearch) {
            this._searchInput.nativeElement.focus(options);
        }
        else {
            this._elementRef.nativeElement.focus();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected notifyFocused(focused: boolean) {

    }

    //#region data process

    private _getCategorizedData(data: readonly TRow[], filter?: string | null, value?: TValue[] | null) {
        const selected: TRow[] = [];
        const noneSelected: TRow[] = [];
        const selectedSet = new Set(value ?? []);
        const _cValueFn = this._bindingConfig.valueMemberFn ?? (i => i);
        for (const item of data) {
            if (selectedSet.size && selectedSet.has(_cValueFn(item))) {
                selected.push(item);
            } else {
                if (filter) {
                    const filterPredicate = this.filterPredicate ?? this._filterPredicate ?? DefaultFilterFn;
                    if (filterPredicate(item, filter))
                        noneSelected.push(item);
                } else {
                    noneSelected.push(item);
                }
            }
        }
        const filtered = this.categorized === 'sticky' ? selected.concat(noneSelected) : [];
        return { selected, noneSelected, filtered };
    }

    //#endregion

    protected _setValue(value?: TValue | TValue[] | null) {
        let _value = value == null ? [] : !Array.isArray(value) ? [value] : value;
        if (!this.multiple && _value && _value.length > 1)
            _value = _value.slice(0, 1);
        this.selectedOptions.setSelection(..._value);
        this.onValueSet(_value);
        this._markOptionsForCheck();
    }

    private _reportValueChange(fromClick: boolean = false) {
        if (!this._isDestroyed) {
            this.onValueSet(this.selectedOptions.selected, fromClick);
            this._notifyValueChange();
        }
    }

    protected _notifyValueChange() {
    }

    protected _markOptionsForCheck() {
        if (this._items)
            this._items.forEach(option => option._markForCheck());
    }

    private _markViewportsForCheck() {
        if (this._viewports)
            this._viewports.forEach(viewport => viewport.scrollToOffset(0));
    }

    private _handleFocusout = () => {
        // Focus takes a while to update so we have to wrap our call in a timeout.
        setTimeout(() => {
            if (!this._containsFocus()) {
                this.notifyFocused(false);
            }
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _handleFocusin = (event: FocusEvent) => {
        if (this.disabled) {
            return;
        }
        this.notifyFocused(true);
    };

    private _containsFocus() {
        const activeElement = _getFocusedElementPierceShadowDom();
        return activeElement && this._elementRef.nativeElement.contains(activeElement);
    }

    private _getViewPort(id: string) {
        return this._viewports?.find(i => i.elementRef.nativeElement.id === id);
    }
}