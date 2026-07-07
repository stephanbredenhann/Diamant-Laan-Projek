import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, filter, of, switchMap, takeUntil, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { RoadService } from '../../services/road.service';
import { SettingsService } from '../../services/settings.service';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <img src="hero-bg.jpeg" alt="" class="hero-bg" aria-hidden="true" />

      <!-- Cloud layer -->
      <div class="cloud-layer" aria-hidden="true">
        <img src="clouds/cloud-1.png" class="cloud cloud--slow" alt="" />
        <img src="clouds/cloud-2.png" class="cloud cloud--medium" alt="" />
        <img src="clouds/cloud-3.png" class="cloud cloud--fast" alt="" />
      </div>

      <div class="hero-content">
        <div class="hero-inner">
          <!-- Left text block -->
          <div class="hero-text">
            <p class="hero-label">ORANIA</p>
            <h1 class="hero-title">
              <span class="hero-title-black">Stads</span><span class="hero-title-orange">bou</span><span class="hero-title-black">fonds</span>
            </h1>
            <div class="title-underline" aria-hidden="true">
              <span class="title-underline--black"></span>
              <span class="title-underline--orange"></span>
            </div>
            <p class="hero-subtitle">
              <span class="hero-subtitle-muted">van</span> grondpad /
              <span class="hero-subtitle-muted">tot</span> <span class="hero-subtitle-accent">teerpad</span>
            </p>
          </div>

          <!-- Right OB logo -->
          <div class="hero-logo">
            <img
              src="ob-logo.png"
              alt="Orania Beweging"
              class="hero-ob-logo"
            />
          </div>
        </div>

        <!-- Bottom-center pill CTA -->
        <div class="hero-cta">
          <a [routerLink]="ctaLink" class="pill-cta">Begin <span class="pill-cta-em">Bou</span>!</a>
          <div class="scroll-cue" aria-hidden="true">
            <svg class="scroll-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span class="scroll-label">Sien meer</span>
          </div>
        </div>
      </div>
    </section>

    @if (showStatsSection) {
      <section class="stats-section">
        <div class="container">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value stat-value--accent">{{ progress }}<small>%</small></div>
              <div class="stat-label">Voltooi</div>
            </div>

            @if (showTotalRaised) {
              <div class="stat-card">
                <div class="stat-value">R{{ totalRaised | number:'1.0-0' }}</div>
                <div class="stat-label">Ingesamel</div>
              </div>
            }

            <div class="stat-card">
              <div class="stat-value stat-value--accent">R500</div>
              <div class="stat-label">Per m²</div>
            </div>
          </div>
        </div>
      </section>
    }

    <section class="how-it-works">
      <div class="container">
        <h2 class="section-heading">Bou jou blokkie</h2>
        <div class="steps">
          <div class="step" #stepEl>
            <div class="step-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="step-body">
              <h3>Kies jou koördinate</h3>
              <p>Gebruik die kaart om enige beskikbare vierkante meter te kies wat jy wil bou.</p>
            </div>
          </div>
          <div class="step" #stepEl>
            <div class="step-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
              </svg>
            </div>
            <div class="step-body">
              <h3>Bou met jou bydrae</h3>
              <p>Bou 'n vierkante meter teen R 500. Elke meter bring ons nader aan 'n geteerde pad.</p>
            </div>
          </div>
          <div class="step" #stepEl>
            <div class="step-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div class="step-body">
              <h3>Volg die vordering</h3>
              <p>Kyk hoe jou blok vanuit 'n grondpad tot teerpad verander. Sien die impak wat jy maak.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="site-footer">
      <div class="container footer-inner">
        <p class="footer-copy">&copy; 2026 Stephan Bredenhann &mdash; <a href="https://stephanbredenhann.github.io" target="_blank" rel="noopener">stephanbredenhann.github.io</a></p>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* ===== HERO ===== */
    .hero {
      position: relative;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--surface);
      overflow: hidden;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      z-index: 0;
    }

    /* ===== CLOUD LAYER ===== */
    .cloud-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 15%;
      z-index: 1;
      pointer-events: none;
      overflow: hidden;
    }

    .cloud {
      position: absolute;
      top: 0;
      height: 100%;
      width: auto;
      opacity: 0.85;
      will-change: transform;
    }

    .cloud--slow {
      left: 5%;
      animation: cloud-drift 60s linear infinite;
      animation-delay: 0s;
    }
    .cloud--medium {
      left: 35%;
      animation: cloud-drift 45s linear infinite;
      animation-delay: -20s;
    }
    .cloud--fast {
      left: 65%;
      animation: cloud-drift 30s linear infinite;
      animation-delay: -40s;
    }

    @keyframes cloud-drift {
      from { transform: translateX(-100%); }
      to   { transform: translateX(100vw); }
    }

    @media (prefers-reduced-motion: reduce) {
      .cloud { animation: none; }
    }

    /* ===== HERO CONTENT ===== */
    .hero-content {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100dvh;
      padding: 5.5rem 1.5rem 3rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .hero-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 2rem;
      flex: 1;
    }

    /* Left text block */
    .hero-text {
      flex: 1;
    }

    .hero-label {
      font-family: var(--font-heading);
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--ob-orange);
      margin-bottom: 0.5rem;
    }

    .hero-title {
      font-family: var(--font-heading);
      font-size: clamp(2.5rem, 7vw, 4.5rem);
      font-weight: 900;
      line-height: 0.95;
      letter-spacing: -2px;
    }

    .hero-title-black { color: var(--text-body); }
    .hero-title-orange { color: var(--ob-orange); }

    /* Dual underline bar */
    .title-underline {
      display: flex;
      width: 100%;
      max-width: 280px;
      height: 6px;
      margin: 0.75rem 0 1rem;
      border-radius: 3px;
      overflow: hidden;
    }
    .title-underline--black  { flex: 1.15; background: var(--text-body); }
    .title-underline--orange { flex: 1;    background: var(--ob-orange); }

    .hero-subtitle {
      font-family: var(--font-heading);
      font-size: clamp(1.125rem, 2.8vw, 1.625rem);
      font-weight: 600;
      color: var(--text-body);
    }

    .hero-subtitle-accent { color: var(--ob-orange); }
    .hero-subtitle-muted { color: var(--text-body); }

    /* Right OB logo */
    .hero-logo {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .hero-ob-logo {
      height: auto;
      max-height: 180px;
      width: auto;
      max-width: 240px;
      object-fit: contain;
    }

    /* Bottom-center CTA pill */
    .hero-cta {
      margin-top: auto;
      padding-bottom: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .pill-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--ob-orange);
      color: var(--text-body);
      font-family: var(--font-heading);
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 0.875rem 2.5rem;
      border-radius: 999px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(245, 130, 32, 0.35);
      transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
    }

    .pill-cta:hover {
      background: #D96E10;
      box-shadow: 0 6px 20px rgba(245, 130, 32, 0.45);
      transform: translateY(-1px);
    }

    .pill-cta:focus-visible {
      outline: 3px solid var(--ob-blue);
      outline-offset: 2px;
    }

    .pill-cta-em {
      font-weight: 900;
    }

    /* Scroll cue */
    .scroll-cue {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      margin-top: 1.5rem;
      color: var(--text-muted);
    }

    .scroll-chevron {
      animation: scroll-bounce 2s ease-in-out infinite;
    }

    @keyframes scroll-bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(6px); }
      60% { transform: translateY(3px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .scroll-chevron { animation: none; }
    }

    .scroll-label {
      font-family: var(--font-body);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    /* ===== STATS SECTION ===== */
    .stats-section {
      background: var(--bg-warm);
      padding: 5rem 0 4rem;
    }

    .stats-grid {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .stat-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-soft);
      padding: 1.75rem 2rem;
      text-align: center;
      flex: 1;
      min-width: 180px;
    }

    .stat-value {
      font-family: var(--font-heading);
      font-size: 2rem;
      font-weight: 800;
      color: var(--text-body);
      line-height: 1.2;
    }

    .stat-value--accent {
      color: var(--ob-orange);
    }

    .stat-value small {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .stat-label {
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 0.5rem;
    }

    /* ===== HOW-IT-WORKS SECTION ===== */
    .how-it-works {
      background: var(--surface);
      padding: 4rem 0 5rem;
    }

    .section-heading {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-body);
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.75rem 2rem;
      background: var(--bg-warm);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-soft);
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }

    .step.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .step:nth-child(1).visible { transition-delay: 0ms; }
    .step:nth-child(2).visible { transition-delay: 120ms; }
    .step:nth-child(3).visible { transition-delay: 240ms; }

    .step-icon {
      flex-shrink: 0;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ob-orange);
      color: #FFFFFF;
      border-radius: 50%;
    }

    .step-body h3 {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-body);
      margin-bottom: 0.5rem;
    }

    .step-body p {
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--text-muted);
      line-height: 1.65;
    }

    /* ===== FOOTER ===== */
    .site-footer {
      background: var(--ob-blue);
      padding: 3rem 0;
      text-align: center;
    }

    .footer-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .footer-copy {
      font-family: var(--font-body);
      font-size: 0.875rem;
      font-weight: 500;
      color: #FFFFFF;
      margin: 0;
    }

    .footer-copy a {
      color: #FFFFFF;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* ===== RESPONSIVE ===== */
    @media (min-width: 768px) {
      .hero-content {
        padding-left: 2rem;
        padding-right: 2rem;
      }
    }

    @media (max-width: 768px) {
      .hero-content {
        padding-top: 4.5rem;
      }

      .hero-inner {
        flex-direction: column;
        text-align: center;
      }

      .hero-ob-logo {
        max-height: 120px;
        max-width: 160px;
      }

      .hero-text {
        text-align: left;
        width: 100%;
      }

      .stats-grid {
        flex-direction: column;
        align-items: stretch;
      }

      .step {
        flex-direction: column;
        text-align: center;
      }

      .step-body {
        text-align: center;
      }
    }

    @media (max-width: 480px) {
      .hero-title {
        font-size: 2.25rem;
      }

      .section-heading {
        font-size: 1.375rem;
      }

      .stat-value {
        font-size: 1.75rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .step {
        opacity: 1;
        transform: none;
        transition: none;
      }
    }
  `],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('stepEl') stepElements!: QueryList<ElementRef<HTMLElement>>;

  private road = inject(RoadService);
  private settingsService = inject(SettingsService);
  auth = inject(AuthService);

  showStatsSection = true;
  showTotalRaised = true;
  progress = 0;
  totalRaised = 0;

  private intersectionObserver?: IntersectionObserver;
  private reducedMotion = false;
  private destroy$ = new Subject<void>();

  get ctaLink(): string {
    return this.auth.currentUser() ? '/kaart' : '/meld-aan';
  }

  ngOnInit() {
    this.settingsService.getHomeStatsSettings()
      .pipe(
        catchError(() => {
          console.error('Kon nie tuisblad instellings laai nie.');
          return of({ showStatsSection: true, showTotalRaised: true });
        }),
        tap(settings => {
          this.showStatsSection = settings.showStatsSection;
          this.showTotalRaised = settings.showTotalRaised;
        }),
        filter(settings => settings.showStatsSection),
        switchMap(() => this.road.getStats().pipe(
          catchError(() => {
            console.error('Kon nie pad statistieke laai nie.');
            return of({ progress: 0, totalRaised: 0 });
          })
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(stats => {
        this.progress = stats.progress;
        this.totalRaised = stats.totalRaised;
      });
  }

  ngAfterViewInit() {
    if (typeof window === 'undefined') return;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setupScrollAnimations();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
  }

  private setupScrollAnimations() {
    if (typeof IntersectionObserver === 'undefined') {
      this.stepElements?.forEach(el => el.nativeElement.classList.add('visible'));
      return;
    }

    if (this.reducedMotion) {
      this.stepElements?.forEach(el => el.nativeElement.classList.add('visible'));
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    this.stepElements?.forEach(el => {
      this.intersectionObserver?.observe(el.nativeElement);
    });
  }
}
