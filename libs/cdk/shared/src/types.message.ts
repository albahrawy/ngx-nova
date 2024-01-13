import { InjectionToken } from "@angular/core";

export const NOVA_MESSAGE_SERVICE = new InjectionToken<INovaMessageService>('NOVA_MESSAGE_SERVICE');

export interface INovaMessageService {
    showError(message: string, element?: HTMLElement | null, position?: 'top' | 'bottom', callBack?: () => void): void;
}