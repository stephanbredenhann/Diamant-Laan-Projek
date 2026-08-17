import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, filter, of, switchMap, takeUntil, tap } from 'rxjs';
import { RoadService } from '../../services/road.service';
import { SettingsService } from '../../services/settings.service';
import { randBedrag } from '../../utils/afrikaans.util';
import { IconComponent, IconName } from '../shared/icon/icon.component';
import { FotoSliderComponent } from '../shared/foto-slider/foto-slider.component';
import { CertificateCardComponent, CertificateSquare } from '../shared/certificate-card/certificate-card.component';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, FotoSliderComponent, CertificateCardComponent, TPipe],
  template: `
    <section class="hero">
      <img src="oewerpad-03.jpg" [alt]="'Oewerpad, grondpad wat teerwerk nodig het' | t" class="hero-img" />
      <div class="hero-scrim" aria-hidden="true"></div>
      <div class="container hero-content">
        <p class="eyebrow hero-eyebrow">{{ 'Van grondpad tot teerpad tot stad tot Vryheid!' | t }}</p>
        <h1 class="display hero-title">
          {{ 'Bou saam aan Orania. Borg ’n' | t }} <span class="accent">m²</span> {{ 'van die Oewerpad.' | t }}
        </h1>
        <p class="hero-sub">
          {{ 'Elke blokkie m² wat jy borg help om nuwe moontlikhede vir Orania oop te sluit. Kies die blokkie wat jy wil borg, ontvang jou Stadsbouersertifikaat en word deel van die bouwerk wat Orania na die volgende vlak neem.' | t }}
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
          <li>{{ 'Stadsbouersertifikaat' | t }}</li>
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
      <div class="why-grid">
        <div>
          <p class="eyebrow">{{ 'Waarom hierdie projek?' | t }}</p>
          <h2 class="display section-title">{{ 'Nie net ’n donasie nie. ’n Belegging in ’n Afrikanertoekoms.' | t }}</h2>
          <p class="lead">
            {{ 'Die teer van die Oewerpad (Diamantlaan) is ’n belangrike infrastruktuurprojek wat nuwe moontlikhede vir Orania se toerismebedryf en verdere ontwikkeling gaan ontsluit. As ’n selfstandige Afrikanergemeenskap ontvang Orania geen staatsubsidies vir infrastruktuurontwikkeling nie. Ons bou daarom self die infrastruktuur wat ons gemeenskap nodig het: m² vir m².' | t }}
          </p>
          <p class="lead">
            {{ 'Deur ’n m² van die Oewerpad te borg, kan jy self deel word van hierdie ontwikkeling en ’n tasbare bydrae tot Orania se groei lewer.' | t }}
          </p>
          <div class="feature-pair">
            <article>
              <h3>{{ 'Sigbare vordering' | t }}</h3>
              <p>{{ 'Deur groot projekte in kleiner segmente te verdeel, kan ons ons vordering stap vir stap sien. Só werk dit ook met hierdie pad: jy kan presies sien waar jou m² ’n verskil maak en deel word van die sukses.' | t }}</p>
            </article>
            <article>
              <h3>{{ 'Duidelike doelwit' | t }}</h3>
              <p>{{ 'Ons bou self aan ’n toekoms vir Afrikaners.' | t }}</p>
            </article>
          </div>
          <a routerLink="/projek" class="text-link">{{ 'Lees die volledige projekplan →' | t }}</a>
        </div>
        <div class="why-media">
          <app-foto-slider />
        </div>
      </div>
    </section>

    <section class="section chalk" id="hoe-dit-werk">
      <div class="container-wide">
        <p class="eyebrow">{{ 'Vier eenvoudige stappe' | t }}</p>
        <h2 class="display section-title">{{ 'Verstaan elke stap.' | t }}</h2>
        <p class="lead narrow">{{ 'Dit was nog nooit so maklik om saam te bou nie.' | t }}</p>

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
          <h2 class="display section-title">{{ 'Jou naam. Jou blokkie. Jou bydrae, sigbaar vir die toekoms.' | t }}</h2>
          <p class="lead">
            {{ 'Elke borg ontvang ’n Stadsbouersertifikaat as erkenning vir sy of haar bydrae. Die sertifikaat dra jou naam en die unieke nommers van die blokkies wat jy geborg het. Met nog vele projekte op die horison, kan hierdie sertifikate mettertyd waardevolle versamelstukke word.' | t }}
          </p>
        </div>
        <div class="cert-preview">
          <app-certificate-card
            ownerName="Klein Reus"
            [squares]="voorbeeldSertifikaat"
            [viewOnly]="true" />
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <p class="eyebrow cta-eyebrow">{{ 'Jou volgende stap' | t }}</p>
          <h2 class="display">{{ 'Raak nou betrokke!' | t }}</h2>
          <p>{{ 'Ontvang erkenning vir elke m² wat jy borg. Handel die proses binne minute af!' | t }}</p>
        </div>
        <a routerLink="/bou" class="btn btn-primary cta-btn">{{ 'Borg jou m²' | t }}</a>
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
      font-size: clamp(3.75rem, 10vw, 6.5rem);
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
    .hero-cta { width: auto; }
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
      max-width: 1480px;
      margin: 0 auto;
      padding: 0 1.5rem;
      display: grid;
      grid-template-columns: minmax(18rem, 28rem) minmax(0, 1fr);
      gap: 2.25rem;
      align-items: center;
    }
    .why-media { min-width: 0; }
    .feature-pair {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .feature-pair h3 {
      font-family: var(--font-display);
      font-size: 1.35rem;
      margin-bottom: 0.35rem;
    }
    .feature-pair p { color: var(--text-muted); font-size: 1rem; }

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
      min-width: 0;
    }

    /* Same band as /projek, /vordering and /vrae: one action strip everywhere. */
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
    .cta-band .display {
      color: #fff;
      font-size: clamp(2rem, 5vw, 3.25rem);
      max-width: 16ch;
      margin: 0.5rem 0 0.75rem;
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
  /** The whole road is saleable; 4000 is only a fallback until /stats answers. */
  totalSquares = 4000;

  readonly randBedrag = randBedrag;

  /** Sample sheet on the tuisblad so the recognition section shows the real artwork. */
  readonly voorbeeldSertifikaat: CertificateSquare[] = [
    { id: 68, purchaseDate: '2026-08-17' },
  ];

  /** Rand goal follows the square count, so R500/m² stays the single source. */
  get randDoel(): number {
    return this.totalSquares * 500;
  }

  readonly steps: { number: string; icon: IconName; title: string; body: string }[] = [
    {
      number: '01',
      icon: 'ruler',
      title: 'Hoeveelheid',
      body: 'Besluit hoeveel m² jy wil borg.',
    },
    {
      number: '02',
      icon: 'map-pin',
      title: 'Kies jou blokkie',
      body: 'Kies self watter blokkie m² jy wil borg, of laat ons ’n blokkie namens jou kies.',
    },
    {
      number: '03',
      icon: 'shield',
      title: 'Betaal',
      body: 'Voltooi jou borgskap deur veilig en maklik aanlyn te betaal.',
    },
    {
      number: '04',
      icon: 'award',
      title: 'Erkenning',
      body: 'Ontvang jou Stadsbouersertifikaat en kies, indien jy wil, om die projek te volg en jou bydrae op sosiale media te deel.',
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
