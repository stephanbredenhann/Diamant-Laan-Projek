import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container navbar-inner">
        <a routerLink="/" class="navbar-brand">Diamant Laan Teerprojek</a>
        <div class="navbar-links">
          @if (auth.currentUser(); as user) {
            <a routerLink="/my-blokke">My Blokke</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin">Admin</a>
            }
            <span class="navbar-user">{{ user.firstName }}</span>
            <button class="btn btn-outline btn-sm" (click)="auth.logout()">Teken Uit</button>
          } @else {
            <a routerLink="/registreer">Registreer</a>
            <a routerLink="/meld-aan">Meld Aan</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: var(--color-primary);
      color: #fff;
      padding: 0.75rem 0;
    }
    .navbar-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .navbar-brand {
      color: #fff;
      font-weight: 700;
      font-size: 1.125rem;
      text-decoration: none;
    }
    .navbar-links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .navbar-links a {
      color: rgba(255,255,255,0.9);
      font-size: 0.8125rem;
      font-weight: 500;
      text-decoration: none;
    }
    .navbar-links a:hover { color: #fff; }
    .navbar-user { font-size: 0.8125rem; opacity: 0.8; }
    .btn-sm { padding: 0.25rem 0.75rem; font-size: 0.75rem; }
    .btn-outline { border-color: #fff; color: #fff; }
    .btn-outline:hover { background: rgba(255,255,255,0.15); }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
}
