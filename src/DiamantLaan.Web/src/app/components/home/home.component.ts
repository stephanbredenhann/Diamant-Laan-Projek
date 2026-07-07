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
import { ShareButtonComponent } from '../shared/share-button/share-button.component';

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
  imports: [CommonModule, RouterLink, ShareButtonComponent],
  template: `
    <section class="hero" #heroSection>
      <img src="hero-bg.jpeg" alt="" class="hero-bg" aria-hidden="true" />
      <canvas #particleCanvas class="particle-canvas" aria-hidden="true"></canvas>

      <div class="hero-content">
        <div class="hero-top">
          <div class="hero-brand">
            <p class="orania">ORANIA</p>
            <h1 class="brand-title">
              <span class="stads">Stads</span><span class="bou">bou</span><span class="fonds">fonds</span>
            </h1>
            <div class="title-underline" aria-hidden="true">
              <span class="line-black"></span>
              <span class="line-orange"></span>
            </div>
            <div class="hero-tagline">
              <p><span class="accent">van</span> grondpad</p>
              <p><span class="accent">tot</span> teerpad</p>
            </div>
          </div>

          <div class="hero-brackets" aria-hidden="true">
            @for (b of brackets; track b.id) {
              <svg
                class="bracket"
                [class.bracket-orange]="b.orange"
                [style.top.%]="b.top"
                [style.right.%]="b.right"
                [style.width.px]="b.size"
                [style.height.px]="b.size"
                [style.transform]="'rotate(' + b.rotate + 'deg)'"
                viewBox="0 0 40 40"
                fill="none"
              >
                <path d="M0 0v40h8V8h32V0H0z" fill="currentColor" />
              </svg>
            }
          </div>
        </div>

        <div class="hero-bottom">
          <p class="bottom-line">
            <span class="bou">bou</span> saam en word 'n
            <span class="stads-inline">Stads</span><span class="bou">bouer</span>
          </p>
          <div class="bouer-underline" aria-hidden="true">
            <span class="line-black"></span>
            <span class="line-orange"></span>
          </div>
        </div>
      </div>
    </section>

    <section class="actions-band">
      <div class="container actions-inner">
        <p class="actions-lead">Jy bou 'n stukkie pad in die stad.</p>
        <div class="hero-actions">
          <a routerLink="/kaart" class="btn btn-primary btn-lg">
            Sien kaart &amp; kies jou blokkie
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          @if (!auth.currentUser()) {
            <a routerLink="/registreer" class="btn btn-outline btn-lg">Word 'n Stadsbouer</a>
          }
          <app-share-button
            label="Deel hierdie projek"
            [url]="siteUrl"
            text="Dra by aan Diamant Laan — help ons om die pad te teer!"
          />
        </div>
      </div>
    </section>

    @if (showStatsSection) {
      <section class="stats-section">
        <div class="container">
          <div class="stats-card">
            <div class="stat">
              <div class="stat-value accent-value">{{ progress }}<small>%</small></div>
              <div class="stat-label">Voltooi</div>
            </div>

            @if (showTotalRaised) {
              <div class="stat-divider"></div>
              <div class="stat">
                <div class="stat-value">R{{ totalRaised | number:'1.0-0' }}</div>
                <div class="stat-label">Ingesamel</div>
              </div>
            }

            <div class="stat-divider"></div>
            <div class="stat">
              <div class="stat-value accent-value">R500</div>
              <div class="stat-label">Per m²</div>
            </div>
          </div>
        </div>
      </section>
    }

    <section class="how-it-works">
      <div class="container">
        <div class="section-header">
          <img src="stadsboufonds-logo-orange.png" alt="Orania Stadsboufonds" class="section-logo" />
          <h2>Bou jou blokkie</h2>
        </div>
        <div class="steps">
          <div class="step" #stepEl>
            <div class="step-number">1</div>
            <div class="step-body">
              <h3>Kies jou koördinate</h3>
              <p>Gebruik die kaart om enige beskikbare vierkante meter te kies wat jy wil bou.</p>
            </div>
          </div>
          <div class="step" #stepEl>
            <div class="step-number">2</div>
            <div class="step-body">
              <h3>Bou met jou bydrae</h3>
              <p>Bou 'n vierkante meter teen R 500. Elke meter bring ons nader aan 'n geteerde pad.</p>
            </div>
          </div>
          <div class="step" #stepEl>
            <div class="step-number">3</div>
            <div class="step-body">
              <h3>Volg die vordering</h3>
              <p>Kyk hoe jou blok vanuit 'n grondpad tot teerpad verander. Sien die impak wat jy maak.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <div class="cta-card">
          <img src="stadsboufonds-logo-white.png" alt="" class="cta-logo" aria-hidden="true" />
          <h2>Bou saam aan die stad</h2>
          <p>Die Oewer verdien 'n teerpad — dis die hart van ons toeriste gemeenskap. Jy maak dit saam met ons moontlik.</p>
          <a routerLink="/kaart" class="btn btn-primary btn-lg">
            Begin <span class="bou-cta">BOU</span>!
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </section>

    <footer class="site-footer">
      <div class="container footer-inner">
        <img src="stadsboufonds-logo-full.png" alt="Orania Stadsboufonds" class="footer-logo" />
        <p class="footer-tagline">van grondpad tot teerpad</p>
        <p class="footer-copy">Diamant Laan &middot; Orania Stadsboufonds</p>
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
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
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

  brackets = [
    { id: 1, top: 4, right: 6, size: 44, orange: true, rotate: 0 },
    { id: 2, top: 4, right: 22, size: 40, orange: false, rotate: 0 },
    { id: 3, top: 4, right: 38, size: 44, orange: true, rotate: 0 },
    { id: 4, top: 28, right: 6, size: 40, orange: false, rotate: 0 },
    { id: 5, top: 28, right: 22, size: 44, orange: true, rotate: 0 },
    { id: 6, top: 28, right: 38, size: 40, orange: false, rotate: 0 },
    { id: 7, top: 52, right: 14, size: 36, orange: true, rotate: 0 },
  ];

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
