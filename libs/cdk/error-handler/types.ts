import { InjectionToken } from "@angular/core";
import { IGenericDictionary } from "@ngx-nova/js-extensions";
import { OperatorFunction } from "rxjs";

export const NOVA_OBSERVABLE_ERROR_HANDLER = new InjectionToken<INovaObservableErrorHandler>('nova-observable-error-handler');
export type ErrorHandleType = 'string' | 'string-translate' | 'original' | 'ignore' | '';
export interface INovaObservableErrorHandler {
    errorHandler<T>(type?: ErrorHandleType, errorLog?: boolean): OperatorFunction<T, T | null>;
}

export const NOVA_LOGGER_SERVICE = new InjectionToken<ILogger>('nova_logger_service');

export interface ILogger {
    logError(error: string | Error): void;
    logInfo(info: string | IGenericDictionary): void;
}