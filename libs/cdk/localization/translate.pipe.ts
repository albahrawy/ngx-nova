import { ChangeDetectorRef, Inject, Optional, Pipe, PipeTransform, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IStringDictioanry } from '@ngx-nova/js-extensions';
import { NovaDefaultLocalizer } from './localizer';
import { INovaLocalizer, NOVA_LOCALIZER } from './types';
//TODO: check pure - true
@Pipe({ name: '' })
// eslint-disable-next-line @angular-eslint/use-pipe-transform-interface
abstract class NovaTranslateBasePipe  {

    private lastKey: string | null = null;

    constructor(private cdr: ChangeDetectorRef,
        @Optional() @Inject(NOVA_LOCALIZER) protected localizer?: INovaLocalizer) {
        this.localizer = localizer ?? inject(NovaDefaultLocalizer);
        this.localizer?.onChange.pipe(takeUntilDestroyed()).subscribe(() => {
            this.lastKey = null;
            this.cdr.markForCheck();
        });
    }

    protected transformValue<T extends string | string[] | IStringDictioanry = string>
        (value?: string | IStringDictioanry, returnOriginal: boolean = true, prefix?: string): T | null {
        if (!value)
            return null;
        if (this.lastKey)
            return this.lastKey as T;

        this.lastKey = this.localizer?.translate?.(value, returnOriginal, prefix) ?? null;
        return this.lastKey as T;
    }
}

@Pipe({
    name: 'novaTranslate',
    pure: false,
    standalone: true
})
export class NovaTranslatePipe extends NovaTranslateBasePipe implements PipeTransform {

    transform(value?: string | IStringDictioanry, returnOriginal: boolean = true, prefix?: string): string | null {
        return super.transformValue(value, returnOriginal, prefix);
    }
}

@Pipe({
    name: 'novaTranslateArray',
    pure: false,
    standalone: true
})
export class NovaTranslateArrayPipe extends NovaTranslateBasePipe implements PipeTransform {

    transform(value?: string | IStringDictioanry, returnOriginal: boolean = true, prefix?: string): string[] | null {
        return super.transformValue<string[]>(value, returnOriginal, prefix);
    }
}

@Pipe({
    name: 'novaTranslateObj',
    pure: false,
    standalone: true
})
export class NovaTranslateObjectPipe extends NovaTranslateBasePipe implements PipeTransform {

    transform(value?: string | IStringDictioanry, returnOriginal: boolean = true, prefix?: string): IStringDictioanry | null {
        return super.transformValue<IStringDictioanry>(value, returnOriginal, prefix);
    }
}