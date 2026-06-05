import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const user = inject(AuthService).currentUser();
  return user ? true : inject(Router).parseUrl('/meld-aan');
};
