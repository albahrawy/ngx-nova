import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    // {
    //     path: 'progress-overlay', loadComponent: () => import('./progress-overlay/progress-overlay.component')
    //         .then(mod => mod.TestProgressOverlayComponent)
    // },
    {
        path: 'flex-layout', loadComponent: () => import('./flex-layout/flex-layout-example')
            .then(mod => mod.FlexLayoutExample)
    },
];
