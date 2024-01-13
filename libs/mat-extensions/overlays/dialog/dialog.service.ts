import { Direction, Directionality } from '@angular/cdk/bidi';
import { Injectable, TemplateRef, Type, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { INovaDialogConfig, INovaDialogOptions, INovaDialogService } from '@ngx-nova/cdk/shared';
import { copyObject, mergeObjects } from '@ngx-nova/js-extensions';
import { NOVA_HTTP_SERVICE } from '@ngx-nova/cdk/http';
import { EMPTY, Observable, map } from 'rxjs';
import { DEFAULT_NOVA_DIALOG_OPTIONS, Default_Nova_Dialog_Options } from './default.config';
import { NovaDialogHostComponent } from './dialog';

@Injectable({ providedIn: 'root' })
export class NovaDialogService implements INovaDialogService<MatDialogRef<unknown>> {

    private readonly dir = inject(Directionality, { optional: true });
    private readonly dialog = inject(MatDialog);
    private readonly htmlService = inject(NOVA_HTTP_SERVICE, { optional: true });
    private readonly defaultOptions = inject(DEFAULT_NOVA_DIALOG_OPTIONS, { optional: true }) ?? Default_Nova_Dialog_Options;

    confirm(message: string, options?: INovaDialogOptions<boolean, void, MatDialogRef<unknown, boolean>>): Observable<boolean> {
        return this.openCore({ component: message, options, getResult: () => true }, false, this.defaultOptions.confirm);
    }

    alert(message: string, options?: INovaDialogOptions<void, void, MatDialogRef<unknown, void>> | undefined): Observable<void> {
        return this.openCore({ component: message, options }, false, this.defaultOptions.alert);
    }

    showHtml<TResult = boolean>(url: string | string[], options?: INovaDialogOptions<TResult, void, MatDialogRef<unknown, TResult>> | undefined): Observable<TResult> {
        if (!this.htmlService)
            return EMPTY;
        return this.open<TResult>({ component: this.htmlService.get<string>(url).pipe(map(s => s ?? '')), options });
    }
    open<TResult, TData = void>(config: INovaDialogConfig<TResult, TData, MatDialogRef<unknown, TResult>>, native?: boolean): Observable<TResult> {
        return this.openCore(config, !!native, this.defaultOptions.dialog);
    }

    openCore<TResult, TData, TRef>(config: INovaDialogConfig<TResult, TData, TRef>, native: boolean, defaultOptions: INovaDialogOptions)
        : Observable<TResult> {
        if (!config || !config.component) {
            return EMPTY;
        }

        const component = native && (config.component instanceof Type || config.component instanceof TemplateRef)
            ? config.component
            : NovaDialogHostComponent;
        const data = native ? config.data : this.createConfig(config, defaultOptions);
        const options = config.options ?? {};
        const direction: Direction = this.dir?.value || document.dir.toLowerCase() as Direction;
        const dialogRef = this.dialog.open(component, {
            minWidth: options.minWidth,
            maxWidth: options.maxWidth,
            minHeight: options.minHeight,
            maxHeight: options.maxHeight,
            width: options.width,
            height: options.height,
            restoreFocus: true,
            closeOnNavigation: true,
            disableClose: !options.closeOnEscape,
            delayFocusTrap: true,
            //scrollStrategy: new NoopScrollStrategy(),
            data,
            autoFocus: options.autoFocus ?? this.getFocusedButton(options.actionBar?.buttons),
            direction
        });

        // if (!!config?.minWidth || !!config?.minHeight) {
        //     const _minWidth = NovaUtil.toNumber(config?.minWidth?.toString()?.replace('px', ''));
        //     const _minHeight = NovaUtil.toNumber(config?.minHeight?.toString()?.replace('px', ''));
        //     const _overlay = (dialogRef as any)._overlayRef;
        //     const updateSize = () => {
        //         const _sizes: any = {};
        //         if (!!_minWidth) { _sizes.minWidth = Math.min(_minWidth, document.body.clientWidth - 5); }
        //         if (!!_minHeight) { _sizes.minHeight = Math.min(_minHeight, document.body.clientHeight - 5); }
        //         if (Object.keys(_sizes).length) {
        //             _overlay.updateSize(_sizes);
        //         }
        //     };

        //     updateSize();
        //     fromEvent(window, 'resize').pipe(
        //         distinctUntilChanged((prev, curr) => prev === curr),
        //         takeUntil((dialogRef as any)._afterClosed))
        //         .subscribe(updateSize);
        // }
        return dialogRef.afterClosed();
    }

    getFocusedButton(buttons: Record<string, unknown> | undefined): string | undefined {
        if (!buttons)
            return;
        if (Object.hasOwn(buttons, 'close'))
            return '.nova-dialog-close-button';
        else if (Object.hasOwn(buttons, 'accept')) {
            return '.nova-dialog-accept-button';
        }
        return;
    }


    protected createConfig<TResult, TData, TRef>(config: INovaDialogConfig<TResult, TData, TRef>, defaultOptions: INovaDialogOptions<TResult>) {

        config = { ...(config || {}) };

        const defOptions = copyObject(defaultOptions);
        let options = config.options ?? {};
        if (options.actionBar?.buttons) {
            delete defOptions.actionBar?.buttons;
        }

        if (options.titleButtons) {
            delete defOptions.titleButtons;
        }

        options = config.options = mergeObjects({}, defOptions, options);

        if (options.closeOnX !== false) {
            options.titleButtons ??= {};
            if (!Object.hasOwn(options.titleButtons, 'close')) {
                options.titleButtons['close'] = { icon: 'clear', order: 1000, isFab: true, color: 'warn' };
            }
            else {
                options.titleButtons['close'].order = 1000;
                options.titleButtons['close'].isFab = true;
            }
        }

        if (options.actionBar?.buttons) {
            if (Object.hasOwn(options.actionBar.buttons, 'close'))
                options.actionBar.buttons['close'].order = 1000;
            if (Object.hasOwn(options.actionBar.buttons, 'accept'))
                options.actionBar.buttons['accept'].order = 999;
        }

        options.closeOnEscape = options.closeOnEscape == null || options.closeOnEscape === true;
        options.caption ||= document.title;

        return config;
    }
}