import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="navbar">
      <div class="container navbar-inner">
        <a routerLink="/" class="navbar-brand">Diamant Laan</a>

        <button class="hamburger" (click)="menuOpen.set(!menuOpen())" [attr.aria-label]="menuOpen() ? 'Maak spyskaart toe' : 'Maak spyskaart oop'">
          @if (menuOpen()) {
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          } @else {
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>

        <div class="navbar-links" [class.open]="menuOpen()">
          <a routerLink="/kaart" (click)="menuOpen.set(false)">Kaart</a>
          @if (auth.currentUser(); as user) {
            <a routerLink="/my-blokke" (click)="menuOpen.set(false)">My Blokke</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin" (click)="menuOpen.set(false)">Admin Portaal</a>
            }
            <span class="navbar-user desktop-only">{{ user.firstName }}</span>
            <button class="btn-logout" (click)="logout()">Teken Uit</button>
          } @else {
            <a routerLink="/meld-aan" class="btn-nav" (click)="menuOpen.set(false)">Meld aan</a>
          }
        </div>
      </div>
      @if (menuOpen()) {
        <div class="backdrop" (click)="menuOpen.set(false)"></div>
      }
    </nav>
  `,
  styles: [`
    .navbar {
      background: var(--color-brown);
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 16px rgba(61,43,31,0.15);
    }
    .navbar-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 0;
    }
    .navbar-brand {
      font-family: var(--font-heading);
      color: #F5F0E1;
      font-weight: 700;
      font-size: 1.125rem;
      text-decoration: none;
      letter-spacing: -0.3px;
      flex-shrink: 0;
    }
    .navbar-brand:hover { color: #fff; text-decoration: none; }

    .hamburger {
      display: none;
      background: none;
      border: none;
      color: #F5F0E1;
      cursor: pointer;
      padding: 0.25rem;
      margin: 0;
      border-radius: var(--radius-sm);
      line-height: 1;
    }
    .hamburger:hover { background: rgba(255,255,255,0.1); }

    .navbar-links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .navbar-links a {
      font-family: var(--font-heading);
      color: #D4C4A8;
      font-size: 0.8125rem;
      font-weight: 500;
      text-decoration: none;
      transition: color 0.2s;
      white-space: nowrap;
    }
    .navbar-links a:hover { color: #F5F0E1; text-decoration: none; }
    .navbar-user {
      font-family: var(--font-body);
      font-size: 0.8125rem;
      color: #A89880;
      white-space: nowrap;
    }
    .btn-nav {
      background: var(--color-terracotta);
      color: #fff !important;
      padding: 0.45rem 1.1rem;
      border-radius: var(--radius-sm);
      font-weight: 600 !important;
      transition: all 0.2s;
    }
    .btn-nav:hover {
      background: var(--color-terracotta-dark);
      color: #fff !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(198,123,92,0.4);
    }
    .btn-logout {
      font-family: var(--font-heading);
      background: transparent;
      color: #D4C4A8;
      border: 1.5px solid #D4C4A8;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-logout:hover {
      color: #F5F0E1;
      border-color: #F5F0E1;
    }

    .backdrop { display: none; }

    @media (max-width: 768px) {
      .hamburger { display: flex; align-items: center; justify-content: center; }
      .desktop-only { display: none; }

      .navbar-links {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--color-brown);
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 0.5rem 0;
        border-top: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      .navbar-links.open { display: flex; }

      .navbar-links a {
        padding: 0.75rem 1.5rem;
        font-size: 0.9375rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .navbar-links a:hover { background: rgba(255,255,255,0.05); }

      .btn-nav {
        margin: 0.5rem 1.25rem;
        text-align: center;
        justify-content: center;
        display: flex;
      }

      .navbar-user {
        padding: 0.5rem 1.5rem;
        font-size: 0.875rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .btn-logout {
        margin: 0.75rem 1.25rem;
        text-align: center;
        justify-content: center;
        display: flex;
        padding: 0.5rem;
      }

      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.3);
        z-index: -1;
      }
    }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);

  logout() {
    this.menuOpen.set(false);
    this.auth.logout();
  }
}
