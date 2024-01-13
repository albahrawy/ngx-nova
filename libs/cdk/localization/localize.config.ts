import { Injectable, inject } from "@angular/core";
import { IStringDictionary } from "@ngx-nova/js-extensions";
import { Observable, catchError, map, of, throwError } from "rxjs";
import { ILanguage, ILocalizeConfig, NOVA_LOCALIZER_CONFIG_PATH } from "./types";
import { HttpClient } from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class NovaDefaultLocalizerConfig implements ILocalizeConfig {

    private configPath = inject(NOVA_LOCALIZER_CONFIG_PATH, { optional: true });
    private _http = inject(HttpClient);

    appTitle?: string | IStringDictionary;
    languages?: ILanguage[];
    defaultLang?: string;
    localizeSource?: {
        type?: 'local' | 'api',
        path?: string | string[]
    };

    getDefaultLang(): ILanguage | undefined {
        return this.languages?.find(l => l.symbol == this.defaultLang);
    }

    init(mandatory = true): Observable<ILocalizeConfig> {
        const cachDate = new Date().valueOf();
        const configPath = this.configPath || `assets/config/localize.json?x=${cachDate}`;
        return this._http.get<ILocalizeConfig>(configPath).pipe(
            map(config => Object.assign(this, config)),
            catchError(error => {
                if (mandatory)
                    return throwError(() => error);
                else
                    return of(this);
            })
        );
    }
}