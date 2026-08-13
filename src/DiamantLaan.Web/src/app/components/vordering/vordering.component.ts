import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, filter, of, switchMap, takeUntil, tap } from 'rxjs';
import { RoadService, RoadStats } from '../../services/road.service';
import { SettingsService } from '../../services/settings.service';
import { randBedrag } from '../../utils/afrikaans.util';
import { IconComponent, IconName } from '../shared/icon/icon.component';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-vordering',
  standalone: true,
  imports: [RouterLink, IconComponent, TPipe],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">{{ 'Vordering · Oewerpad-teerprojek' | t }}</p>
        <h1 class="display page-hero-title">{{ 'Hoe ver is ons?' | t }}</h1>
        <p class="page-hero-body">
          {{ 'Hier wys ons twee dinge: hoeveel geld reeds ingesamel is, en hoeveel van die pad werklik al geteer is. Die syfers kom regstreeks uit die stelsel.' | t }}
        </p>
      </div>
    </section>

    @if (showStatsSection) {
      <section class="stats-band" [attr.aria-label]="'Finansiële vordering' | t">
        <div class="container stats-grid">
          @if (showTotalRaised) {
            <div class="stat-cell">
              <span class="display stat-value">{{ randBedrag(totalRaised) }}</span>
              <span class="eyebrow stat-label">{{ 'Ingesamel' | t }}</span>
            </div>
          }
          <div class="stat-cell">
            <span class="display stat-value">{{ fundedSquares }}</span>
            <span class="eyebrow stat-label">{{ 'm² geborg' | t }}</span>
          </div>
          <div class="stat-cell">
            <span class="display stat-value">{{ klaarGeteer }}</span>
            <span class="eyebrow stat-label">{{ 'm² klaar geteer' | t }}</span>
          </div>
        </div>
        <div class="progress-track" role="progressbar" [attr.aria-valuenow]="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" [style.width.%]="progress"></div>
        </div>
      </section>
    }

    <section class="section chalk">
      <div class="container">
        <p class="eyebrow">{{ 'Waar ons staan' | t }}</p>
        <h2 class="display section-title">{{ 'Geld ingesamel, en pad geteer.' | t }}</h2>
        <p class="lead">
          {{ 'Die twee gaan nie op dieselfde tempo nie. Geld word eers ingesamel; die teerwerk volg in fases sodra ’n stuk pad ten volle geborg is.' | t }}
        </p>

        <div class="twin-grid">
          <article class="surface-card twin-card">
            <div class="twin-head">
              <p class="eyebrow">{{ 'Geborg' | t }}</p>
              <span class="display twin-accent">{{ fundedPercent }}%</span>
            </div>
            <div class="bar-track" role="progressbar" [attr.aria-valuenow]="fundedPercent" aria-valuemin="0" aria-valuemax="100">
              <div class="bar-fill" [style.width.%]="fundedPercent"></div>
            </div>
            <div class="twin-meta">
              <span>{{ hasBreakdown ? fundedSquares + ' ' + ('van' | t) + ' ' + saleableSquares + ' m²' : ('Nog nie beskikbaar nie' | t) }}</span>
              @if (showTotalRaised) {
                <span>{{ randBedrag(totalRaised) }}</span>
              }
            </div>
          </article>

          <article class="surface-card twin-card">
            <div class="twin-head">
              <p class="eyebrow">{{ 'Geteer' | t }}</p>
              <span class="display twin-accent">{{ progress }}%</span>
            </div>
            <div class="bar-track" role="progressbar" [attr.aria-valuenow]="progress" aria-valuemin="0" aria-valuemax="100">
              <div class="bar-fill bar-fill--done" [style.width.%]="progress"></div>
            </div>
            <div class="twin-meta">
              <span>{{ hasBreakdown ? klaarGeteer + ' ' + ('van' | t) + ' ' + totalSquares + ' m²' : ('Nog nie beskikbaar nie' | t) }}</span>
              <span>{{ (workStarted ? 'Werk aan die gang' : 'Werk nog nie begin nie') | t }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="section white">
      <div class="container">
        <p class="eyebrow">{{ 'Die pad self' | t }}</p>
        <h2 class="display section-title">{{ 'Elke vierkante meter se stand.' | t }}</h2>
        <p class="lead">
          {{ 'Elke blokkie op die kaart is in een van vier fases. Dit is die werklike telling, nou net soos dit in die stelsel staan.' | t }}
        </p>

        <div class="phase-cards">
          @for (phase of phaseCards(); track phase.title) {
            <article class="surface-card phase-card" [class.is-active]="phase.count > 0">
              <span class="phase-icon"><app-icon [name]="phase.icon" [size]="26" /></span>
              <div class="phase-body">
                <h3>{{ phase.title | t }}</h3>
                <p>{{ phase.body | t }}</p>
              </div>
              <div class="phase-count">
                <span class="display phase-number">{{ phase.count }}</span>
                <span class="eyebrow">m²</span>
              </div>
            </article>
          }
        </div>

        <p class="phase-note">
          {{ 'Sodra werk op jou eie blokkies begin, sien jy dit onder' | t }}
          <a routerLink="/my-blokke">{{ 'My blokke' | t }}</a>{{ ', met foto’s van die werk waar dit beskikbaar is.' | t }}
        </p>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <p class="eyebrow cta-eyebrow">{{ 'Jou volgende stap' | t }}</p>
          <h2 class="display">{{ 'Help ons die volgende stuk teer.' | t }}</h2>
          <p>{{ 'Begin met 1 m² vir R500. Ons kan jou blokkie outomaties kies, of jy kan self die kaart oopmaak.' | t }}</p>
        </div>
        <a routerLink="/bou" class="btn btn-primary cta-btn">{{ 'Bou 1 m² vir R500' | t }}</a>
      </div>
    </section>
  `,
  styles: [`
    .page-hero {
      position: relative;
      min-height: 28rem;
      display: flex;
      align-items: flex-end;
      background: var(--tar);
      color: #fff;
      overflow: hidden;
    }
    .page-hero-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.42;
    }
    .page-hero-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(25, 18, 14, 0.92) 0%, rgba(25, 18, 14, 0.72) 55%, rgba(25, 18, 14, 0.35) 100%);
    }
    .page-hero-content {
      position: relative;
      z-index: 1;
      padding: 5rem 1.5rem 4rem;
      max-width: 52rem;
    }
    .page-hero-eyebrow { color: var(--action); margin-bottom: 1rem; }
    .page-hero-title {
      font-size: clamp(2.5rem, 6vw, 4.75rem);
      margin: 0 0 1.25rem;
    }
    .page-hero-body {
      font-size: var(--fs-lg);
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.78);
      max-width: 40rem;
      margin: 0;
    }

    .stats-band {
      background: var(--surface);
      border-bottom: 1px solid rgba(26, 26, 26, 0.1);
    }
    .stats-grid {
      display: grid;
      gap: 1px;
      background: rgba(26, 26, 26, 0.1);
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) {
      .stats-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .stat-cell {
      background: var(--surface);
      text-align: center;
      padding: 2rem 1.25rem;
    }
    .stat-value {
      display: block;
      font-size: clamp(2rem, 4vw, 2.75rem);
      color: var(--ink);
      margin-bottom: 0.5rem;
    }
    .stat-label {
      color: var(--text-muted);
      display: block;
    }
    .progress-track {
      height: 0.65rem;
      background: var(--surface-alt);
    }
    .progress-fill {
      height: 100%;
      min-width: 0.25rem;
      background: var(--action);
      transition: width 0.4s ease;
    }

    .section { padding: 4.5rem 0; }
    .chalk { background: var(--bg-chalk); }
    .white { background: var(--surface); }

    .section-title {
      font-size: clamp(2rem, 4vw, 3.25rem);
      margin: 0.75rem 0 1rem;
      color: var(--ink);
    }
    .lead {
      font-size: var(--fs-lg);
      color: var(--text-muted);
      line-height: 1.65;
      max-width: 42rem;
      margin: 0 0 2.5rem;
    }

    .twin-grid {
      display: grid;
      gap: 1.25rem;
    }
    @media (min-width: 860px) {
      .twin-grid { grid-template-columns: 1fr 1fr; }
    }
    .twin-card { padding: 2rem; }
    .twin-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .twin-accent {
      font-size: 2.5rem;
      color: var(--action);
      line-height: 1;
    }
    .twin-muted {
      font-size: clamp(1.5rem, 3vw, 2.25rem);
      color: color-mix(in srgb, var(--ink) 30%, transparent);
      line-height: 1;
      text-align: right;
    }
    .bar-track {
      height: 0.85rem;
      background: var(--surface-alt);
    }
    .bar-fill {
      height: 100%;
      min-width: 0.25rem;
      background: var(--action);
    }
    .twin-meta {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1rem;
      font-size: var(--fs-sm);
      color: var(--text-muted);
    }
    .phase-dots {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .dot {
      height: 0.85rem;
      background: var(--surface-alt);
    }
    .dot.active { background: var(--route-blue); }
    .phases-labels {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .phase-cards {
      display: grid;
      gap: 1rem;
    }
    .phase-card {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1.25rem;
      align-items: center;
      padding: 1.5rem;
      opacity: 0.72;
    }
    /* A phase holding no ground yet is dimmed, so the live ones read first. */
    .phase-card.is-active { opacity: 1; }
    .phase-icon {
      display: inline-grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      flex-shrink: 0;
      border: 2px solid var(--border-soft);
      color: var(--text-muted);
    }
    .phase-card.is-active .phase-icon {
      border-color: var(--action);
      color: var(--action-strong);
    }
    .phase-card h3 {
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      font-weight: 700;
      margin: 0 0 0.2rem;
      color: var(--ink);
    }
    .phase-card p {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .phase-count {
      text-align: right;
      line-height: 1;
    }
    .phase-number {
      display: block;
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--ink);
    }
    .phase-count .eyebrow { color: var(--text-muted); }
    .phase-note {
      margin-top: 2rem;
      color: var(--text-muted);
      max-width: 44rem;
    }
    .bar-fill--done { background: var(--done); }
    @media (max-width: 640px) {
      .phase-card {
        grid-template-columns: auto 1fr;
        row-gap: 0.75rem;
      }
      .phase-count { grid-column: 2; text-align: left; }
    }

    .cta-inner {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      align-items: flex-start;
    }
    @media (min-width: 900px) {
      .cta-inner {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .cta-eyebrow { color: rgba(255, 255, 255, 0.7); }
    .cta-band h2 { margin: 0.5rem 0 0.75rem; }
    .cta-band p { margin: 0; max-width: 36rem; }
    .cta-btn {
      background: var(--tar);
      color: #fff;
      flex-shrink: 0;
      min-width: 14rem;
      justify-content: center;
    }
    .cta-btn:hover {
      background: #2a2018;
      color: #fff;
    }
  `],
})
export class VorderingComponent implements OnInit, OnDestroy {
  private road = inject(RoadService);
  private settingsService = inject(SettingsService);
  private destroy$ = new Subject<void>();

  showStatsSection = true;
  showTotalRaised = true;

  /** Percentage of the whole road that is fully tarred. */
  progress = 0;
  totalRaised = 0;
  totalSquares = 0;
  saleableSquares = 0;
  fundedSquares = 0;
  klaarGeteer = 0;
  private voorberei = 0;
  private besigOmTeTeer = 0;
  private nogNieBeginNie = 0;

  readonly randBedrag = randBedrag;

  /** True once the API has returned the per-phase payload this page needs. */
  get hasBreakdown(): boolean {
    return this.saleableSquares > 0 && this.totalSquares > 0;
  }

  /** Share of the saleable road that has been paid for. */
  get fundedPercent(): number {
    if (!this.saleableSquares) return 0;
    return Math.round((this.fundedSquares / this.saleableSquares) * 1000) / 10;
  }

  /** True once anything has moved past "not started". */
  get workStarted(): boolean {
    return this.voorberei + this.besigOmTeTeer + this.klaarGeteer > 0;
  }

  phaseCards(): { title: string; body: string; count: number; icon: IconName }[] {
    return [
      {
        title: 'Nog nie begin nie',
        body: 'Grondpad soos dit vandag is. Nog geen werk op hierdie stuk nie.',
        count: this.nogNieBeginNie,
        icon: 'road',
      },
      {
        title: 'Voorberei',
        body: 'Die grondwerk en dreinering vir hierdie stuk is aan die gang of klaar.',
        count: this.voorberei,
        icon: 'calendar',
      },
      {
        title: 'Besig om te teer',
        body: 'Die teerwerk is tans op hierdie stuk pad aan die gang.',
        count: this.besigOmTeTeer,
        icon: 'camera',
      },
      {
        title: 'Klaar geteer',
        body: 'Klaar. Hierdie vierkante meter is geteer en in gebruik.',
        count: this.klaarGeteer,
        icon: 'check-circle',
      },
    ];
  }

  ngOnInit() {
    this.settingsService.getHomeStatsSettings()
      .pipe(
        catchError(() => {
          console.error('Kon nie die tuisbladinstellings laai nie.');
          return of({ showStatsSection: true, showTotalRaised: true });
        }),
        tap(settings => {
          this.showStatsSection = settings.showStatsSection;
          this.showTotalRaised = settings.showTotalRaised;
        }),
        filter(settings => settings.showStatsSection),
        switchMap(() => this.road.getStats().pipe(
          catchError(() => {
            console.error('Kon nie die padstatistieke laai nie.');
            return of(null);
          })
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(stats => this.applyStats(stats));
  }

  private applyStats(stats: RoadStats | null) {
    if (!stats) return;
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    this.progress = n(stats.progress);
    this.totalRaised = n(stats.totalRaised);
    this.totalSquares = n(stats.totalSquares);
    this.saleableSquares = n(stats.saleableSquares);
    this.fundedSquares = n(stats.fundedSquares);
    const phases = stats.phases ?? ({} as RoadStats['phases']);
    this.nogNieBeginNie = n(phases.nogNieBeginNie);
    this.voorberei = n(phases.voorberei);
    this.besigOmTeTeer = n(phases.besigOmTeTeer);
    this.klaarGeteer = n(phases.klaarGeteer);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
