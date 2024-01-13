import { EnvironmentProviders, Type, makeEnvironmentProviders } from "@angular/core";
import { ITableEditorComponentFactory, TABLE_EDITOR_COMPONENT_FACTORY } from "@ngx-nova/table-extensions/edit-core";
import { DefaultEditorComponentFactory } from "./component-factory";

export function provideTableEditorComponentFactory(customFactory?: Type<ITableEditorComponentFactory>): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: TABLE_EDITOR_COMPONENT_FACTORY, useExisting: customFactory ?? DefaultEditorComponentFactory },
    ]);
}