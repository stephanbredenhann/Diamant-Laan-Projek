import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TPipe } from '../../../i18n/t.pipe';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    @if (!isAdminRoute()) {
      <footer class="site-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <a routerLink="/" class="footer-logo" [attr.aria-label]="'Orania Stadsboufonds tuis' | t">
              <span>
                <small>ORANIA</small>
                <strong>Stadsboufonds</strong>
              </span>
            </a>
            <p>{{ 'Help Oewerpad teer, een vierkante meter op ’n slag.' | t }}</p>
          </div>
          <div>
            <p class="footer-heading">{{ 'Verken' | t }}</p>
            <a routerLink="/projek">{{ 'Die projek' | t }}</a>
            <a routerLink="/" fragment="hoe-dit-werk">{{ 'Hoe dit werk' | t }}</a>
            <a routerLink="/vordering">{{ 'Vordering' | t }}</a>
            <a routerLink="/vrae">{{ 'Vrae' | t }}</a>
          </div>
          <div>
            <p class="footer-heading">{{ 'Belangrik' | t }}</p>
            <a href="https://orania.co.za/privaatheidsbeleid/" target="_blank" rel="noopener">{{ 'Privaatheidsbeleid' | t }}</a>
            <a routerLink="/meld-aan">{{ 'Meld aan' | t }}</a>
            <a routerLink="/bou">{{ 'Borg jou m²' | t }}</a>
          </div>
        </div>
        <div class="container">
          <p class="footer-heading">{{ 'Projek deur' | t }}</p>
          <div class="footer-logos">
            <!-- Mobile only; above 1120px the navbar carries it. -->
            <img src="stadsboufonds-logo-wide.png" [alt]="'Orania Stadsboufonds' | t" class="mark" />
            <img src="dorpsraad-logo.png" [alt]="'Orania Dorpsraad' | t" />
            <img src="oom-logo.png" [alt]="'Orania Ontwikkelingsmaatskappy' | t" />
            <img src="ob-logo.png" [alt]="'Orania Beweging' | t" class="stacked" />
          </div>
        </div>
        <div class="container footer-meta">
          <span>© {{ year }} Orania Stadsboufonds</span>
        </div>
      </footer>

      @if (showMobileCta()) {
        <a routerLink="/bou" class="mobile-cta">
          <span>{{ 'Borg jou m² vir R500' | t }}</span>
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
    /* Dark artwork on a dark footer, so it sits on a light plate rather than
       being knocked out. Warm cream, not white: the same paper the rest of the
       site is on, so it reads as a plate and not as a hole in the footer. */
    .footer-logos {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      gap: 1.5rem 2.5rem;
      padding: 1.5rem 2rem;
      background: var(--bg-warm);
      border-radius: var(--radius-md);
      /* Hugs the three logos instead of stretching the plate across the
         container and leaving half of it empty. */
      width: fit-content;
      max-width: 100%;
    }
    .container > .footer-heading { margin-top: 2.5rem; }
    .footer-logos img {
      height: 4.5rem;
      width: auto;
      max-width: 100%;
      object-fit: contain;
    }
    .footer-logos img.mark { height: 4rem; }
    .footer-logos img.stacked { height: 6rem; }
    /* Above here the navbar already shows the Stadsboufonds mark. */
    @media (min-width: 1121px) {
      .footer-logos img.mark { display: none; }
    }

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
  private pastHero = signal(false);

  isAdminRoute = () => this.url().startsWith('/admin');

  @HostListener('window:scroll')
  onScroll() {
    this.pastHero.set(window.scrollY > window.innerHeight * 0.7);
  }

  showMobileCta = () => this.url().split('?')[0] === '/' && this.pastHero();

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(e => {
      this.url.set(e.urlAfterRedirects);
      this.onScroll();
    });
    this.onScroll();
  }
}
