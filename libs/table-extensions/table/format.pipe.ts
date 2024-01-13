import { Pipe, PipeTransform } from "@angular/core";
import { NovaTranslatePipe } from "@ngx-nova/cdk/localization";
import { IStringDictionary } from '@ngx-nova/js-extensions';
import { FormatterFn } from '@ngx-nova/table-extensions/data';
@Pipe({
    name: 'formatTranslate',
    pure: false,
    standalone: true
})
export class FormatTranslatePipe extends NovaTranslatePipe implements PipeTransform {
    //@ts-expect-error dif in override
    override transform<V>(value?: string | IStringDictionary | FormatterFn<V> | null, returnOriginal: boolean = true, prefix?: string): string | FormatterFn<V> | null {
        if (typeof value === 'function')
            return value;
        return super.transformValue(value, returnOriginal, prefix) as string | null;
    }
}