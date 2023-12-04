import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { isArray, joinAsPath } from "@ngx-nova/js-extensions";
import { Observable, ReplaySubject, defer, map, of, switchMap, tap, throwError } from "rxjs";
import { ApiConfig, IHttpUrlResolver, NOVA_REST_API_CONFIG_PATH } from "./types";

const absUrlRegex = /^[a-zA-Z]+:\/\//;
const relUrlRegex = /^~/;

@Injectable({ providedIn: 'root' })
export class NovaHttpUrlResolver implements IHttpUrlResolver {

    private apiConfig$ = new ReplaySubject<ApiConfig>(1); // ReplaySubject with buffer size 1

    private http = inject(HttpClient);
    private configPath = inject(NOVA_REST_API_CONFIG_PATH, { optional: true }) ?? 'assets/config/api.json';

    getUrl(url: string | string[], segments: string[] = []): Observable<string> {
        return this._loadConfig().pipe(switchMap(config => this._getUrl(config, url, segments)));
    }

    private _loadConfig(): Observable<ApiConfig> {
        if (this.apiConfig$.observed) {
            return this.apiConfig$;
        }

        return this.http.get<ApiConfig>(this.configPath).pipe(
            map(config => this._iniateConfig(config)),
            tap(config => this.apiConfig$.next(config)),
        );
    }

    private _iniateConfig(config?: ApiConfig): ApiConfig {
        config ??= {} as ApiConfig;
        if (config.base?.search(/(^\w+:|^)\/\//) === -1)
            config.base = joinAsPath(location.protocol, location.hostname, config.base);

        return config;
    }


    private _getUrlCore(apiConfig: ApiConfig, url: string | string[], segments: string[] = []): string {
        if (!url)
            throw new Error("Invalid Empty Http URL");
        const parts: string[] = [];
        if (typeof (url) === 'string') {
            parts.push(url);
        } else if (isArray(url) && !!apiConfig) {
            segments = [...url.slice(2), ...segments];
            const rootKey = url?.[0];
            if (apiConfig.urls && rootKey) {
                const apiInfo = apiConfig.urls[rootKey];
                const rootValue = apiInfo.root ?? '';
                if (absUrlRegex.test(rootValue)) {
                    parts.push(rootValue);
                } else if (relUrlRegex.test(rootValue)) {
                    parts.push(rootValue.slice(1));
                } else {
                    parts.push(apiConfig.base);
                    parts.push(rootValue);
                }
                const endPointKey = url?.[1];
                if (endPointKey) {
                    const endPointValue = apiInfo.endPoints?.[endPointKey];
                    if (endPointValue)
                        parts.push(endPointValue);
                }
            }
        }
        if (parts.length == 0)
            throw new Error("Invalid Http Api URL for" + JSON.stringify(url));
        return joinAsPath(...parts, ...segments);
    }

    private _getUrl(apiConfig: ApiConfig, url: string | string[], segments: string[] = []) {
        return defer(() => {
            try {
                return of(this._getUrlCore(apiConfig, url, segments));
            } catch (error) {
                return throwError(() => error);
            }
        })
    }
}