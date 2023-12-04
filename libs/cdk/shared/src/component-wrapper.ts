import { ComponentRef } from "@angular/core";
import { isFunction, jsonForEach } from "@ngx-nova/js-extensions";

export class CompositeComponentWrapper<C>{
    private _data = {} as Record<string & keyof C, unknown>;
    componentRef?: ComponentRef<C> | null;

    constructor(defaultFn: () => Partial<C>) {
        if (isFunction(defaultFn)) {
            const defaults = defaultFn();
            jsonForEach(defaults, (k, v) => {
                this._data[k as string & keyof C] = v;
            });
        }
    }

    get component(): C | undefined | null { return this.componentRef?.instance; }
    get htmlElement(): HTMLElement | undefined | null { return this.componentRef?.location.nativeElement; }

    attach(componentRef: ComponentRef<C>): void {
        this.componentRef = componentRef;
        jsonForEach(this._data, (key, value) => {
            componentRef.setInput(key, value);
        });
    }

    detach() {
        this.componentRef?.destroy();
        this.componentRef = null;
    }

    get<K extends string & keyof C>(key: K): C[K] { return this._data[key] as C[K]; }

    set<K extends string & keyof C>(key: K, value: C[K], setComponentValue: boolean = true) {
        this._data[key] = value;
        if (setComponentValue && this.componentRef?.instance)
            this.componentRef.setInput(key, value);
    }
} 