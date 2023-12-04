import { EnvironmentProviders, Provider, APP_INITIALIZER, makeEnvironmentProviders } from "@angular/core";
import { NovaDefaultLocalizerConfig } from "./localize.config";
import { NovaDefaultLocalizer } from "./localizer";
import { NOVA_LOCALIZER, NOVA_LOCALIZER_CONFIG, INovaLocalizer, NOVA_LOCALIZER_CONFIG_PATH } from "./types";

export function provideNovaLocalizer(configPath?: string, mandatory?: boolean): EnvironmentProviders {
    const providers: Provider[] = [
        { provide: NOVA_LOCALIZER, useExisting: NovaDefaultLocalizer },
        { provide: NOVA_LOCALIZER_CONFIG, useExisting: NovaDefaultLocalizerConfig },
        {
            provide: APP_INITIALIZER, useFactory: (localizer: INovaLocalizer) =>
                () => localizer.init(mandatory), deps: [NOVA_LOCALIZER], multi: true
        }
    ];
    if (configPath)
        providers.push({ provide: NOVA_LOCALIZER_CONFIG_PATH, multi: true, useValue: configPath });

    return makeEnvironmentProviders(providers);
}