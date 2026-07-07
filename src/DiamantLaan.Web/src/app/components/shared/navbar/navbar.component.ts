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
        <a routerLink="/" class="navbar-brand">
          <img src="stadsboufonds-logo-orange.png" alt="Orania Stadsboufonds" class="brand-logo" />
        </a>

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
            <a routerLink="/my-transaksies" (click)="menuOpen.set(false)">My Transaksies</a>
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
      background: var(--color-surface);
      border-bottom: 2px solid var(--color-border);
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .navbar-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
    }
    .navbar-brand {
      display: flex;
      align-items: center;
      text-decoration: none;
      flex-shrink: 0;
    }
    .brand-logo {
      height: 32px;
      width: auto;
      display: block;
    }

    .hamburger {
      display: none;
      background: none;
      border: none;
      color: var(--color-text);
      cursor: pointer;
      padding: 0.25rem;
      margin: 0;
      line-height: 1;
    }
    .hamburger:hover { opacity: 0.7; }

    .navbar-links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .navbar-links a {
      font-family: var(--font-heading);
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s;
      white-space: nowrap;
    }
    .navbar-links a:hover { color: var(--color-text); text-decoration: none; }
    .navbar-user {
      font-family: var(--font-body);
      font-size: 0.8125rem;
      color: var(--color-muted);
      white-space: nowrap;
    }
    .btn-nav {
      background: var(--color-orange);
      color: #fff !important;
      padding: 0.45rem 1.1rem;
      font-weight: 600 !important;
      transition: background 0.2s;
    }
    .btn-nav:hover {
      background: var(--color-orange-dark);
      color: #fff !important;
    }
    .btn-logout {
      font-family: var(--font-heading);
      background: transparent;
      color: var(--color-text-muted);
      border: 2px solid var(--color-border);
      padding: 0.35rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-logout:hover {
      color: var(--color-text);
      border-color: var(--color-text);
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
        background: var(--color-surface);
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 0.5rem 0;
        border-top: 2px solid var(--color-border);
        border-bottom: 2px solid var(--color-border);
      }
      .navbar-links.open { display: flex; }

      .navbar-links a {
        padding: 0.75rem 1.5rem;
        font-size: 0.9375rem;
        border-bottom: 1px solid var(--color-border);
      }
      .navbar-links a:hover { background: var(--color-bg); }

      .btn-nav {
        margin: 0.5rem 1.25rem;
        text-align: center;
        justify-content: center;
        display: flex;
      }

      .navbar-user {
        padding: 0.5rem 1.5rem;
        font-size: 0.875rem;
        border-bottom: 1px solid var(--color-border);
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
        background: rgba(0, 0, 0, 0.2);
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
