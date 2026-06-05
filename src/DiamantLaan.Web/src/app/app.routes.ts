import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'kaart', loadComponent: () => import('./components/map/map.component').then(m => m.MapComponent) },
  { path: 'registreer', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'meld-aan', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'my-blokke', loadComponent: () => import('./components/my-squares/my-squares.component').then(m => m.MySquaresComponent), canActivate: [authGuard] },
  { path: 'betaal', loadComponent: () => import('./components/payment/payment.component').then(m => m.PaymentComponent), canActivate: [authGuard] },
  { path: 'admin', loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent), canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: '' }
];
