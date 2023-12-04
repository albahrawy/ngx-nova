import { Direction, Directionality } from '@angular/cdk/bidi';
import { DOCUMENT } from '@angular/common';
import { EventEmitter, Injectable, inject } from '@angular/core';
import { IGenericDictioanry, IStringDictioanry, getValue } from '@ngx-nova/js-extensions';
import { Observable, switchMap, take } from 'rxjs';
import { CURRENT_LANGUAGE_STORAGE, ILangChangeEvent, ILanguage, INovaLocalizer, NOVA_LOCALIZER_CONFIG, TRANSLATE_SERVICE } from './types';

const _defaultLang: ILanguage = { symbol: 'en', isRTL: false };

@Injectable({ providedIn: 'root' })
export class NovaDefaultLocalizer implements INovaLocalizer {

  #_current?: ILanguage;
  #_cached: Map<string, IGenericDictioanry> = new Map();
  get current() { return this.#_current || _defaultLang; }
  readonly onChange = new EventEmitter<ILangChangeEvent>();

  protected _translator = inject(TRANSLATE_SERVICE, { optional: true });
  protected _langStorage = inject(CURRENT_LANGUAGE_STORAGE, { optional: true });
  private _document = inject(DOCUMENT, { optional: true });
  private _dir = inject(Directionality, { optional: true });
  private _config = inject(NOVA_LOCALIZER_CONFIG, { optional: true });

  translate<T extends string | string[] | IStringDictioanry = string>
    (value: string | IStringDictioanry, returnOriginal?: boolean, prefix?: string): T | null {
    if (!value) {
      return null;
    }
    let _value: string | string[] | IStringDictioanry | null = null;
    if (typeof value === 'object' && value.constructor === Object) {
      _value = value[this.current.symbol] ?? value['en'];
    } else if (typeof value === 'string') {
      const langStore = this.#_cached.get(this.current.symbol);
      if (langStore) {
        const prefixedValue = prefix ? prefix + value : value;
        _value = prefixedValue.includes('.') ? getValue(langStore, prefixedValue) : langStore[value];
      }
    }
    if (!_value && returnOriginal)
      _value = value;
    return _value as T;
  }

  changeLang(lang: ILanguage): void {
    if (lang.symbol !== this.#_current?.symbol) {
      if (this.#_cached.has(lang.symbol)) {
        this.applyLanguage(lang, this.#_cached.get(lang.symbol)!);
      }

      if (this._translator) {
        this._translator.getLanguageStore(lang.symbol).pipe(take(1)).subscribe(data => {
          this.#_cached.set(lang.symbol, data);
          this.applyLanguage(lang, data);
        });
      } else {
        this.applyLanguage(lang, {});
      }
    }
  }

  applyLanguage(lang: ILanguage, data: IGenericDictioanry): void {
    const direction = lang?.isRTL ? 'rtl' : 'ltr';
    this.#_current = lang;
    if (this._document) {
      this._document.dir = direction;
      this._document.body.className = direction;
      this._document.documentElement.lang = lang.symbol;
      this._document.title = this.getAppTitle(lang.symbol);
    }
    this._langStorage?.setLanguage(lang);
    if (this._dir) {
      (this._dir as { value: Direction }).value = direction;
      this._dir.change.emit(direction);
    }
    this.onChange.emit({ language: lang, translations: data });
  }

  init(mandatory = true): Observable<ILangChangeEvent> {
    if (this._config)
      return this._config.init(mandatory).pipe(take(1), switchMap(c => this._init(c.getDefaultLang())));
    else
      return this._init();
  }

  private _init(defaultLang?: ILanguage): Observable<ILangChangeEvent> {
    const lang = this._langStorage?.getLanguage() ?? defaultLang ?? _defaultLang;
    setTimeout(() => this.changeLang(lang));
    return this.onChange.asObservable().pipe(take(1));
  }

  private getAppTitle(lang: string): string {
    const title = this._config?.appTitle;
    if (title) {
      if (typeof title === 'string')
        return title;
      return title[lang];
    }
    return '';

  }
}
