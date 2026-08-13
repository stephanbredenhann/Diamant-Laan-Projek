import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, filter, of, switchMap, takeUntil, tap } from 'rxjs';
import { RoadService } from '../../services/road.service';
import { SettingsService } from '../../services/settings.service';
import { randBedrag } from '../../utils/afrikaans.util';
import { IconComponent, IconName } from '../shared/icon/icon.component';
import { FotoSliderComponent } from '../shared/foto-slider/foto-slider.component';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, FotoSliderComponent, TPipe],
  template: `
    <section class="hero">
      <img src="oewerpad-hero.jpg" [alt]="'Oewerpad wat van grondpad na teerpad verander' | t" class="hero-img" />
      <div class="hero-scrim" aria-hidden="true"></div>
      <div class="container hero-content">
        <p class="eyebrow hero-eyebrow">{{ 'Orania-Teerprojek' | t }}</p>
        <h1 class="display hero-title">
          {{ 'Bou die volgende' | t }} <span class="accent">m²</span> {{ 'van die Oewerpad.' | t }}
        </h1>
        <p class="hero-sub">
          {{ 'Elke m² wat geborg word, sluit vir Orania nuwe moontlikhede oop. Kies die blokkie wat jy wil borg, ontvang jou Stadsbouersertifikaat en dra Orania na die volgende vlak.' | t }}
        </p>
        <div class="hero-actions">
          <a routerLink="/bou" class="btn btn-primary btn-xl hero-cta">
            {{ 'Borg jou m²' | t }}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
        <ul class="reassurance">
          <li>{{ 'Geen registrasie' | t }}</li>
          <li>{{ 'Veilige betaling' | t }}</li>
          <li>{{ 'Bydraersertifikaat' | t }}</li>
          <li>{{ 'Ontwikkel Orania' | t }}</li>
        </ul>
      </div>

      @if (showStatsSection) {
        <div class="hero-stat-float" id="stats-section">
          <div class="stat-dark">
            <strong class="tabular">{{ fundedMeters }}<span class="stat-doel">/{{ totalSquares }} m²</span></strong>
            <span>{{ 'Reeds geborg' | t }}</span>
          </div>
          @if (showTotalRaised) {
            <div class="stat-orange">
              <strong class="tabular">{{ randBedrag(totalRaised) }}<span class="stat-doel">/{{ randBedrag(randDoel) }}</span></strong>
              <span>{{ 'Ingesamel' | t }}</span>
            </div>
          }
        </div>
      }

      <button type="button" class="scroll-cue" (click)="rolAf()" [attr.aria-label]="'Rol af vir meer' | t">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </section>

    <section class="section" id="waarom">
      <div class="container-wide why-grid">
        <div>
          <p class="eyebrow">{{ 'Waarom hierdie projek?' | t }}</p>
          <h2 class="display section-title">{{ 'Nie net ’n donasie nie. ’n Belegging in ’n Afrikanertoekoms.' | t }}</h2>
          <p class="lead">
            {{ 'Die Oewerpad (Diamantlaan) se teerwerk is ’n groot infrastruktuurprojek. Orania is ’n privaat Afrikanergemeenskap wat geen staatstoelae ontvang nie. Dit beteken dat elke sentimeter wat hier ontwikkel word, self gedoen word. Deur hierdie reuse projek in m² op te deel, kan elke bydraer presies sien waar sy of haar bydrae by die groter prentjie inpas.' | t }}
          </p>
          <div class="feature-pair">
            <article>
              <h3>{{ 'Duidelike doelwit' | t }}</h3>
              <p>{{ 'Ons bou ’n toekoms vir Afrikaners, en ons doen dit self!' | t }}</p>
            </article>
            <article>
              <h3>{{ 'Sigbare vordering' | t }}</h3>
              <p>{{ 'Deur reuse projekte in kleiner segmente te verdeel, kan ons sien presies waar ons vordering maak. Só ook met hierdie pad, waar jy presies kan sien waar jou m² ’n verskil maak.' | t }}</p>
            </article>
          </div>
          <a routerLink="/projek" class="text-link">{{ 'Lees die volledige projekplan →' | t }}</a>
        </div>
        <div class="why-media">
          <app-foto-slider />
          <div class="meter-badge">
            <span class="display">1 m²</span>
            <small>R500</small>
          </div>
        </div>
      </div>
    </section>

    <section class="section chalk" id="hoe-dit-werk">
      <div class="container-wide">
        <p class="eyebrow">{{ 'Vier eenvoudige stappe' | t }}</p>
        <h2 class="display section-title">{{ 'Verstaan elke stap.' | t }}</h2>
        <p class="lead narrow">{{ 'Vier eenvoudige stappe om jou bydrae te lewer.' | t }}</p>

        <div class="steps">
          @for (step of steps; track step.number; let last = $last) {
            <article class="surface-card step-card">
              <div class="step-icon">
                <app-icon [name]="step.icon" [size]="34" />
                <span class="step-badge" aria-hidden="true">{{ step.number }}</span>
              </div>
              <div class="step-body">
                <h3>{{ step.title | t }}</h3>
                <p>{{ step.body | t }}</p>
              </div>
              <span class="display step-ghost" aria-hidden="true">{{ step.number }}</span>
            </article>
            @if (!last) {
              <div class="step-connector" aria-hidden="true">↓</div>
            }
          }
        </div>
      </div>
    </section>

    <section class="section chalk">
      <div class="container-wide recog-grid">
        <div>
          <p class="eyebrow">{{ 'Erkenning' | t }}</p>
          <h2 class="display section-title">{{ 'Jou naam. Jou blokkie. Jou bydrae vir ewig sigbaar.' | t }}</h2>
          <p class="lead">
            {{ 'Elkeen wat bydra ontvang erkenning in die vorm van ’n Stadsbouersertifikaat. Jou sertifikaat vertoon jou naam en die unieke nommers van die blokkies wat jy geborg het. Met nog baie projekte op die horison, gaan hierdie sertifikate eindelik versamelstukke wees.' | t }}
          </p>
        </div>
        <div class="cert-preview surface-card">
          <img src="stadsboufonds-logo-orange.png" alt="" width="64" height="64" />
          <p class="eyebrow">{{ 'Erkenning as' | t }}</p>
          <h3 class="display">STADSBOUER</h3>
          <p class="cert-name">{{ 'JOU NAAM' | t }}</p>
          <p>{{ 'Vir die finansiering van 1 m² van die Oewerpad-teerprojek.' | t }}</p>
          <span class="work-stamp stamp">1 m²</span>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <p class="eyebrow" style="color: rgba(255,255,255,0.65)">{{ 'Jou volgende stap' | t }}</p>
          <h2 class="display">{{ 'Bou die volgende m² saam met ons.' | t }}</h2>
          <p>{{ 'Kies jou spesiale nommer voordat dit te laat is!' | t }}</p>
        </div>
        <a routerLink="/bou" class="btn btn-on-orange">
          {{ 'Borg jou m²' | t }}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .hero {
      position: relative;
      min-height: min(92vh, 820px);
      display: flex;
      align-items: flex-end;
      padding: 4rem 0 5rem;
      overflow: hidden;
      background: var(--tar);
    }
    .hero-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.55;
    }
    .hero-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(25,18,14,0.92) 0%, rgba(25,18,14,0.55) 55%, rgba(25,18,14,0.25) 100%);
    }
    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 40rem;
      color: #fff;
      padding-bottom: 2rem;
    }
    .hero-eyebrow { color: #9ec0e0; }
    .hero-title {
      color: #fff;
      font-size: clamp(3rem, 8vw, 5.5rem);
      margin: 0.75rem 0 1rem;
    }
    .hero-title .accent { color: var(--action); }
    .hero-sub {
      font-size: 1.2rem;
      line-height: 1.6;
      color: rgba(255,255,255,0.82);
      margin-bottom: 1.75rem;
    }
    .hero-sub strong { color: #fff; }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .hero-cta { width: auto; box-shadow: var(--shadow-cta); }
    .reassurance {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 1.5rem;
      list-style: none;
      color: rgba(255,255,255,0.7);
      font-size: 0.95rem;
      font-weight: 600;
    }
    .reassurance li::before {
      content: '✓ ';
      color: var(--action);
      font-weight: 800;
    }

    .hero-stat-float {
      position: absolute;
      right: 1.5rem;
      bottom: 1.5rem;
      z-index: 2;
      display: flex;
      box-shadow: var(--shadow-lg);
    }
    .stat-dark, .stat-orange {
      padding: 1.1rem 1.4rem;
      min-width: 9rem;
    }
    .stat-dark { background: var(--tar); color: #fff; }
    .stat-orange { background: var(--action-strong); color: #fff; }
    .stat-dark strong, .stat-orange strong {
      display: block;
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
    }
    .stat-dark strong span.stat-doel, .stat-orange strong span.stat-doel {
      display: inline;
      font-size: 1.1rem;
      margin: 0;
      opacity: 0.7;
      text-transform: none;
      letter-spacing: 0;
    }
    .stat-dark span, .stat-orange span {
      display: block;
      margin-top: 0.35rem;
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.75;
    }

    .scroll-cue {
      position: absolute;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      background: rgba(0, 0, 0, 0.35);
      border: 2px solid rgba(255, 255, 255, 0.6);
      border-radius: 999px;
      color: #fff;
      width: 3.25rem;
      height: 3.25rem;
      min-height: 0;
      padding: 0;
      animation: cue-bob 1.8s ease-in-out infinite;
    }
    .scroll-cue:hover { background: rgba(0, 0, 0, 0.55); border-color: #fff; }
    @keyframes cue-bob {
      0%, 100% { transform: translate(-50%, 0); }
      50%      { transform: translate(-50%, 8px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .scroll-cue { animation: none; }
    }

    .section { padding: 5rem 0; }
    .section.chalk { background: var(--bg-chalk); }
    .section-title {
      font-size: clamp(2.25rem, 5vw, 3.75rem);
      margin: 0.75rem 0 1rem;
      max-width: 18ch;
    }
    .lead {
      font-size: 1.15rem;
      color: var(--text-muted);
      max-width: 40rem;
      margin-bottom: 1.5rem;
    }
    .lead.narrow { max-width: 36rem; }
    .text-link {
      font-weight: 700;
      color: var(--route-blue);
      text-decoration: none;
    }
    .text-link:hover { text-decoration: underline; }

    .why-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 3rem;
      align-items: center;
    }
    .feature-pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .feature-pair h3 {
      font-family: var(--font-display);
      font-size: 1.35rem;
      margin-bottom: 0.35rem;
    }
    .feature-pair p { color: var(--text-muted); font-size: 1rem; }
    .why-media { position: relative; }
    .meter-badge {
      position: absolute;
      left: 1rem;
      bottom: 1rem;
      z-index: 1;
      background: #fff;
      padding: 0.85rem 1rem;
      box-shadow: var(--shadow);
    }
    .meter-badge .display {
      display: block;
      font-size: 2.5rem;
      color: var(--action);
      line-height: 1;
    }
    .meter-badge small {
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--text-muted);
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-width: 52rem;
      margin: 2rem auto 0;
    }
    .step-card {
      display: grid;
      gap: 1.25rem;
      align-items: center;
      padding: 1.75rem;
    }
    @media (min-width: 700px) {
      .step-card {
        grid-template-columns: 5.5rem 1fr auto;
        padding: 2rem;
      }
    }
    .step-icon {
      position: relative;
      width: 5rem;
      height: 5rem;
      display: grid;
      place-items: center;
      border: 2px solid var(--action);
      background: var(--surface);
      color: var(--action-strong);
    }
    .step-badge {
      position: absolute;
      top: -0.65rem;
      right: -0.65rem;
      background: var(--tar);
      color: #fff;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.2rem 0.55rem;
    }
    .step-body h3 {
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--ink);
    }
    .step-body p {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.55;
      max-width: 36rem;
    }
    .step-ghost {
      font-size: 3.5rem;
      color: color-mix(in srgb, var(--action) 18%, transparent);
      line-height: 1;
      display: none;
    }
    @media (min-width: 700px) {
      .step-ghost { display: block; }
    }
    .step-connector {
      text-align: center;
      color: var(--action);
      font-size: 1.25rem;
      font-weight: 700;
      padding: 0.35rem 0;
    }

    .recog-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      align-items: center;
    }
    .cert-preview {
      text-align: center;
      padding: 2.5rem 2rem;
    }
    .cert-preview .display {
      font-size: 3rem;
      margin: 0.5rem 0;
    }
    .cert-name {
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: 0.08em;
      margin-bottom: 0.75rem;
    }
    .stamp {
      margin-top: 1.25rem;
      padding: 0.4rem 0.75rem;
      font-size: 1.25rem;
    }

    .cta-inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 2rem;
      align-items: center;
    }
    .cta-band .display {
      color: #fff;
      font-size: clamp(2rem, 5vw, 3.25rem);
      max-width: 16ch;
      margin: 0.5rem 0 0.75rem;
    }
    .btn-on-orange {
      background: #fff;
      color: var(--action);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.2rem;
      min-height: var(--tap-large);
      padding: 1rem 1.75rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .btn-on-orange:hover {
      background: var(--bg-chalk);
      color: var(--action-hover);
    }

    @media (max-width: 960px) {
      .why-grid, .recog-grid { grid-template-columns: 1fr; }
      .hero-stat-float {
        position: static;
        margin: 1.5rem 1.5rem 0;
        width: calc(100% - 3rem);
      }
      .hero { align-items: flex-start; padding-top: 5rem; flex-direction: column; }
    }
    @media (max-width: 560px) {
      .feature-pair { grid-template-columns: 1fr; }
      .hero-stat-float { flex-direction: column; }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private road = inject(RoadService);
  private settingsService = inject(SettingsService);
  private destroy$ = new Subject<void>();

  showStatsSection = true;
  showTotalRaised = true;
  progress = 0;
  totalRaised = 0;
  fundedMeters = 0;
  /** The whole road is saleable; 4200 is only a fallback until /stats answers. */
  totalSquares = 4200;

  readonly randBedrag = randBedrag;

  /** Rand goal follows the square count, so R500/m² stays the single source. */
  get randDoel(): number {
    return this.totalSquares * 500;
  }

  readonly steps: { number: string; icon: IconName; title: string; body: string }[] = [
    {
      number: '01',
      icon: 'ruler',
      title: 'Hoeveelheid',
      body: 'Kies hoeveel m² jy wil borg.',
    },
    {
      number: '02',
      icon: 'map-pin',
      title: 'Kies jou blokkie',
      body: 'Kies presies watter blokkie m² jy wil borg, of laat ons vir jou kies.',
    },
    {
      number: '03',
      icon: 'shield',
      title: 'Betaal',
      body: 'Voltooi die transaksie deur aanlyn te betaal.',
    },
    {
      number: '04',
      icon: 'award',
      title: 'Erkenning',
      body: 'Ontvang jou sertifikaat. Opsioneel: kies om die projek aktief te volg en jou sertifikaat op sosiale media te deel.',
    },
  ];

  rolAf() {
    document.getElementById('waarom')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit() {
    this.settingsService.getHomeStatsSettings()
      .pipe(
        catchError(() => of({ showStatsSection: true, showTotalRaised: true })),
        tap(settings => {
          this.showStatsSection = settings.showStatsSection;
          this.showTotalRaised = settings.showTotalRaised;
        }),
        filter(settings => settings.showStatsSection),
        switchMap(() => this.road.getStats().pipe(
          catchError(() => of({ progress: 0, totalRaised: 0, fundedSquares: 0, totalSquares: this.totalSquares }))
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(stats => {
        this.progress = stats.progress;
        this.totalRaised = stats.totalRaised;
        this.fundedMeters = stats.fundedSquares;
        if (stats.totalSquares) this.totalSquares = stats.totalSquares;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
