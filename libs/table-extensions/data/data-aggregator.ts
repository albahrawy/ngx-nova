import { arraySort, arraySum, getValue } from "@ngx-nova/js-extensions";
import { Aggregation, IDataAggregator } from "./types";

export class DefaultDataAggregator<T> implements IDataAggregator<T> {
    private _aggregationCache: Record<string, Record<Aggregation, unknown>> = {};
    disableCache: boolean = false;
    private _data: T[] = [];

    setData(data: T[]) {
        this._data = data;
        this.clear();
    }

    aggregate(key: string, type: Aggregation): unknown {
        if (this.disableCache)
            return this.aggregateCore(d => (d as Record<string, unknown>)[key], type);
        else
            return this.aggregateFromCache(key, type);
    }

    refresh(key: string): void {
        delete this._aggregationCache[key];
    }

    clear() {
        this._aggregationCache = {};
    }


    private aggregateFromCache(key: string, type: Aggregation): unknown {
        let entry;
        if (Object.hasOwn(this._aggregationCache, key))
            entry = this._aggregationCache[key];
        else
            this._aggregationCache[key] = entry = {} as Record<Aggregation, unknown>;

        if (Object.hasOwn(entry, type))
            return entry[type];

        const value = this.aggregateCore(d => getValue(d, key), type);
        entry[type] = value;
        return value;
    }

    protected aggregateCore(transform: (item: T) => unknown, type: Aggregation) {
        const data = this._data;
        if (!Array.isArray(data))
            return null;
        switch (type) {
            case 'sum':
                return arraySum(data, transform);
            case 'max':
                return arraySort(data, transform, -1).at(0);
            case 'min':
                return arraySort(data, transform).at(0);
            case 'count':
                return data?.length ?? 0;
            case 'first':
                return data?.at(0);
            case 'last':
                return data?.at(-1);
            case 'avg': {
                const count = data?.length ?? 0;
                return (count > 0) ? arraySum(data, transform) / count : 0;
            }
            default:
                return null;
        }
    }
}
