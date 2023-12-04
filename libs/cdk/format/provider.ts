import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { DefaultValueFormatter } from "./default-value-formater";
import { NOVA_VALUE_FORMATTER } from "./types";

export function provideValueFormatter(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: NOVA_VALUE_FORMATTER, useExisting: DefaultValueFormatter }
    ]);
}