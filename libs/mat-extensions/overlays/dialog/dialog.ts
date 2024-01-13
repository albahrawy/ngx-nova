import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { CdkPortalOutletAttachedRef, ComponentPortal, DomPortal, Portal, PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { AsyncPipe } from '@angular/common';
import { Component, ComponentRef, ElementRef, OnInit, TemplateRef, Type, ViewContainerRef, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NovaTranslatePipe } from '@ngx-nova/cdk/localization';
import { SafeHTMLPipe } from '@ngx-nova/cdk/pipes';
import { INovaDialogActionArgs, INovaDialogButtonConfig, INovaDialogComponent, INovaDialogConfig, INovaDialogHost, IProgressAddon, NOVA_MESSAGE_SERVICE } from '@ngx-nova/cdk/shared';
import { isDOM, isEmpty, isFunction } from '@ngx-nova/js-extensions';
import { INovaButtonArgs, NovaButtonContainer } from '@ngx-nova/mat-extensions/buttons';
import { Observable, isObservable, take } from 'rxjs';


@Component({
    selector: 'nova-dialog',
    templateUrl: './dialog.html',
    imports: [NovaButtonContainer, NovaTranslatePipe, MatDialogModule, PortalModule, CdkDrag, CdkDragHandle, SafeHTMLPipe, AsyncPipe],
    standalone: true
})

export class NovaDialogHostComponent<TResult, TData> implements INovaDialogHost<TResult>, OnInit {

    private dialogRef = inject(MatDialogRef);
    private _viewContainerRef = inject(ViewContainerRef);
    private _messageService = inject(NOVA_MESSAGE_SERVICE, { optional: true });
    private config: INovaDialogConfig<TResult, TData, MatDialogRef<typeof this>> = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};
    private _novaInstance?: INovaDialogComponent<TResult, TData>;

    protected options = this.config.options ??= {};
    protected caption = this.options.caption;
    protected hasActionBar = this.options.actionBar?.show && !isEmpty(this.options.actionBar.buttons);
    protected contentPortal?: Portal<unknown>;
    protected message?: string;
    protected message$?: Observable<string>;

    busy = signal(false);

    ngOnInit(): void {

        const component = this.config.component;
        if (typeof component === 'string') {
            this.message = component;
        }
        else if (isObservable(component)) {
            this.message$ = component;
        }
        else if (component instanceof Type) {
            this.contentPortal = new ComponentPortal(component, undefined, this.config.injector);
        } else if (component instanceof TemplateRef) {
            this.contentPortal = new TemplatePortal(component, this._viewContainerRef);
        } else if (component instanceof ElementRef || isDOM(component)) {
            this.contentPortal = new DomPortal(component);
        }
    }

    buttonClicked(event: INovaButtonArgs) {
        switch (event.key) {
            case 'close':
                this.close();
                break;
            case 'accept':
                this._proceedAccept(event);
                break;
            default:
                {
                    const button: INovaDialogButtonConfig<TResult, TData> = event.button;
                    const args: INovaDialogActionArgs<TResult, TData> = {
                        getButton: event.getButton, dialogHost: this, button, dialogRef: this.dialogRef,
                        setBusy: (v) => this.busy.set(v)
                    };
                    if (isFunction(button.click)) {
                        button.click(args);
                    } else {
                        this._novaInstance?.buttonClicked?.(event.key, args);
                    }
                }
                break;
        }
    }

    onComponentAttached(ref: CdkPortalOutletAttachedRef) {
        if (ref instanceof ComponentRef && ref.instance) {
            const instance: INovaDialogComponent<TResult, TData> = ref.instance;
            instance.initiate?.(this.config.data, this);
            this._novaInstance = instance;
        }
    }

    close() {
        this.dialogRef.close();
    }

    accept(value: TResult): void {
        this.dialogRef.close(value);
    }

    private _proceedAccept(event: INovaButtonArgs) {
        const resultFn = this.config.getResult ?? this._novaInstance?.getResult;
        if (resultFn) {
            const result = resultFn(event.button.progress);
            if (isObservable(result)) {
                if (!event.button.progress.type)
                    event.button.progress.type = event.button.isFab ? 'spinner' : 'bar';
                //event.button.progress.visible = true;
                this.busy.set(true);

                result.pipe(take(1)).subscribe({
                    next: r => this.accept(r),
                    error: r => this._showError(r, event.button.progress),
                });
            } else {
                this.accept(result);
            }
        } else {
            this.close();
        }
    }
    private _showError(error: string, progress: IProgressAddon): void {
        if (!this._messageService)
            return;
        this._messageService.showError(error, this._viewContainerRef.element.nativeElement, 'bottom',
            () => this._resetAcceptButton(progress));
    }

    private _resetAcceptButton(progress: IProgressAddon) {
        progress.visible = false;
        this.busy.set(false);
    }
}