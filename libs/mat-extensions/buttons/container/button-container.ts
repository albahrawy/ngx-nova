import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NovaTranslatePipe } from '@ngx-nova/cdk/localization';
import { FlexDirection, FlexPosition, NovaOverlayProgress } from '@ngx-nova/cdk/shared';
import { jsonToArray } from '@ngx-nova/js-extensions';
import { INovaButtonArg, INovaButtonArgs, INovaButtonConfig, INovaButtonItem, IProgressAddon } from './types';

interface NovaButtonItem {
    args: INovaButtonArg;
    key: string;
}
@Component({
    selector: 'nova-button-container',
    templateUrl: './button-container.html',
    host: {
        'class': 'nova-button-container',
        '[style.justify-content]': 'position',
        '[style.flex-direction]': 'direction'
    },
    styles: `
        :host{
            display:flex;
            gap:5px;
            align-items: center;
        }
    `,
    standalone: true,
    imports: [NovaOverlayProgress, MatIconModule, MatButtonModule, NovaTranslatePipe]
})

export class NovaButtonContainer {

    protected _buttonArray: Array<NovaButtonItem> = [];
    private _buttons: Record<string, INovaButtonItem> = {};

    @Output() buttonClicked = new EventEmitter<INovaButtonArgs>();

    @Input() disabled: boolean = false;

    @Input() direction: FlexDirection = 'row';

    @Input() position: FlexPosition = 'end';

    @Input()
    get buttons(): INovaButtonConfig { return this._buttons; };
    set buttons(value: INovaButtonConfig) {
        value ??= {};
        this._buttons = value;
        this._buttonArray = jsonToArray(value, (v, key) => {
            const progress = (v.progress ?? {}) as unknown as IProgressAddon;
            progress.mode ?? 'indeterminate';
            const args: INovaButtonArg = { ...v, progress };
            args.cssClass ||= `nova-button--${key}`;
            args.cssClass += ' nova-button-container--button'
            return { args, key };
        });
    };

    protected btnClicked(button: NovaButtonItem) {
        this.buttonClicked.emit({
            button: button.args,
            key: button.key,
            getButton: (key) => this._buttonArray.find(b => b.key === key)?.args,
            disableContainer: () => this.disabled = true,
            enableContainer: () => this.disabled = false
        });
    }
}