import { Pipe, PipeTransform, inject } from '@angular/core';
import { IStringDictionary } from '@ngx-nova/js-extensions';
import { NovaDefaultLocalizer } from './localizer';
import { NOVA_LOCALIZER } from './types';

//TODO: check pure - true
@Pipe({ name: '' })
// eslint-disable-next-line @angular-eslint/use-pipe-transform-interface
abstract class NovaTranslateBasePipe {

    protected localizer = inject(NOVA_LOCALIZER, { optional: true }) ?? inject(NovaDefaultLocalizer);
    private lastKey: string | IStringDictionary | null = null;
    private lastValue: string | string[] | IStringDictionary | null = null;
    private lastLang: string | null = null;

    protected transformValue<T extends string | string[] | IStringDictionary = string>
        (value?: string | IStringDictionary | null, returnOriginal: boolean = true, prefix?: string): T | null {
        if (!value)
            return null;
        if (this.lastKey === value && this.lastLang === this.localizer.currentLang())
            return this.lastValue as T;

        this.lastKey = value;
        this.lastLang = this.localizer.currentLang();
        this.lastValue = this.localizer?.translate?.(value, returnOriginal, prefix) ?? null;
        return this.lastValue as T;
    }
}

@Pipe({
    name: 'novaTranslate',
    pure: false,
    standalone: true
})
export class NovaTranslatePipe extends NovaTranslateBasePipe implements PipeTransform {

    transform(value?: string | IStringDictionary | null, returnOriginal: boolean = true, prefix?: string): string | null {
        return super.transformValue(value, returnOriginal, prefix);
    }
}

@Pipe({
    name: 'novaTranslateArray',
    pure: false,
    standalone: true
})
export class NovaTranslateArrayPipe extends NovaTranslateBasePipe implements PipeTransform {

    transform(value?: string | IStringDictionary | null, returnOriginal: boolean = true, prefix?: string): string[] | null {
        return super.transformValue<string[]>(value, returnOriginal, prefix);
    }
}

@Pipe({
    name: 'novaTranslateObj',
    pure: false,
    standalone: true
})
export class NovaTranslateObjectPipe extends NovaTranslateBasePipe implements PipeTransform {

    transform(value?: string | IStringDictionary | null, returnOriginal: boolean = true, prefix?: string): IStringDictionary | null {
        return super.transformValue<IStringDictionary>(value, returnOriginal, prefix);
    }
}