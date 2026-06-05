import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = () => {
  return inject(AuthService).isAdmin()
    ? true
    : inject(Router).parseUrl('/');
};
