import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, filter, of, switchMap, takeUntil, tap } from 'rxjs';
import { RoadService } from '../../services/road.service';
import { SettingsService } from '../../services/settings.service';
import { randBedrag } from '../../utils/afrikaans.util';

interface AmountCard {
  meters: number | null;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <img src="diamant_laan_foto.jpg" alt="Oewerpad wat van grondpad na teerpad verander" class="hero-img" />
      <div class="hero-scrim" aria-hidden="true"></div>
      <div class="container hero-content">
        <p class="eyebrow hero-eyebrow">Oewerpad-teerprojek</p>
        <h1 class="display hero-title">
          Bou die volgende <span class="accent">meter</span> van Oewerpad.
        </h1>
        <p class="hero-sub">
          Finansier 1 m² teerpad vir <strong>R500</strong> en ontvang erkenning as ’n Stadsbouer.
          Ons kan jou blokkie kies, of jy kan self die kaart oopmaak.
        </p>
        <div class="hero-actions">
          <a routerLink="/bou" class="btn btn-primary btn-xl hero-cta">
            Bou 1 m² vir R500
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
          <a routerLink="/hoe-dit-werk" class="hero-quiet">Kyk hoe dit werk</a>
        </div>
        <ul class="reassurance">
          <li>Geen rekening nodig</li>
          <li>Veilige betaling</li>
          <li>Stadsbouer-erkenning</li>
        </ul>
      </div>

      @if (showStatsSection) {
        <div class="hero-stat-float" id="stats-section">
          <div class="stat-dark">
            <strong class="tabular">{{ fundedMeters }} m²</strong>
            <span>Reeds geborg</span>
          </div>
          @if (showTotalRaised) {
            <div class="stat-orange">
              <strong class="tabular">{{ randBedrag(totalRaised) }}</strong>
              <span>Ingesamel</span>
            </div>
          }
        </div>
      }
    </section>

    <section class="section">
      <div class="container-wide why-grid">
        <div>
          <p class="eyebrow">Waarom hierdie projek</p>
          <h2 class="display section-title">Nie net ’n donasie nie. ’n Meetbare deel van die pad.</h2>
          <p class="lead">
            Oewerpad se teerwerk is ’n groot infrastruktuurprojek. Deur die werk in vierkante meter
            op te deel, kan elke ondersteuner presies verstaan hoe sy of haar bydrae by die groter
            doel inpas.
          </p>
          <div class="feature-pair">
            <article>
              <h3>Duidelike koste</h3>
              <p>Elke volle vierkante meter word teen R500 aangebied.</p>
            </article>
            <article>
              <h3>Sigbare vordering</h3>
              <p>Volg finansiering en die werklike boufases op een plek.</p>
            </article>
          </div>
          <a routerLink="/projek" class="text-link">Lees die volledige projekplan →</a>
        </div>
        <div class="why-media">
          <img src="diamant_laan_foto.jpg" alt="’n Vierkante meter word op die padbasis afgemeet" />
          <div class="meter-badge">
            <span class="display">1 m²</span>
            <small>R500</small>
          </div>
        </div>
      </div>
    </section>

    <section class="section chalk">
      <div class="container-wide">
        <p class="eyebrow">Vier eenvoudige stappe</p>
        <h2 class="display section-title">Verstaan elke stap voordat jy begin.</h2>
        <p class="lead narrow">
          Die vloei vra eers hoeveel jy wil bydra. Die kaart verskyn net wanneer jy self ’n presiese plek wil kies.
        </p>
        <div class="steps-grid">
          @for (step of steps; track step.n) {
            <article class="step-card">
              <span class="step-n">{{ step.n }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.body }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container-wide">
        <p class="eyebrow">Kies jou bydrae</p>
        <h2 class="display section-title">Begin by die bedrag, nie by die kaart nie.</h2>
        <p class="lead narrow">
          Elke opsie vertel jou onmiddellik hoeveel vierkante meter jy help finansier.
        </p>
        <div class="amount-grid">
          @for (card of amountCards; track card.title) {
            <a
              class="amount-card"
              [routerLink]="['/bou']"
              [queryParams]="card.meters ? { aantal: card.meters } : {}"
            >
              @if (card.meters) {
                <span class="display amount-m">{{ card.meters }} m²</span>
              } @else {
                <span class="amount-eie">Eie keuse</span>
              }
              <strong>{{ card.title }}</strong>
              <span>{{ card.subtitle }}</span>
              <em>{{ card.meters ? randBedrag(card.meters * 500) : 'R500 × m²' }}</em>
            </a>
          }
        </div>
      </div>
    </section>

    <section class="section chalk">
      <div class="container-wide recog-grid">
        <div>
          <p class="eyebrow">Erkenning</p>
          <h2 class="display section-title">Jou naam. Jou blokkie. Jou deel aan die stad.</h2>
          <p class="lead">
            Die Stadsbouer-belofte word sigbaar vóór betaling. Ondersteuners kan kies hoe hul
            erkenning vertoon moet word.
          </p>
          <a routerLink="/hoe-dit-werk" class="text-link">Sien alle erkenningsopsies →</a>
        </div>
        <div class="cert-preview surface-card">
          <img src="stadsboufonds-logo-orange.png" alt="" width="64" height="64" />
          <p class="eyebrow">Erkenning as</p>
          <h3 class="display">STADSBOUER</h3>
          <p class="cert-name">JOU NAAM</p>
          <p>Vir die finansiering van 1 m² van die Oewerpad-teerprojek.</p>
          <span class="work-stamp stamp">1 m²</span>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <p class="eyebrow" style="color: rgba(255,255,255,0.65)">Jou volgende stap</p>
          <h2 class="display">Bou die volgende meter saam met ons.</h2>
          <p>Begin met 1 m² vir R500. Ons kan jou blokkie outomaties kies, of jy kan self die kaart oopmaak.</p>
        </div>
        <a routerLink="/bou" class="btn btn-on-orange">
          Kies jou bydrae
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
    .hero-quiet {
      color: rgba(255,255,255,0.85);
      font-weight: 700;
      text-decoration: none;
    }
    .hero-quiet:hover { color: #fff; text-decoration: underline; }
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
    .stat-dark span, .stat-orange span {
      display: block;
      margin-top: 0.35rem;
      font-family: var(--font-display);
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.75;
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
    .why-media img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      display: block;
    }
    .meter-badge {
      position: absolute;
      left: 1rem;
      bottom: 1rem;
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

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-top: 2rem;
    }
    .step-card {
      background: var(--surface);
      border: 1px solid var(--border-soft);
      padding: 1.5rem;
      min-height: 14rem;
    }
    .step-n {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--action);
      line-height: 1;
      display: block;
      margin-bottom: 1.5rem;
    }
    .step-card h3 {
      font-family: var(--font-display);
      font-size: 1.4rem;
      margin-bottom: 0.5rem;
    }
    .step-card p { color: var(--text-muted); font-size: 1rem; }

    .amount-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-top: 2rem;
    }
    .amount-card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1.5rem;
      background: var(--surface);
      border: 2px solid var(--border-soft);
      text-decoration: none;
      color: var(--ink);
      min-height: 12rem;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .amount-card:hover {
      transform: translateY(-4px);
      border-color: var(--action);
      box-shadow: var(--shadow-cta);
      text-decoration: none;
      color: var(--ink);
    }
    .amount-m {
      font-size: 3rem;
      color: var(--action);
      line-height: 0.9;
    }
    .amount-eie {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 800;
    }
    .amount-card strong {
      font-family: var(--font-display);
      font-size: 1.2rem;
    }
    .amount-card span { color: var(--text-muted); font-size: 0.95rem; }
    .amount-card em {
      margin-top: auto;
      font-style: normal;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.35rem;
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
      .steps-grid, .amount-grid { grid-template-columns: 1fr 1fr; }
      .hero-stat-float {
        position: static;
        margin: 1.5rem 1.5rem 0;
        width: calc(100% - 3rem);
      }
      .hero { align-items: flex-start; padding-top: 5rem; flex-direction: column; }
    }
    @media (max-width: 560px) {
      .steps-grid, .amount-grid, .feature-pair { grid-template-columns: 1fr; }
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

  readonly randBedrag = randBedrag;

  readonly amountCards: AmountCard[] = [
    { meters: 1, title: 'Een vierkante meter', subtitle: 'Word ’n Stadsbouer' },
    { meters: 2, title: 'Twee vierkante meter', subtitle: 'Bou saam as ’n gesin' },
    { meters: 5, title: 'Vyf vierkante meter', subtitle: 'Maak ’n groter merk' },
    { meters: null, title: 'Kies enige hoeveelheid', subtitle: 'Vir groter bydraes en ondernemings' },
  ];

  readonly steps = [
    { n: '01', title: 'Kies hoeveel jy wil bou', body: 'Kies 1, 2, 5 of enige ander aantal vierkante meter teen R500 per m².' },
    { n: '02', title: 'Laat ons kies, of kies self', body: 'Ons kan beskikbare blokkies onmiddellik toeken. Die detailkaart bly ’n opsionele keuse.' },
    { n: '03', title: 'Betaal veilig', body: 'Voltooi die bydrae as ’n gas. Geen rekening is nodig voor betaling nie.' },
    { n: '04', title: 'Word ’n Stadsbouer', body: 'Ontvang erkenning, volg die projek en sien hoe die meter waartoe jy bygedra het vorder.' },
  ];

  get fundedMeters(): number {
    return Math.round(this.totalRaised / 500);
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
          catchError(() => of({ progress: 0, totalRaised: 0 }))
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(stats => {
        this.progress = stats.progress;
        this.totalRaised = stats.totalRaised;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
