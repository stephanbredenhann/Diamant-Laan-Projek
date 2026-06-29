import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = req.url.includes('/api/auth/');
  const withCreds = isAuthEndpoint ? req.clone({ withCredentials: true }) : req;

  const token = auth.getToken();
  const authReq = token && !isAuthEndpoint
    ? withCreds.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : withCreds;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token && !req.url.includes('/api/auth/refresh') && !req.url.includes('/api/auth/login')) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            const newToken = auth.getToken();
            const retry = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
              withCredentials: true
            });
            return next(retry);
          }),
          catchError(() => {
            auth.logout(false);
            router.navigate(['/meld-aan']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
