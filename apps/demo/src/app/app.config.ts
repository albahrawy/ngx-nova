import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideNovaHttpService } from '@ngx-nova/cdk/http';
import { provideNovaLocalizer } from '@ngx-nova/cdk/localization';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAnimations(),
    provideNovaLocalizer(undefined, false),
    provideNovaHttpService()
  ],
};
