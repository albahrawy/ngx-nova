import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from "@angular/material/core";
import { NovaDateAdapter } from "./date-adapter";
import { MAT_NOVA_DATE_FORMATS } from "./date-format";

export function provideNovaDateProvider(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: DateAdapter, useClass: NovaDateAdapter, deps: [MAT_DATE_LOCALE] },
        { provide: MAT_DATE_FORMATS, useValue: MAT_NOVA_DATE_FORMATS }
    ]);
}