import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LangService } from '../../../i18n/lang.service';
import { TPipe } from '../../../i18n/t.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TPipe],
  template: `
    <nav class="navbar" [attr.aria-label]="'Hoofnavigasie' | t">
      <div class="container navbar-inner">
        <a routerLink="/" class="nav-brand" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" [attr.aria-label]="'Orania Stadsboufonds tuis' | t">
          <img src="stadsboufonds-logo-orange.png" alt="" width="36" height="36" />
          <span class="brand-text">
            <small>ORANIA</small>
            <strong>Stadsboufonds</strong>
          </span>
        </a>

        <button class="hamburger" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" [attr.aria-label]="(menuOpen() ? 'Maak spyskaart toe' : 'Maak spyskaart oop') | t">
          @if (menuOpen()) {
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          } @else {
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>

        <div class="navbar-links" [class.open]="menuOpen()">
          <a routerLink="/projek" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'Die projek' | t }}</a>
          <a routerLink="/" fragment="hoe-dit-werk" (click)="menuOpen.set(false)">{{ 'Hoe dit werk' | t }}</a>
          <a routerLink="/vordering" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'Vordering' | t }}</a>
          <a routerLink="/vrae" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'Vrae' | t }}</a>
          @if (auth.currentUser(); as user) {
            <a routerLink="/my-blokke" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'My blokke' | t }}</a>
            <a routerLink="/my-transaksies" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'My transaksies' | t }}</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active" (click)="menuOpen.set(false)">Admin</a>
            }
            <a routerLink="/my-profiel" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'My profiel' | t }}</a>
            <button class="btn-logout" (click)="logout()">{{ 'Meld af' | t }}</button>
          } @else {
            <a routerLink="/meld-aan" class="btn-nav-outline" (click)="menuOpen.set(false)">{{ 'Meld aan' | t }}</a>
          }

          <a routerLink="/bou" class="btn-nav-cta" (click)="menuOpen.set(false)">
            {{ 'Borg 1 m²' | t }}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>

          <button
            type="button"
            class="btn-lang"
            (click)="lang.toggle()"
            [attr.aria-label]="(lang.lang() === 'af' ? 'Wissel na Engels' : 'Wissel na Afrikaans') | t">
            <span [class.on]="lang.lang() === 'af'">AF</span>
            <span aria-hidden="true">/</span>
            <span [class.on]="lang.lang() === 'en'">EN</span>
          </button>
        </div>
      </div>
    </nav>
    @if (menuOpen()) {
      <div class="backdrop" (click)="menuOpen.set(false)"></div>
    }
  `,
  styles: [`
    .navbar {
      background: color-mix(in srgb, var(--bg-warm) 92%, white);
      border-bottom: 1px solid var(--border-soft);
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 1000;
      backdrop-filter: blur(8px);
    }
    .navbar-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0;
      gap: 1rem;
    }

    .nav-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      color: var(--ink);
      text-decoration: none;
      padding: 0.25rem 0;
      min-height: var(--tap-min);
      flex-shrink: 0;
    }
    .nav-brand img {
      width: 2.25rem;
      height: 2.25rem;
      object-fit: contain;
    }
    .brand-text small {
      display: block;
      font-size: 0.65rem;
      letter-spacing: 0.16em;
      font-weight: 500;
      color: var(--text-muted);
      line-height: 1.2;
    }
    .brand-text strong {
      display: block;
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 800;
      line-height: 1;
      color: var(--ink);
    }
    .nav-brand:hover strong { color: var(--action); }

    .hamburger {
      display: none;
      background: none;
      border: none;
      color: var(--ink);
      cursor: pointer;
      padding: 0.5rem;
      margin: 0;
      line-height: 1;
      min-height: var(--tap-min);
      min-width: var(--tap-min);
      align-items: center;
      justify-content: center;
    }

    .navbar-links {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      flex-wrap: wrap;
    }
    .navbar-links a {
      font-family: var(--font-body);
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-body);
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      min-height: var(--tap-min);
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
    }
    .navbar-links a:hover {
      color: var(--action);
      background: rgba(245, 130, 32, 0.08);
      text-decoration: none;
    }
    .navbar-links a.active { color: var(--action); }

    .navbar-links > a.btn-nav-outline {
      border: 2px solid var(--route-blue);
      color: var(--route-blue);
      font-weight: 700;
    }
    .navbar-links > a.btn-nav-outline:hover {
      background: rgba(3, 78, 162, 0.08);
      color: var(--accent-hover);
    }

    .navbar-links > a.btn-nav-cta {
      background: var(--action-strong);
      color: var(--on-action);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.05rem;
      padding: 0.55rem 1.15rem;
      gap: 0.4rem;
      margin-left: 0.35rem;
    }
    .navbar-links > a.btn-nav-cta:hover {
      background: var(--action-strong-hover);
      color: var(--on-action);
    }

    .btn-logout {
      font-family: var(--font-body);
      background: transparent;
      color: var(--text-body);
      border: 2px solid var(--border-strong);
      padding: 0.5rem 1rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      min-height: var(--tap-min);
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-logout:hover {
      color: var(--action);
      border-color: var(--action);
    }

    /* Deliberately quiet: a utility, not a call to action. It keeps a full tap
       target but pays for it with padding rather than a box. */
    .btn-lang {
      font-family: var(--font-body);
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 0 0.5rem;
      margin-left: 0.15rem;
      min-height: var(--tap-min);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      white-space: nowrap;
      opacity: 0.65;
    }
    .btn-lang:hover { opacity: 1; }
    .btn-lang .on { color: var(--ink); }

    .backdrop { display: none; }

    @media (max-width: 980px) {
      .hamburger { display: flex; }

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
        border-top: 1px solid var(--border-soft);
        border-bottom: 1px solid var(--border-soft);
        max-height: calc(100dvh - 100%);
        overflow-y: auto;
      }
      .navbar-links.open { display: flex; }

      .navbar-links a {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-soft);
        border-radius: 0;
      }

      /* In the drawer "Meld aan" is just another row. Boxing it made two
         full-width buttons stacked on each other, with the desktop button
         padding on top of the row padding. */
      .navbar-links > a.btn-nav-outline {
        border: none;
        border-bottom: 1px solid var(--border-soft);
      }

      .navbar-links > a.btn-nav-cta {
        margin: 0.75rem 1.25rem;
        text-align: center;
        justify-content: center;
        border-bottom: none;
        padding: 0.85rem 1.15rem;
      }

      .btn-logout {
        margin: 0.75rem 1.25rem;
        text-align: center;
        justify-content: center;
        display: flex;
      }

      /* Muting it only makes sense on desktop, where it sits in the corner. In
         the drawer it is just another row and has to stay readable. */
      .btn-lang {
        display: flex;
        justify-content: center;
        margin: 0 1.25rem 0.75rem;
        padding: 0.85rem 1rem;
        font-size: 1rem;
        opacity: 1;
        gap: 0.35rem;
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
  lang = inject(LangService);
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
