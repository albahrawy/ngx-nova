import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: 'progress-overlay', loadComponent: () => import('./progress-overlay/progress-overlay.component')
            .then(mod => mod.TestProgressOverlayComponent)
    },
    {
        path: 'flex-layout', loadComponent: () => import('./flex-layout/flex-layout-example')
            .then(mod => mod.FlexLayoutExample)
    },
    {
        path: 'inputs-extensions', loadComponent: () => import('./material-input-extensions/material-input-extensions')
            .then(mod => mod.MaterialInputExtension)
    },
    {
        path: 'cdk-table-virtual-scroll', loadComponent: () => import('./table/cdk-table.component')
            .then(mod => mod.TestCdkTableComponent)
    },
    {
        path: 'select-example', loadComponent: () => import('./nova-select/nova-select').then(mod => mod.NovaSelectExample)
    },
    {
        path: 'mat-table-virtual-scroll', loadComponent: () => import('./table/mat-table.component')
            .then(mod => mod.TestMatTableComponent)
    },
    {
        path: 'configurable-table', loadComponent: () => import('./table/configurable-table/configurable-table')
            .then(mod => mod.ConfigurableTableExample)
    },
    {
        path: 'list-seelction', loadComponent: () => import('./mat-list-seelction-virtual/mat-list-seelction-virtual')
            .then(mod => mod.MatSelectionListVirtual)
    },
    {
        path: 'dialog', loadComponent: () => import('./dialog/dialog')
            .then(mod => mod.DialogExampleComponent)
    },
    {
        path: 'buttons', loadComponent: () => import('./buttons/buttons')
            .then(mod => mod.ButtonsExampleComponent)
    },
    {
        path: 'splitter', loadComponent: () => import('./splitter-demo/splitter-demo')
            .then(mod => mod.SplitterDemo)

    }
];
