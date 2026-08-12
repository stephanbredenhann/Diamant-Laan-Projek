import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (!isAdminRoute()) {
      <footer class="site-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <a routerLink="/" class="footer-logo" aria-label="Orania Stadsboufonds tuis">
              <img src="stadsboufonds-logo-orange.png" alt="" width="40" height="40" />
              <span>
                <small>ORANIA</small>
                <strong>Stadsboufonds</strong>
              </span>
            </a>
            <p>Help Oewerpad teer, een vierkante meter op ’n slag.</p>
          </div>
          <div>
            <p class="footer-heading">Verken</p>
            <a routerLink="/projek">Die projek</a>
            <a routerLink="/hoe-dit-werk">Hoe dit werk</a>
            <a routerLink="/vordering">Vordering</a>
            <a routerLink="/vrae">Vrae</a>
          </div>
          <div>
            <p class="footer-heading">Belangrik</p>
            <a routerLink="/privaatheid">Privaatheidsbeleid</a>
            <a routerLink="/meld-aan">Meld aan</a>
            <a routerLink="/bou">Bou 1 m²</a>
          </div>
        </div>
        <div class="container footer-meta">
          <span>© {{ year }} Orania Stadsboufonds</span>
        </div>
      </footer>

      @if (showMobileCta()) {
        <a routerLink="/bou" class="mobile-cta">
          <span>Bou 1 m² vir R500</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      }
    }
  `,
  styles: [`
    .site-footer {
      background: var(--tar);
      color: rgba(255, 255, 255, 0.72);
      padding: 3.5rem 0 2rem;
      margin-top: 0;
    }
    .footer-grid {
      display: grid;
      gap: 2rem;
      grid-template-columns: 1.4fr 1fr 1fr;
    }
    .footer-logo {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: #fff;
      margin-bottom: 1rem;
    }
    .footer-logo img {
      width: 2.5rem;
      height: 2.5rem;
      object-fit: contain;
    }
    .footer-logo small {
      display: block;
      font-family: var(--font-body);
      font-size: 0.7rem;
      letter-spacing: 0.14em;
      font-weight: 500;
      opacity: 0.7;
    }
    .footer-logo strong {
      display: block;
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 800;
      line-height: 1;
    }
    .footer-brand p {
      max-width: 22rem;
      font-size: 1rem;
      line-height: 1.6;
    }
    .footer-heading {
      font-family: var(--font-display);
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.45);
      margin-bottom: 0.75rem;
    }
    .footer-grid a {
      display: block;
      color: rgba(255, 255, 255, 0.82);
      text-decoration: none;
      font-weight: 600;
      padding: 0.35rem 0;
      min-height: auto;
    }
    .footer-grid a:hover { color: #fff; text-decoration: underline; }
    .footer-meta {
      margin-top: 2.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.42);
    }
    .mobile-cta {
      display: none;
    }
    @media (max-width: 800px) {
      .footer-grid { grid-template-columns: 1fr; }
      .mobile-cta {
        display: flex;
        position: fixed;
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
        z-index: 40;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: var(--action-strong);
        color: #fff;
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 1.15rem;
        text-decoration: none;
        min-height: 3.5rem;
        padding: 0.85rem 1.25rem;
        box-shadow: var(--shadow-cta);
      }
      .mobile-cta:hover { color: #fff; background: var(--action-strong-hover); }
    }
  `]
})
export class SiteFooterComponent {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly year = new Date().getFullYear();
  private url = signal(this.router.url);

  isAdminRoute = () => this.url().startsWith('/admin');

  showMobileCta = () => {
    const path = this.url().split('?')[0];
    if (this.isAdminRoute()) return false;
    const hide = ['/bou', '/kaart', '/meld-aan', '/registreer', '/betalings', '/wagwoord'];
    return !hide.some(p => path === p || path.startsWith(p + '/'));
  };

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(e => this.url.set(e.urlAfterRedirects));
  }
}
