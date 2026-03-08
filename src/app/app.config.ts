import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { provideAppIcons } from './core/icons/icons.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppIcons(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([timeoutInterceptor, authInterceptor, authErrorInterceptor])
    ),
  ]
};