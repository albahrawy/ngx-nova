import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideValueFormatter } from '@ngx-nova/cdk/format';
import { provideNovaHttpService } from '@ngx-nova/cdk/http';
import { provideNovaLocalizer } from '@ngx-nova/cdk/localization';
import { provideNovaDateProvider } from '@ngx-nova/mat-extensions/date-adapter';
import { provideNovaDialogService, provideNovaMessageService } from '@ngx-nova/mat-extensions/overlays';
import { provideTableEditorComponentFactory } from '@ngx-nova/table-editor-factory';
import { provideTableFilterComponentFactory } from '@ngx-nova/table-filter-factory';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes, withViewTransitions()),
    provideAnimations(),
    provideNovaLocalizer(undefined, false),
    provideNovaHttpService(),
    provideNovaDateProvider(),
    provideTableFilterComponentFactory(),
    provideTableEditorComponentFactory(),
    provideValueFormatter(),
    provideNovaDialogService(),
    provideNovaMessageService()
  ],
};
