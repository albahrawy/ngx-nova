import { InjectionToken } from "@angular/core";
import { IGenericDictionary, IStringDictionary } from "@ngx-nova/js-extensions";
import { Observable } from "rxjs";

export const TRANSLATE_SERVICE = new InjectionToken<ITranslateService>('TRANSLATE_SERVICE');
export const CURRENT_LANGUAGE_STORAGE = new InjectionToken<ICurrentLanguageStorage>('CURRENT_LANGUAGE_STORAGE');
export const NOVA_LOCALIZER = new InjectionToken<INovaLocalizer>('NOVA_LOCALIZER');
export const NOVA_LOCALIZER_CONFIG = new InjectionToken<ILocalizeConfig>('NOVA_LOCALIZER_CONFIG');
export const NOVA_LOCALIZER_CONFIG_PATH = new InjectionToken<string>('NOVA_LOCALIZER_CONFIG_PATH');

export interface ICurrentLanguageStorage {
    /**
     * Get the last language that the user chose.
     * @returns The language code.
     */
    getLanguage(): ILanguage;

    /**
     * Set the last language that the user chose.
     * @param language The language code.
     */
    setLanguage(language: ILanguage): void;
}

export interface ILanguage {
    symbol: string;
    name?: string;
    isRTL: boolean;
}

export interface ILangChangeEvent {
    language: ILanguage
    translations: IGenericDictionary;
}

export interface ITranslateService {
    getLanguageStore(lang: string): Observable<IGenericDictionary>;
}

export interface INovaLocalizer {
    //readonly current: ILanguage;
    readonly onChange: Observable<ILangChangeEvent>;
    translate<T extends string | string[] | IStringDictionary = string>
        (value: string | IStringDictionary, returnOriginal?: boolean, prefix?: string): T | null;
    changeLang(lang: ILanguage): void;
    init(mandatory?: boolean): Observable<ILangChangeEvent>;
    currentLang(): string;
}

export declare interface ILocalizeConfig {
    appTitle?: string | IStringDictionary;
    languages?: ILanguage[];
    defaultLang?: string;
    localizeSource?: {
        type?: 'local' | 'api',
        path?: string | string[]
    };
    init(mandatory?: boolean): Observable<ILocalizeConfig>;
    getDefaultLang(): ILanguage | undefined;
}