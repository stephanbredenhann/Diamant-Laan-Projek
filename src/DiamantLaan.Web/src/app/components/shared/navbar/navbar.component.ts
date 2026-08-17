import { afterNextRender, afterRenderEffect, Component, DestroyRef, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LangService } from '../../../i18n/lang.service';
import { TPipe } from '../../../i18n/t.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TPipe],
  template: `
    <nav class="navbar" [class.navbar--stacked]="stacked()" [attr.aria-label]="'Hoofnavigasie' | t">
      <div class="navbar-inner" #inner>
        <!-- Desktop only; on mobile it moves to the footer. The partner logos live
             in the footer on every size. -->
        <div class="nav-logos">
          <img src="stadsboufonds-logo-wide.png" [alt]="'Orania Stadsboufonds' | t" />
        </div>

        <button class="hamburger" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" [attr.aria-label]="(menuOpen() ? 'Maak spyskaart toe' : 'Maak spyskaart oop') | t">
          @if (menuOpen()) {
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          } @else {
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>

        <div class="navbar-links" [class.open]="menuOpen()">
          <div class="nav-cluster">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="menuOpen.set(false)">{{ 'Tuis' | t }}</a>
            <a routerLink="/projek" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'Die projek' | t }}</a>
            <a routerLink="/" fragment="hoe-dit-werk" (click)="menuOpen.set(false)">{{ 'Hoe dit werk' | t }}</a>
            <a routerLink="/vordering" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'Vordering' | t }}</a>
            <a routerLink="/vrae" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'Vrae' | t }}</a>
            @if (auth.currentUser()) {
              <a routerLink="/my-blokke" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'My blokke' | t }}</a>
              <a routerLink="/my-transaksies" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'My transaksies' | t }}</a>
              @if (auth.isAdmin()) {
                <a routerLink="/admin" routerLinkActive="active" (click)="menuOpen.set(false)">Admin</a>
              }
              <a routerLink="/my-profiel" routerLinkActive="active" (click)="menuOpen.set(false)">{{ 'My profiel' | t }}</a>
              <button class="btn-logout" (click)="logout()">{{ 'Meld af' | t }}</button>
            }
          </div>

          <div class="nav-end">
            @if (!auth.currentUser()) {
              <a routerLink="/meld-aan" class="btn-nav-outline" (click)="menuOpen.set(false)">{{ 'Meld aan' | t }}</a>
            }

            <a routerLink="/bou" class="btn-nav-cta" (click)="menuOpen.set(false)">
              {{ 'Borg jou m²' | t }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>

            <button
              type="button"
              class="btn-lang"
              (click)="lang.toggle()"
              [attr.aria-label]="(lang.lang() === 'af' ? 'Wissel na Engels' : 'Wissel na Afrikaans') | t">
              <!-- Names the language you get, not the one you are on. Never translated:
                   a language name is always written in its own language. -->
              {{ lang.lang() === 'af' ? 'English' : 'Afrikaans' }}
            </button>
          </div>
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
    /* Full width on purpose: the 1200px .container left ~700px of dead margin on
       a 1080p screen while the bar itself was wrapping. Three columns: logos,
       links, CTA. Links only drop under the logos when they cannot sit in the
       gap; see stacked(). */
    .navbar-inner {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      column-gap: 1rem;
      row-gap: 0.25rem;
      padding: 0.4rem clamp(1rem, 2vw, 2.5rem);
    }

    .nav-logos {
      grid-column: 1;
      grid-row: 1;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    /* stadsboufonds-logo-wide.png is the same artwork trimmed of its white
       margin, so the height here is all logo. That keeps the bar thin while the
       mark still reads big. */
    .nav-logos img {
      height: clamp(2.4rem, 3vw, 3.3rem);
      width: auto;
      object-fit: contain;
      flex-shrink: 0;
    }

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

    .navbar-links { display: contents; }
    .nav-cluster {
      grid-column: 2;
      grid-row: 1;
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      justify-self: center;
      gap: 0.15rem;
      min-width: 0;
    }
    .nav-end {
      grid-column: 3;
      grid-row: 1;
      display: flex;
      align-items: center;
      gap: 0.15rem;
    }
    .navbar--stacked .nav-cluster {
      grid-column: 1 / -1;
      grid-row: 2;
      flex-wrap: wrap;
      justify-self: stretch;
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

    .nav-end > a.btn-nav-outline {
      border: 2px solid var(--route-blue);
      color: var(--route-blue);
      font-weight: 700;
    }
    .nav-end > a.btn-nav-outline:hover {
      background: rgba(3, 78, 162, 0.08);
      color: var(--accent-hover);
    }

    .nav-end > a.btn-nav-cta {
      background: var(--action-strong);
      color: var(--on-action);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.05rem;
      padding: 0.55rem 1.15rem;
      gap: 0.4rem;
      margin-left: 0.35rem;
    }
    .nav-end > a.btn-nav-cta:hover {
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

    .backdrop { display: none; }

    @media (max-width: 1120px) {
      .hamburger { display: flex; }

      /* Below here the bar is just the hamburger; the logos show in the footer. */
      .nav-logos { display: none; }
      .navbar-inner {
        display: flex;
        flex-wrap: nowrap;
        justify-content: flex-end;
      }

      /* Dissolve the desktop zones so every link is a plain drawer row again. */
      .nav-cluster, .nav-end { display: contents; }

      .navbar-links {
        --nav-row: clamp(0.35rem, 1.5svh, 1rem);
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--surface);
        flex-direction: column;
        flex-wrap: nowrap;
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
        padding: var(--nav-row) 1.5rem;
        min-height: 0;
        border-bottom: 1px solid var(--border-soft);
        border-radius: 0;
      }

      /* In the drawer "Meld aan" is just another row. Boxing it made two
         full-width buttons stacked on each other, with the desktop button
         padding on top of the row padding. */
      .nav-end > a.btn-nav-outline {
        border: none;
        border-bottom: 1px solid var(--border-soft);
      }

      .nav-end > a.btn-nav-cta {
        margin: var(--nav-row) 1.25rem;
        text-align: center;
        justify-content: center;
        border-bottom: none;
        padding: var(--nav-row) 1.15rem;
      }

      .btn-logout {
        margin: var(--nav-row) 1.25rem;
        padding: var(--nav-row) 1rem;
        min-height: 0;
        text-align: center;
        justify-content: center;
        display: flex;
      }

      /* Muting it only makes sense on desktop, where it sits in the corner. In
         the drawer it is just another row and has to stay readable. */
      .btn-lang {
        display: flex;
        justify-content: center;
        margin: 0 1.25rem var(--nav-row);
        padding: var(--nav-row) 1rem;
        min-height: 0;
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
  stacked = signal(false);

  private inner = viewChild<ElementRef<HTMLElement>>('inner');
  private observer?: ResizeObserver;
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const el = this.inner()?.nativeElement;
      if (!el) return;
      this.observer = new ResizeObserver(() => this.measure());
      this.observer.observe(el);
      for (const img of el.querySelectorAll('img')) this.observer.observe(img);
      this.destroyRef.onDestroy(() => this.observer?.disconnect());
    });

    afterRenderEffect(() => {
      this.auth.currentUser();
      this.lang.lang();
      this.measure();
    });
  }

  @HostListener('document:keydown.escape')
  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  private measure() {
    const inner = this.inner()?.nativeElement;
    if (!inner || matchMedia('(max-width: 1120px)').matches) {
      this.stacked.set(false);
      return;
    }

    const logos = inner.querySelector('.nav-logos') as HTMLElement | null;
    const cluster = inner.querySelector('.nav-cluster') as HTMLElement | null;
    const end = inner.querySelector('.nav-end') as HTMLElement | null;
    if (!logos || !cluster || !end) return;

    const styles = getComputedStyle(inner);
    const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const gap = parseFloat(styles.columnGap) || 0;
    const content = inner.clientWidth - pad;
    const clusterGap = parseFloat(getComputedStyle(cluster).columnGap || getComputedStyle(cluster).gap) || 0;
    const clusterW = Array.from(cluster.children).reduce((sum, node) => {
      return sum + (node as HTMLElement).offsetWidth;
    }, 0) + clusterGap * Math.max(0, cluster.childElementCount - 1);

    const needed = logos.offsetWidth + clusterW + end.offsetWidth + gap * 2;
    const slack = this.stacked() ? 8 : 0;
    this.stacked.set(needed > content + slack);
  }
}
