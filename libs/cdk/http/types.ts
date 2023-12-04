import { HttpClient, HttpContext, HttpEvent, HttpHeaders, HttpParams, HttpResponse } from "@angular/common/http";
import { InjectionToken } from "@angular/core";
import { ErrorHandleType } from "@ngx-nova/cdk/error-handler";
import { IGenericArray, IGenericDictioanry, IStringDictioanry } from "@ngx-nova/js-extensions";
import { Observable } from "rxjs";

export const NOVA_HTTP_URL_RESOLVER = new InjectionToken<IHttpUrlResolver>('nova_http_url_resolver');
export const NOVA_REST_API_CONFIG_PATH = new InjectionToken<string>('rest-api-config-path');
export const NOVA_HTTP_SERVICE = new InjectionToken<INovaHttpService>('nova_http_service');

export declare type ApiConfig = {
    base: string;
    urls: { [key: string]: { root: string, endPoints: IStringDictioanry; } };
};

export interface IHttpUrlResolver {
    getUrl(url: string | string[], segments?: string[]): Observable<string>;
}

export interface HttpReqOptionsBase {
    headers?: HttpHeaders | { [header: string]: string | string[] },
    context?: HttpContext,
    params?: HttpParams |
    { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
    reportProgress?: boolean,
    withCredentials?: boolean,
    transferCache?: { includeHeaders?: string[]; } | boolean;
}
type HttpResponseType = 'arraybuffer' | 'blob' | 'text' | 'json';
type HttpReqOptionsBodyBase<T extends HttpResponseType> = HttpReqOptionsBase & { observe?: 'body', responseType?: T };
type HttpReqOptionsEventsBase<T extends HttpResponseType> = HttpReqOptionsBase & { observe: 'events', responseType?: T };
type HttpReqOptionsResponseBase<T extends HttpResponseType> = HttpReqOptionsBase & { observe: 'response', responseType?: T };

type HttpReqOptionsBody = HttpReqOptionsBodyBuffer | HttpReqOptionsBodyBlob | HttpReqOptionsBodyText | HttpReqOptionsBodyJson;
type HttpReqOptionsEvents = HttpReqOptionsEventsBuffer | HttpReqOptionsEventsBlob | HttpReqOptionsEventsText | HttpReqOptionsEventsJson;
type HttpReqOptionsResponse = HttpReqOptionsResponseBuffer | HttpReqOptionsResponseBlob | HttpReqOptionsResponseText | HttpReqOptionsResponseJson;

export type HttpReqOptionsBodyBuffer = HttpReqOptionsBodyBase<'arraybuffer'>;
export type HttpReqOptionsBodyBlob = HttpReqOptionsBodyBase<'blob'>;
export type HttpReqOptionsBodyText = HttpReqOptionsBodyBase<'text'>;
export type HttpReqOptionsBodyJson = HttpReqOptionsBodyBase<'json'>;

export type HttpReqOptionsEventsBuffer = HttpReqOptionsEventsBase<'arraybuffer'>;
export type HttpReqOptionsEventsBlob = HttpReqOptionsEventsBase<'blob'>;
export type HttpReqOptionsEventsText = HttpReqOptionsEventsBase<'text'>;
export type HttpReqOptionsEventsJson = HttpReqOptionsEventsBase<'json'>;

export type HttpReqOptionsResponseBuffer = HttpReqOptionsResponseBase<'arraybuffer'>;
export type HttpReqOptionsResponseBlob = HttpReqOptionsResponseBase<'blob'>;
export type HttpReqOptionsResponseText = HttpReqOptionsResponseBase<'text'>;
export type HttpReqOptionsResponseJson = HttpReqOptionsResponseBase<'json'>;


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HttpReqOptions = HttpReqOptionsBody | HttpReqOptionsEvents | HttpReqOptionsResponse | any;

export interface HttpHandleOptions {
    auditAction?: string;
    errorHandleType?: ErrorHandleType;
    logError?: boolean;
    argsType?: 'path' | 'query',
}

export declare interface INovaHttpService {
    httpClient: HttpClient;
    get<T>(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<T | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBuffer): Observable<ArrayBuffer | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBlob): Observable<Blob | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyText): Observable<string | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<object | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBuffer): Observable<HttpEvent<ArrayBuffer> | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBlob): Observable<HttpEvent<Blob> | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsText): Observable<HttpEvent<string> | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<object> | null>;
    get<T>(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<T> | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBuffer): Observable<HttpResponse<ArrayBuffer> | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBlob): Observable<HttpResponse<Blob> | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseText): Observable<HttpResponse<string> | null>;
    get(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<object> | null>;
    get<T>(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<T> | null>;

    delete<T>(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<T | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBuffer): Observable<ArrayBuffer | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBlob): Observable<Blob | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyText): Observable<string | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<object | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBuffer): Observable<HttpEvent<ArrayBuffer> | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBlob): Observable<HttpEvent<Blob> | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsText): Observable<HttpEvent<string> | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<object> | null>;
    delete<T>(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<T> | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBuffer): Observable<HttpResponse<ArrayBuffer> | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBlob): Observable<HttpResponse<Blob> | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseText): Observable<HttpResponse<string> | null>;
    delete(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<object> | null>;
    delete<T>(url: string | string[], args?: IGenericDictioanry | IGenericArray,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<T> | null>;

    post<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<T | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBuffer): Observable<ArrayBuffer | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBlob): Observable<Blob | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyText): Observable<string | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<object | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBuffer): Observable<HttpEvent<ArrayBuffer> | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBlob): Observable<HttpEvent<Blob> | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsText): Observable<HttpEvent<string> | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<object> | null>;
    post<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<T> | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBuffer): Observable<HttpResponse<ArrayBuffer> | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBlob): Observable<HttpResponse<Blob> | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseText): Observable<HttpResponse<string> | null>;
    post(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<object> | null>;
    post<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<T> | null>;

    put<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<T | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBuffer): Observable<ArrayBuffer | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBlob): Observable<Blob | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyText): Observable<string | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<object | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBuffer): Observable<HttpEvent<ArrayBuffer> | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBlob): Observable<HttpEvent<Blob> | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsText): Observable<HttpEvent<string> | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<object> | null>;
    put<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<T> | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBuffer): Observable<HttpResponse<ArrayBuffer> | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBlob): Observable<HttpResponse<Blob> | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseText): Observable<HttpResponse<string> | null>;
    put(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<object> | null>;
    put<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<T> | null>;

    patch<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<T | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBuffer): Observable<ArrayBuffer | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyBlob): Observable<Blob | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyText): Observable<string | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsBodyJson): Observable<object | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBuffer): Observable<HttpEvent<ArrayBuffer> | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsBlob): Observable<HttpEvent<Blob> | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsText): Observable<HttpEvent<string> | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<object> | null>;
    patch<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsEventsJson): Observable<HttpEvent<T> | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBuffer): Observable<HttpResponse<ArrayBuffer> | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseBlob): Observable<HttpResponse<Blob> | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseText): Observable<HttpResponse<string> | null>;
    patch(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<object> | null>;
    patch<T>(url: string | string[], body: unknown,
        handleOptions?: HttpHandleOptions, reqOptions?: HttpReqOptionsResponseJson): Observable<HttpResponse<T> | null>;
}