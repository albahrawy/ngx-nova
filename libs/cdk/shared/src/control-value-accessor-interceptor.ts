import { ControlValueAccessor, DefaultValueAccessor } from "@angular/forms";
import { isArray } from "@ngx-nova/js-extensions";
const noOp: (v: unknown) => void = () => { };

export function createValueAccessorInterceptor(valueAccessor: ControlValueAccessor | readonly ControlValueAccessor[] | undefined | null,
    onWriteValue: (value: unknown) => void) {
    const _valueAccessor = getActiveAcessor(valueAccessor);
    if (_valueAccessor) {
        const _origAccessorWriteValue = _valueAccessor.writeValue.bind(_valueAccessor);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _valueAccessor.writeValue = (value: any) => {
            _origAccessorWriteValue(value);
            onWriteValue(value);
        }

        const _origAccessorRegisterChange = _valueAccessor.registerOnChange.bind(_valueAccessor);
        const proxy = { change: noOp };
        _valueAccessor.registerOnChange = (fn: () => void) => {
            _origAccessorRegisterChange(fn);
            proxy.change = fn;
        }
        return proxy;
    }
    return null;
}


function getActiveAcessor(valueAccessor: ControlValueAccessor | readonly ControlValueAccessor[] | undefined | null)
    : ControlValueAccessor | null {
    if (isArray(valueAccessor)) {
        if (valueAccessor.length == 1)
            return valueAccessor[0];
        else if (valueAccessor.length > 1) {
            const accessors: { default?: ControlValueAccessor, builtIn?: ControlValueAccessor, custom?: ControlValueAccessor } = {};
            valueAccessor.forEach(a => {
                if (a.constructor === DefaultValueAccessor) {
                    accessors.default = a;
                }
                else if (Object.getPrototypeOf(valueAccessor.constructor).name === 'BuiltInControlValueAccessor') {
                    if (!accessors.builtIn)
                        accessors.builtIn = a;
                }
                else if (!accessors.custom) {
                    accessors.custom = a;
                }
            });
            return accessors.custom ?? accessors.builtIn ?? accessors.default ?? null;
        }
    } else if (valueAccessor) {
        return valueAccessor;
    }
    return null;
}