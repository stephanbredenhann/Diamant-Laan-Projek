import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'kaart', loadComponent: () => import('./components/map/map.component').then(m => m.MapComponent) },
  { path: 'registreer', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'meld-aan', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'my-blokke', loadComponent: () => import('./components/my-squares/my-squares.component').then(m => m.MySquaresComponent), canActivate: [authGuard] },
  { path: 'my-blokke/sertifikaat', loadComponent: () => import('./components/certificate/certificate.component').then(m => m.CertificateComponent), canActivate: [authGuard] },
  { path: 'betaal', loadComponent: () => import('./components/payment/payment.component').then(m => m.PaymentComponent), canActivate: [authGuard] },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent) },
      { path: 'fotos', loadComponent: () => import('./components/admin-images/admin-images.component').then(m => m.AdminImagesComponent) },
      { path: 'stats', loadComponent: () => import('./components/admin-stats/admin-stats.component').then(m => m.AdminStatsComponent) },
      { path: 'gebruikers', loadComponent: () => import('./components/admin-users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'telefoon-aankoop', loadComponent: () => import('./components/admin-manual-purchase/admin-manual-purchase.component').then(m => m.AdminManualPurchaseComponent) },
    ]
  },
  { path: 'betalings/terug', loadComponent: () => import('./components/payment-return/payment-return.component').then(m => m.PaymentReturnComponent) },
  { path: 'betalings/kanselleer', loadComponent: () => import('./components/payment-cancel/payment-cancel.component').then(m => m.PaymentCancelComponent) },
  { path: '**', redirectTo: '' }
];
