import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, filter, of, switchMap, takeUntil, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { RoadService } from '../../services/road.service';
import { SettingsService } from '../../services/settings.service';
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
}

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

    .hero {
      position: relative;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--color-surface);
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

    .particle-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2;
    }

    .hero-content {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100vh;
      min-height: 100dvh;
      padding: 5.5rem 1.5rem 2.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .hero-brand {
      max-width: 520px;
    }

    .orania {
      font-family: var(--font-heading);
      font-size: 0.8125rem;
      font-weight: 400;
      letter-spacing: 0.28em;
      color: var(--color-text);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }

    .brand-title {
      font-family: var(--font-heading);
      font-size: clamp(2.5rem, 7vw, 4.5rem);
      font-weight: 900;
      line-height: 0.95;
      letter-spacing: -2px;
      margin-bottom: 0.5rem;
    }

    .stads, .fonds {
      color: var(--color-text);
    }

    .bou {
      color: var(--color-orange);
    }

    .title-underline,
    .bouer-underline {
      display: flex;
      height: 6px;
      margin-bottom: 1rem;
    }

    .title-underline {
      max-width: min(100%, 420px);
    }

    .bouer-underline {
      max-width: 280px;
      margin: 0.35rem auto 0;
    }

    .line-black {
      flex: 1.15;
      background: var(--color-text);
    }

    .line-orange {
      flex: 1;
      background: var(--color-orange);
    }

    .hero-tagline p {
      font-family: var(--font-heading);
      font-size: clamp(1.125rem, 2.8vw, 1.625rem);
      font-weight: 400;
      color: var(--color-text);
      line-height: 1.35;
      letter-spacing: -0.3px;
    }

    .hero-tagline .accent {
      color: var(--color-orange);
    }

    .hero-brackets {
      position: relative;
      width: 220px;
      height: 200px;
      flex-shrink: 0;
      display: none;
    }

    .bracket {
      position: absolute;
      color: var(--color-text);
    }

    .bracket-orange {
      color: var(--color-orange);
    }

    .hero-bottom {
      text-align: center;
      padding-bottom: 1rem;
    }

    .bottom-line {
      font-family: var(--font-heading);
      font-size: clamp(1.125rem, 2.5vw, 1.5rem);
      font-weight: 500;
      color: var(--color-text);
      letter-spacing: -0.3px;
    }

    .stads-inline {
      color: var(--color-text);
      font-weight: 700;
    }

    .actions-band {
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
      padding: 2.5rem 0;
    }

    .actions-inner {
      text-align: center;
    }

    .actions-lead {
      font-family: var(--font-body);
      font-size: 1.0625rem;
      color: var(--color-text-muted);
      margin-bottom: 1.25rem;
    }

    .hero-actions {
      display: flex;
      gap: 0.875rem;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
    }

    .btn-lg {
      padding: 0.875rem 1.75rem;
      font-size: 0.9375rem;
      border-radius: 0;
    }

    .stats-section {
      background: var(--color-bg);
      padding: 5rem 0 4rem;
    }

    .stats-card {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      padding: 2rem 2.5rem;
      max-width: 720px;
      margin: 0 auto;
    }

    .stat {
      text-align: center;
      flex: 1;
      padding: 0 1.5rem;
    }

    .stat-value {
      font-family: var(--font-heading);
      font-size: 2rem;
      font-weight: 800;
      color: var(--color-text);
      line-height: 1.2;
    }

    .stat-value.accent-value {
      color: var(--color-orange);
    }

    .stat-value small {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-muted);
    }

    .stat-label {
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 0.35rem;
    }

    .stat-divider {
      width: 2px;
      height: 48px;
      background: var(--color-border);
      flex-shrink: 0;
    }

    .how-it-works {
      background: var(--color-surface);
      padding: 4rem 0 5rem;
    }

    .section-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .section-logo {
      height: 36px;
      width: auto;
      margin-bottom: 1rem;
    }

    .how-it-works h2 {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--color-text);
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 1.75rem;
      padding: 2.25rem 2rem;
      background: var(--color-bg);
      border: 2px solid var(--color-border);
      opacity: 0;
      transform: translateY(40px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }

    .step.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .step:nth-child(1).visible { transition-delay: 0ms; }
    .step:nth-child(2).visible { transition-delay: 120ms; }
    .step:nth-child(3).visible { transition-delay: 240ms; }

    .step-number {
      flex-shrink: 0;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-orange);
      color: #fff;
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 800;
    }

    .step-body h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }

    .step-body p {
      font-size: 1rem;
      color: var(--color-text-muted);
      line-height: 1.65;
    }

    .cta-section {
      background: var(--color-bg);
      padding: 3rem 0 4rem;
    }

    .cta-card {
      background: var(--color-dark);
      padding: 3rem 2rem;
      text-align: center;
      max-width: 720px;
      margin: 0 auto;
    }

    .cta-logo {
      height: 32px;
      width: auto;
      margin-bottom: 1.25rem;
      opacity: 0.9;
    }

    .cta-card h2 {
      color: #fff;
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
    }

    .cta-card p {
      color: #C8C8C8;
      font-size: 1rem;
      max-width: 480px;
      margin: 0 auto 1.75rem;
      line-height: 1.65;
    }

    .bou-cta {
      font-weight: 900;
      letter-spacing: 0.05em;
    }

    .site-footer {
      background: var(--color-orange);
      padding: 2.5rem 0;
      text-align: center;
    }

    .footer-logo {
      height: 48px;
      width: auto;
      margin-bottom: 0.75rem;
    }

    .footer-tagline {
      font-family: var(--font-heading);
      font-size: 0.875rem;
      font-weight: 500;
      color: #fff;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .footer-copy {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.75);
    }

    @media (min-width: 768px) {
      .hero-brackets {
        display: block;
      }

      .hero-content {
        padding-left: 2rem;
        padding-right: 2rem;
      }
    }

    @media (max-width: 768px) {
      .hero-content {
        padding-top: 5rem;
      }

      .hero-top {
        flex-direction: column;
      }

      .hero-bottom {
        margin-top: auto;
      }

      .stats-card {
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.5rem 1.25rem;
      }

      .stat-divider {
        width: 100%;
        height: 2px;
      }

      .step {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 2rem 1.5rem;
      }

      .hero-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .hero-actions .btn {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .brand-title {
        font-size: 2.25rem;
      }

      .how-it-works h2,
      .cta-card h2 {
        font-size: 1.375rem;
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
  @ViewChild('heroSection') heroRef!: ElementRef<HTMLElement>;
  @ViewChildren('stepEl') stepElements!: QueryList<ElementRef<HTMLElement>>;

  private road = inject(RoadService);
  private ngZone = inject(NgZone);
  private settingsService = inject(SettingsService);
  auth = inject(AuthService);

  showStatsSection = true;
  showTotalRaised = true;
  progress = 0;
  totalRaised = 0;
  siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  private particles: Particle[] = [];
  private animationFrameId = 0;
  private mouseX = -1000;
  private mouseY = -1000;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private reducedMotion = false;
  private onMouseMove?: (e: MouseEvent) => void;
  private onMouseLeave?: () => void;
  private readonly particleCount = 160;
  private readonly mouseRadius = 140;
  private destroy$ = new Subject<void>();

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

    if (!this.reducedMotion) {
      this.initParticles();
      this.setupMouseTracking();
    }

    this.setupScrollAnimations();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();

    const hero = this.heroRef?.nativeElement;
    if (hero && this.onMouseMove) {
      hero.removeEventListener('mousemove', this.onMouseMove);
    }
    if (hero && this.onMouseLeave) {
      hero.removeEventListener('mouseleave', this.onMouseLeave);
    }
  }

  private initParticles() {
    // Canvas element was removed during template cleanup — particle effect is disabled.
    return;
    /* dead code preserved for reference
    const canvas = this.canvasRef?.nativeElement;
    const hero = this.heroRef?.nativeElement;
    if (!canvas || !hero) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = [
      'rgba(255, 248, 235, ',
      'rgba(255, 255, 255, ',
      'rgba(245, 230, 200, ',
      'rgba(230, 210, 175, ',
    ];

    const unpavedTop = () => canvas.height * 0.3;
    const unpavedBottom = () => canvas.height * 0.95;

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      if (this.particles.length === 0) {
        for (let i = 0; i < this.particleCount; i++) {
          const top = unpavedTop();
          const bottom = unpavedBottom();
          this.particles.push({
            x: Math.random() * canvas.width * 0.85,
            y: top + Math.random() * (bottom - top),
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.2 - 0.08,
            radius: Math.random() * 3.5 + 1.5,
            opacity: Math.random() * 0.45 + 0.35,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
      }
    };

    resize();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(resize);
      this.resizeObserver.observe(hero);
    }

    this.ngZone.runOutsideAngular(() => {
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const top = unpavedTop();
        const bottom = unpavedBottom();

        for (const p of this.particles) {
          const dx = p.x - this.mouseX;
          const dy = p.y - this.mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < this.mouseRadius && dist > 0) {
            const force = (this.mouseRadius - dist) / this.mouseRadius;
            p.vx += (dx / dist) * force * 0.22;
            p.vy += (dy / dist) * force * 0.22;
          }

          p.vx *= 0.97;
          p.vy *= 0.97;
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = canvas.width * 0.85;
          if (p.x > canvas.width * 0.85) p.x = 0;
          if (p.y < top) p.y = bottom;
          if (p.y > bottom) p.y = top;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color + p.opacity + ')';
          ctx.shadowBlur = p.radius * 1.5;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        this.animationFrameId = requestAnimationFrame(animate);
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
    */
  }

  private setupMouseTracking() {
    const hero = this.heroRef?.nativeElement;
    if (!hero) return;

    this.onMouseMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };

    this.onMouseLeave = () => {
      this.mouseX = -1000;
      this.mouseY = -1000;
    };

    hero.addEventListener('mousemove', this.onMouseMove);
    hero.addEventListener('mouseleave', this.onMouseLeave);
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
