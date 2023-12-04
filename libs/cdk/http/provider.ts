import { provideHttpClient } from "@angular/common/http";
import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { NovaHttpUrlResolver } from "./http-url.resolver";
import { NovaHttpService } from "./http.service";
import { NOVA_HTTP_SERVICE, NOVA_HTTP_URL_RESOLVER } from "./types";

export function provideNovaHttpService(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: NOVA_HTTP_SERVICE, useExisting: NovaHttpService },
        { provide: NOVA_HTTP_URL_RESOLVER, useExisting: NovaHttpUrlResolver },
        provideHttpClient()
    ]);
}