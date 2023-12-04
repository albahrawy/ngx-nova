import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { NOVA_OBSERVABLE_ERROR_HANDLER } from "./types";
import { ObservableErrorHandler } from "./error-handler";

export function provideNovaHttpService(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: NOVA_OBSERVABLE_ERROR_HANDLER, useExisting: ObservableErrorHandler }
    ]);
}