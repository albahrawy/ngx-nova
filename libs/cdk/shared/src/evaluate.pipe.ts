import { Pipe, PipeTransform } from '@angular/core';
import { isFunction } from '@ngx-nova/js-extensions';

@Pipe({
    name: 'evaluate',
    standalone: true
})

export class EvaluatePipe implements PipeTransform {

    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
    transform(evaluateFn?: Function | null, ...args: any[]) {
        if (isFunction(evaluateFn))
            return evaluateFn(...args);
        return args?.at(0);
    }
}