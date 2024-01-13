import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { NOVA_OBSERVABLE_ERROR_HANDLER } from "@ngx-nova/cdk/error-handler";
import { IGenericArray, IGenericDictionary, isObject, jsonMap, toStringValue, } from "@ngx-nova/js-extensions";
import { Observable, switchMap } from "rxjs";
import { HttpHandleOptions, HttpReqOptions, INovaHttpService, NOVA_HTTP_URL_RESOLVER } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IGenericObservable = Observable<any>;

@Injectable({ providedIn: 'root' })
export class NovaHttpService implements INovaHttpService {

    httpClient = inject(HttpClient);
    protected urlResolver = inject(NOVA_HTTP_URL_RESOLVER);
    protected errorHandler = inject(NOVA_OBSERVABLE_ERROR_HANDLER, { optional: true });

    get(url: string | string[], args?: IGenericDictionary | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptions): IGenericObservable {
        const urlSegments = this.assignArgs(handleOptions?.argsType, reqOptions, args);
        return this.placeRequest(url, urlSegments, handleOptions, fullUrl => this.httpClient.get(fullUrl, reqOptions));
    }

    delete(url: string | string[], args?: IGenericDictionary | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptions): IGenericObservable {
        const urlSegments = this.assignArgs(handleOptions?.argsType, reqOptions, args);
        return this.placeRequest(url, urlSegments, handleOptions, fullUrl => this.httpClient.delete(fullUrl, reqOptions));
    }

    post(url: string | string[], body: unknown, handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptions): IGenericObservable {
        return this.placeRequest(url, undefined, handleOptions, fullUrl => this.httpClient.post(fullUrl, body, reqOptions));
    }

    put(url: string | string[], body: unknown, handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptions): IGenericObservable {
        return this.placeRequest(url, undefined, handleOptions, fullUrl => this.httpClient.put(fullUrl, body, reqOptions));
    }

    patch(url: string | string[], body: unknown, handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptions): IGenericObservable {
        return this.placeRequest(url, undefined, handleOptions, fullUrl => this.httpClient.patch(fullUrl, body, reqOptions));
    }

    private assignArgs(argsType?: 'path' | 'query', reqOptions?: HttpReqOptions, args?: IGenericDictionary | IGenericArray): string[] | undefined {
        if (!args)
            return;
        if (argsType === 'query') {
            if (isObject(args)) {
                reqOptions = reqOptions || {};
                const reqParams = reqOptions.params ?? new HttpParams();
                if (reqParams instanceof HttpParams)
                    reqOptions.params = reqParams.appendAll(jsonMap(args, v => toStringValue(v)));
                else {
                    jsonMap(args, (v, k) => reqParams[k] = toStringValue(v));
                    reqOptions.params = reqParams;
                }
            }
        } else {
            if (Array.isArray(args))
                return args.map(v => toStringValue(v));
            else if (isObject(args))
                return Object.values(args).map(v => toStringValue(v));
        }
        return;
    }

    private placeRequest<T>(url: string | string[], urlSegments: string[] | undefined, handleOptions: HttpHandleOptions | undefined,
        httpCall: (fullUrl: string) => Observable<T>) {
        const errorHandler = this.errorHandler?.errorHandler<T | null>(handleOptions?.errorHandleType, handleOptions?.logError);
        const urlObservable = this.urlResolver.getUrl(url, urlSegments);
        if (errorHandler != null)
            return urlObservable.pipe(switchMap(fullUrl => httpCall(fullUrl)), errorHandler);
        else
            return urlObservable.pipe(switchMap(fullUrl => httpCall(fullUrl)));
    }
}