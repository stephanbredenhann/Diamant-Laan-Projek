import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const mustChangePasswordGuard = () => {
  const auth = inject(AuthService);
  const user = auth.currentUser();
  if (user?.mustChangePassword) {
    return inject(Router).parseUrl('/wagwoord-wysig-verplig');
  }
  return true;
};
