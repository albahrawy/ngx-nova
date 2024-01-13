import { OverlayModule } from "@angular/cdk/overlay";
import { PortalModule } from "@angular/cdk/portal";
import { NgClass, NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation, booleanAttribute } from "@angular/core";
import { NG_VALUE_ACCESSOR } from "@angular/forms";
import { MatFormFieldControl } from "@angular/material/form-field";
import { matSelectAnimations } from "@angular/material/select";
import { NovaOutletDirective } from "@ngx-nova/cdk/shared";
import { NovaDropdownListBase } from "./drop-down-list-base";
import { ListCategorizedMode, ListFilterPredicate, ListIconType, ListTogglePosition, NovaSelectionListPanel } from '@ngx-nova/selection-list'

let nextUniqueId = 0;

@Component({
  selector: 'nova-select',
  exportAs: 'novaSelect',
  templateUrl: 'nova-select.html',
  styleUrls: ['nova-select.scss'],
  standalone: true,
  imports: [NgClass, OverlayModule, NovaOutletDirective, PortalModule, NgTemplateOutlet],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [matSelectAnimations.transformPanel],
  providers: [
    //MAT_SELECT_SCROLL_STRATEGY_PROVIDER,
    { provide: MatFormFieldControl, useExisting: NovaSelect },
    { provide: NG_VALUE_ACCESSOR, useExisting: NovaSelect, multi: true },
  ],
})
export class NovaSelect<TRow, TValue> extends NovaDropdownListBase<NovaSelectionListPanel<TRow, TValue>, TRow, TValue>{

  protected componentType = NovaSelectionListPanel;
  _uniqueId = `nova-select-${nextUniqueId++}`;
  _valueId = `nova-select-value-${nextUniqueId++}`;
  controlType = 'nova-select';

  protected override setDefaults(): Partial<NovaSelectionListPanel<TRow, TValue>> {
    return {
      showIndex: false,
      disabled: false,
      showTitle: true,
      showSearch: true,
      togglePosition: 'after',
      iconColor: 'primary'
    };
  }

  @Input()
  get filterPredicate(): ListFilterPredicate<TRow> | undefined { return this.listWrapper.get('filterPredicate'); }
  set filterPredicate(value: ListFilterPredicate<TRow> | undefined) { this.listWrapper.set('filterPredicate', value); }

  @Input({ transform: booleanAttribute })
  get showTitle(): boolean { return this.listWrapper.get('showTitle'); }
  set showTitle(value: boolean) { this.listWrapper.set('showTitle', value); }

  @Input({ transform: booleanAttribute })
  get showSearch(): boolean { return this.listWrapper.get('showSearch'); }
  set showSearch(value: boolean) { this.listWrapper.set('showSearch', value); }

  @Input({ transform: booleanAttribute })
  get disableRipple(): boolean { return this.listWrapper.get('disableRipple'); }
  set disableRipple(value: boolean) { this.listWrapper.set('disableRipple', value); }

  @Input()
  get categorized(): ListCategorizedMode { return this.listWrapper.get('categorized'); }
  set categorized(value: ListCategorizedMode) { this.listWrapper.set('categorized', value); }

  @Input({ transform: booleanAttribute })
  get iconType(): ListIconType { return this.listWrapper.get('iconType'); }
  set iconType(value: ListIconType) { this.listWrapper.set('iconType', value); }

  @Input()
  get togglePosition(): ListTogglePosition { return this.listWrapper.get('togglePosition'); }
  set togglePosition(value: ListTogglePosition) { this.listWrapper.set('togglePosition', value); }
}
