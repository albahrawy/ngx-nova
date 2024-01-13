import { EnvironmentProviders, Type, makeEnvironmentProviders } from "@angular/core";

import { TABLE_FILTER_COMPONENT_FACTORY, ITableFilterComponentFactory } from "@ngx-nova/table-extensions/filter-core";
import { DefaultFilterComponentFactory } from "./component-factory";

export function provideTableFilterComponentFactory(customFactory?: Type<ITableFilterComponentFactory>): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: TABLE_FILTER_COMPONENT_FACTORY, useExisting: customFactory ?? DefaultFilterComponentFactory },
    ]);
}