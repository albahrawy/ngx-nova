import { Pipe, PipeTransform } from '@angular/core';
import { IDictionary, Nullable, jsonToKeyValueArray } from '@ngx-nova/js-extensions';

@Pipe({
    name: 'loop',
    standalone: true
})
export class JsonLoopPipe implements PipeTransform {
    transform<TValue>(value: Nullable<IDictionary<TValue>>): Array<{ key: string, value: TValue }> {
        return jsonToKeyValueArray(value);
    }
}