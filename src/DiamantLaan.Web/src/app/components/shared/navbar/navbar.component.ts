import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container navbar-inner">
        <a routerLink="/" class="nav-brand" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Tuis
        </a>

        <button class="hamburger" (click)="menuOpen.set(!menuOpen())" [attr.aria-label]="menuOpen() ? 'Maak spyskaart toe' : 'Maak spyskaart oop'">
          @if (menuOpen()) {
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          } @else {
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>

        <div class="navbar-links" [class.open]="menuOpen()">
          <a routerLink="/kaart" routerLinkActive="active" (click)="menuOpen.set(false)">Kaart</a>
          @if (auth.currentUser(); as user) {
            <a routerLink="/my-blokke" routerLinkActive="active" (click)="menuOpen.set(false)">My Blokke</a>
            <a routerLink="/my-transaksies" routerLinkActive="active" (click)="menuOpen.set(false)">My Transaksies</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active" (click)="menuOpen.set(false)">Admin Portaal</a>
            }
            <span class="navbar-user desktop-only">{{ user.firstName }}</span>
            <button class="btn-logout" (click)="logout()">Teken Uit</button>
          } @else {
            <a routerLink="/meld-aan" class="btn-nav" (click)="menuOpen.set(false)">Meld aan</a>
          }
        </div>
      </div>
    </nav>
    @if (menuOpen()) {
      <div class="backdrop" (click)="menuOpen.set(false)"></div>
    }
  `,
  styles: [`
    .navbar {
      background: var(--surface);
      border-bottom: 1px solid var(--color-border);
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

    .nav-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-body);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      transition: color 0.15s ease, background 0.15s ease;
      flex-shrink: 0;
    }
    .nav-brand:hover {
      color: var(--ob-blue);
      background: rgba(3, 78, 162, 0.06);
    }
    .nav-brand.active {
      color: var(--ob-blue);
    }

    .hamburger {
      display: none;
      background: none;
      border: none;
      color: var(--text-body);
      cursor: pointer;
      padding: 0.25rem;
      margin: 0;
      line-height: 1;
    }
    .hamburger:hover { opacity: 0.7; }

    .navbar-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .navbar-links a {
      font-family: var(--font-body);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      transition: color 0.15s ease, background 0.15s ease;
      white-space: nowrap;
    }
    .navbar-links a:hover {
      color: var(--ob-blue);
      background: rgba(3, 78, 162, 0.06);
      text-decoration: none;
    }
    .navbar-links a.active {
      color: var(--ob-blue);
    }
    .navbar-user {
      font-family: var(--font-body);
      font-size: 0.8125rem;
      color: var(--text-muted);
      white-space: nowrap;
      padding: 0.5rem 0.75rem;
    }
    .desktop-only {
      display: inline;
    }
    .navbar-links > a.btn-nav {
      background: var(--ob-orange);
      color: var(--text-body);
      padding: 0.45rem 1.1rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      transition: background 0.2s;
    }
    .navbar-links > a.btn-nav:hover {
      background: #D96E10;
      color: var(--text-body);
    }
    .navbar-links > a.btn-nav.active {
      color: var(--text-body);
      background: var(--ob-orange);
    }
    .btn-logout {
      font-family: var(--font-body);
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--color-border);
      padding: 0.35rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-logout:hover {
      color: var(--ob-blue);
      border-color: var(--ob-blue);
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
        background: var(--surface);
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 0.5rem 0;
        border-top: 1px solid var(--color-border);
        border-bottom: 1px solid var(--color-border);
      }
      .navbar-links.open { display: flex; }

      .navbar-links a {
        padding: 0.75rem 1.5rem;
        font-size: 0.9375rem;
        border-bottom: 1px solid var(--color-border);
      }
      .navbar-links a:hover { background: var(--bg-warm); }

      .navbar-links > a.btn-nav {
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
        z-index: 999;
      }
    }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);

  @HostListener('document:keydown.escape')
  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {
    this.menuOpen.set(false);
    this.auth.logout();
  }
}
