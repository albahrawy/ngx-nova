import { ThemePalette } from "@angular/material/core";
import { ProgressMode, ProgressPosition, ProgressType } from "@ngx-nova/cdk/shared";
import { Nullable } from "@ngx-nova/js-extensions";

export interface IProgressAddon {
    type?: ProgressType;
    visible?: boolean;
    position?: ProgressPosition;
    mode: ProgressMode;
    value?: number;
    color?: ThemePalette;
}

export interface INovaButtonArgs {
    button: INovaButtonArg;
    key: string;
    getButton(key: string): INovaButtonArg | undefined;
    disableContainer(): void;
    enableContainer(): void;
}

export interface INovaButtonItem {
    icon?: string;
    color?: ThemePalette;
    disabled?: boolean;
    text?: string | Record<string, string>;
    isFab?: boolean;
    hidden?: boolean;
    order?: number;
    progress?: Partial<IProgressAddon>;
    cssClass?: string;
}

export type INovaButtonConfig = Nullable<Record<string, INovaButtonItem>>;

export interface INovaButtonArg extends INovaButtonItem {
    progress: IProgressAddon;
}
