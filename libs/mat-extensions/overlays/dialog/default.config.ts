import { InjectionToken } from "@angular/core";
import { INovaDialogOptions } from "@ngx-nova/cdk/shared";

export const DEFAULT_NOVA_DIALOG_OPTIONS = new InjectionToken<IDialogDefaults>('DEFAULT_NOVA_DIALOG_OPTIONS');

export interface IDialogDefaults {
    dialog: INovaDialogOptions;
    alert: INovaDialogOptions;
    confirm: INovaDialogOptions;
    showHtml: INovaDialogOptions;
}

export const Default_Nova_Dialog_Options: IDialogDefaults = {
    dialog: {
        closeOnX: true,
        actionBar: {
            show: true,
            buttons: {
                accept: {
                    icon: 'check',
                    text: 'Dialog.Accept',
                },
                close: {
                    icon: 'clear',
                    text: 'Dialog.Close',
                }
            }
        }
    },
    alert: {
        actionBar: {
            show: true,
            buttons: {
                accept: {
                    icon: 'check',
                    text: 'Dialog.Accept',
                },
                close: {
                    icon: 'clear',
                    text: 'Dialog.Close',
                }
            }
        }
    },
    confirm: {
        actionBar: {
            show: true,
            buttons: {
                accept: {
                    icon: 'check',
                    text: 'Dialog.Accept',
                },
                close: {
                    icon: 'clear',
                    text: 'Dialog.Close',
                }
            }
        }
    },
    showHtml: {
        actionBar: {
            show: true,
            buttons: {
                accept: {
                    icon: 'check',
                    text: 'Dialog.Accept',
                },
                close: {
                    icon: 'clear',
                    text: 'Dialog.Close',
                }
            }
        }
    }
};