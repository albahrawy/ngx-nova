import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { NOVA_DIALOG_SERVICE, NOVA_MESSAGE_SERVICE } from "@ngx-nova/cdk/shared";
import { NovaDialogService } from "./dialog/dialog.service";
import { NovaSnackBarMessageService } from "./message/message.service";

export function provideNovaDialogService(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: NOVA_DIALOG_SERVICE, useExisting: NovaDialogService }
    ]);
}

export function provideNovaMessageService(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: NOVA_MESSAGE_SERVICE, useExisting: NovaSnackBarMessageService }
    ]);
}