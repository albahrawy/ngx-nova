import { isObject } from "@ngx-nova/js-extensions";
import { TableFilterElementBase } from "./component/table-filter-element.base";
import { ITableFilterElement } from "./types";

export function isTableFilterElement(value: unknown): value is ITableFilterElement<unknown> {
    if (!value)
        return false;
    if (value instanceof TableFilterElementBase)
        return true;
    const _value = value as ITableFilterElement<unknown>;
    return typeof _value.registerClearFilter === 'function'
        && typeof _value.registerClearFilter == 'function'
        && _value.predicates && isObject(_value.predicates) && !!Object.keys(_value.predicates).length
        && !Object.values(_value.predicates).some(p => typeof p !== 'function');
}