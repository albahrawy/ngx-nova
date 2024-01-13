import { ComponentType } from "@angular/cdk/portal";
import { ElementRef, InjectionToken, Injector, TemplateRef } from "@angular/core";
import { ThemePalette } from "@angular/material/core";
import { IDictionary, IStringDictionary } from "@ngx-nova/js-extensions";
import { Observable } from "rxjs";
import { ProgressMode, ProgressPosition, ProgressType } from "./types";

export const NOVA_DIALOG_SERVICE = new InjectionToken<INovaDialogService<unknown>>('NOVA_DIALOG_SERVICE');

export type NovaDialogComponentType<TResult, TData, TRef> =
    ComponentType<unknown> | ComponentType<INovaDialogComponent<TResult, TData, TRef>>
    | TemplateRef<unknown> | ElementRef | HTMLElement | string | Observable<string>;


export interface INovaDialogService<TRef> {
    confirm(message: string, options?: INovaDialogOptions<boolean, void, TRef>): Observable<boolean>;
    alert(message: string, options?: INovaDialogOptions<void, void, TRef>): Observable<void>;
    showHtml<TResult = boolean>(url: string | string[], options?: INovaDialogOptions<TResult, void, TRef>): Observable<TResult>
    open<TResult, TData>(config: INovaDialogConfig<TResult, TData, TRef>, native?: boolean): Observable<TResult>;
}

export interface INovaDialogConfig<TResult = unknown, TData = unknown, TRef = unknown> {
    data?: TData;
    getResult?(params: IProgressAddon): TResult | Observable<TResult>;
    options?: INovaDialogOptions<TResult, TData, TRef>;
    component: NovaDialogComponentType<TResult, TData, TRef>;
    injector?: Injector;
}

export interface INovaDialogHost<TResult> {
    accept(value: TResult): void;
    close(): void;
}

export interface INovaDialogComponent<TResult = unknown, TData = unknown, TRef = unknown> {
    initiate?(data?: TData, host?: INovaDialogHost<TResult>): void;
    getResult?(params: IProgressAddon): TResult | Observable<TResult>;
    buttonClicked?(id: string, args?: INovaDialogActionArgs<TResult, TData, TRef>): void;
}

export interface INovaDialogOptions<TResult = unknown, TData = void, TRef = unknown> {
    closeOnEscape?: boolean;
    closeOnX?: boolean;
    caption?: string | IStringDictionary;
    overflow?: 'auto' | 'hidden';
    minWidth?: string | number;
    minHeight?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
    width?: string;
    height?: string;
    panelClasses?: string[];
    autoFocus?: string;
    titleButtons?: INovaDialogButtonCollection<TResult, TData, TRef>;
    actionBar?: {
        show?: boolean;
        buttons?: INovaDialogButtonCollection<TResult, TData, TRef>;
    }
}

export type INovaDialogButtonCollection<TResult, TData, TRef> = IDictionary<INovaDialogButtonConfig<TResult, TData, TRef>>;

export interface INovaDialogButtonConfig<TResult = unknown, TData = void, TRef = unknown> {
    icon?: string;
    color?: ThemePalette;
    disabled?: boolean;
    text?: string | Record<string, string>;
    isFab?: boolean;
    order?: number;
    hidden?: boolean;
    progress?: Partial<IProgressAddon>;
    cssClass?: string;
    click?: (args?: INovaDialogActionArgs<TResult, TData, TRef>) => void | Observable<TResult> | TResult;
}

export interface INovaDialogActionArgs<TResult = unknown, TData = void, TRef = unknown> {
    button: INovaDialogButtonConfig<TResult, TData, TRef>;
    getButton(key: string): INovaDialogButtonConfig | undefined;
    dialogRef: TRef;
    dialogHost?: INovaDialogHost<TResult>;
    setBusy(value: boolean): void;
}


export interface IProgressAddon {
    type?: ProgressType;
    visible?: boolean;
    position?: ProgressPosition;
    mode: ProgressMode;
    value?: number;
    color?: ThemePalette;
}
