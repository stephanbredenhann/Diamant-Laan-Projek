import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../../services/purchase.service';
import { RoadService } from '../../../services/road.service';
import { Stadsbouer, StadsbouerService } from '../../../services/stadsbouer.service';
import { randBedrag } from '../../../utils/afrikaans.util';
import { TPipe } from '../../../i18n/t.pipe';
import { isEngels } from '../../../i18n/lang.service';
import { BouStepBarComponent } from '../../shared/bou-step-bar/bou-step-bar.component';

const PRYS_PER_METER = 500;
const MAKS_PER_TRANSAKSIE = 50;

/**
 * The "Koop vir 'n Stadsbouer" path off step 1: one block per road builder, bought in their name.
 * The count is not carried in from the amount screen, it is however many people get picked here,
 * and the blocks themselves are drawn automatically at checkout the way "kies vir my" does it.
 */
@Component({
  selector: 'app-bou-stadsbouers',
  standalone: true,
  imports: [RouterLink, BouStepBarComponent, TPipe],
  template: `
    <div class="container-wide bou-shell">
      <p class="eyebrow page-eyebrow">{{ 'Stap 2 van 4 · Kies jou stadsbouer' | t }}</p>
      <div class="visually-hidden" aria-live="polite">{{ aankondiging() }}</div>
      <h1 class="page-title">{{ 'Vir wie gaan jy ’n blokkie borg?' | t }}</h1>
      <p class="page-lead">{{ 'Borg ’n blokkie vir die mense wat met hul eie hande betrokke is. Lees hulle storie. Kies een persoon of meer en borg hul blokkie.' | t }}</p>

      <app-bou-step-bar [active]="2" />

      <div class="layout">
        <div class="werkarea">
          @if (laai()) {
            <p class="laai-nota">{{ 'Besig om die stadsbouers te laai...' | t }}</p>
          } @else if (laaiFout()) {
            <p class="error-alert">{{ laaiFout() | t }}</p>
          } @else if (bouers().length === 0) {
            <p class="laai-nota">{{ 'Daar is nog nie stadsbouers om te borg nie. Kyk gerus later weer.' | t }}</p>
          } @else {
            <ul class="bouers">
              @for (b of bouers(); track b.id) {
                <li>
                  <button
                    type="button"
                    class="bouer"
                    [class.gekies]="isGekies(b.id)"
                    [class.geborg]="!kiesbaar(b)"
                    [disabled]="!kiesbaar(b)"
                    [attr.aria-pressed]="kiesbaar(b) ? isGekies(b.id) : null"
                    [attr.aria-label]="etiket(b)"
                    [attr.aria-describedby]="b.about ? 'sb-oor-' + b.id : null"
                    (click)="wissel(b)"
                    (mouseenter)="plaasDetail($event)"
                    (focus)="plaasDetail($event)"
                  >
                    <span class="foto-raam">
                      @if (b.hasPhoto) {
                        <img class="foto" [src]="fotoUrl(b.id)" [alt]="b.name" loading="lazy">
                      } @else {
                        <span class="foto geen-foto" aria-hidden="true">{{ letters(b.name) }}</span>
                      }
                      @if (b.isSponsored) {
                        <span class="geborg-seel" aria-hidden="true">
                          <span class="geborg-tiek">&check;</span>
                          <span class="geborg-teks">{{ 'Reeds geborg' | t }}</span>
                        </span>
                      }
                    </span>
                    <span class="naam">{{ b.name }}</span>
                    <!-- Touch screens cannot hover, so they get the details inline instead. -->
                    <span class="inlyn">
                      @if (b.title) {
                        <span class="rol">{{ b.title }}</span>
                      }
                      @if (b.about) {
                        <span class="oor">{{ b.about }}</span>
                      }
                    </span>
                    @if (b.isPending && !b.isSponsored) {
                      <span class="merkie">{{ 'Word tans geborg' | t }}</span>
                    }
                    @if (isGekies(b.id)) {
                      <span class="tiek" aria-hidden="true">&check;</span>
                    }
                    <span class="detail" aria-hidden="true">
                      @if (b.hasPhoto) {
                        <img class="foto" [src]="fotoUrl(b.id)" alt="">
                      } @else {
                        <span class="foto geen-foto">{{ letters(b.name) }}</span>
                      }
                      <span class="naam">{{ b.name }}</span>
                      @if (b.title) {
                        <span class="rol">{{ b.title }}</span>
                      }
                      @if (b.about) {
                        <span class="oor" [id]="'sb-oor-' + b.id">{{ b.about }}</span>
                      }
                    </span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>

        <aside class="keuse-kaart">
          <p class="eyebrow">{{ 'Jou keuse' | t }}</p>
          <p class="teller" aria-live="polite">{{ gekies().length }}</p>
          <p class="teller-etiket">{{ 'stadsbouers gekies' | t }}</p>
          <p class="totaal">{{ randBedrag(gekies().length * prysPerMeter) }}</p>
          <p class="totaal-nota">R{{ prysPerMeter }} {{ 'per blokkie' | t }}</p>

          @if (boodskap(); as b) {
            <p class="waarskuwing" role="alert">{{ b | t }}</p>
          }

          @if (gekies().length > 0) {
            <ul class="gekose-bouers">
              @for (id of gekies(); track id) {
                <li>
                  <button type="button" class="gekose-bouer" (click)="verwyder(id)" [attr.aria-label]="verwyderEtiket(id)">
                    <span class="gekose-naam">{{ naamVan(id) }}</span>
                    <span class="gekose-af" aria-hidden="true">{{ 'Verwyder' | t }}</span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="leeg">{{ 'Kies ten minste een stadsbouer.' | t }}</p>
          }

          <button type="button" class="btn btn-primary btn-xl" (click)="gaanVoort()" [disabled]="!kanGaanVoort()">
            {{ (besig() ? 'Besig...' : 'Gaan voort') | t }}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>

          @if (gekies().length > 0) {
            <button type="button" class="btn btn-outline maak-skoon" (click)="maakSkoon()">
              {{ 'Maak keuses skoon' | t }}
            </button>
          }

          <a routerLink="/bou" class="btn btn-outline btn-terug">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            {{ 'Gaan terug' | t }}
          </a>
        </aside>
      </div>

      <!-- Phone only, same reasoning as the map: the count and the way onward stay in reach. -->
      <div class="voetbalk">
        <div class="voetbalk-telling">
          <span class="voetbalk-getal">{{ gekies().length }}</span>
          <span class="voetbalk-woord">{{ 'gekies' | t }}</span>
        </div>
        <button type="button" class="btn btn-primary" (click)="gaanVoort()" [disabled]="!kanGaanVoort()">
          {{ (besig() ? 'Besig...' : 'Gaan voort') | t }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: grid;
      gap: 2rem;
      grid-template-columns: 1fr 340px;
      align-items: start;
      margin-top: 1.5rem;
    }
    .werkarea { min-width: 0; }
    .laai-nota { color: var(--text-muted); font-size: var(--fs-lg); }

    .bouers {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
      gap: 1rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .bouer {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
      width: 100%;
      height: 100%;
      padding: 0.75rem;
      text-align: left;
      background: var(--surface);
      border: 2px solid var(--border-soft);
      font-family: var(--font-body);
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .bouer:hover:not(:disabled) { border-color: var(--action); }
    .foto {
      display: block;
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border: 3px solid var(--border-soft);
      margin-bottom: 0.35rem;
    }
    .inlyn { display: flex; flex-direction: column; gap: 0.4rem; }
    .detail { display: none; }

    /* Mouse users get the details in a large card over the grid; clicks pass through to select. */
    @media (hover: hover) {
      .inlyn { display: none; }
      .bouer:hover,
      .bouer:focus-visible { z-index: 30; }
      .detail {
        position: absolute;
        top: 50%;
        left: 50%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: min(19rem, 90vw);
        padding: 1rem;
        background: var(--surface);
        border: 2px solid var(--action);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transform: translate(calc(-50% + var(--skuif-x, 0px)), calc(-50% + var(--skuif-y, 0px))) scale(0.85);
        transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
      }
      .bouer:hover .detail,
      .bouer:focus-visible .detail {
        opacity: 1;
        visibility: visible;
        transform: translate(calc(-50% + var(--skuif-x, 0px)), calc(-50% + var(--skuif-y, 0px))) scale(1);
      }
      .detail .foto { height: min(15rem, 35vh); aspect-ratio: auto; }
      .detail .naam { font-size: 1.6rem; }
      .bouer.gekies .detail { background: var(--blok-gekies); border-color: var(--ink); }
    }
    @media (prefers-reduced-motion: reduce) {
      .detail { transition: none; }
    }
    .geen-foto {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-chalk);
      color: var(--text-muted);
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 800;
    }
    .naam {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.1;
      color: var(--ink);
    }
    .rol { font-size: var(--fs-base); color: var(--text-muted); font-weight: 700; }
    .oor { font-size: var(--fs-base); color: var(--text-muted); line-height: 1.5; overflow-wrap: anywhere; }
    .merkie {
      margin-top: auto;
      padding-top: 0.5rem;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--fs-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--blok-verkoop);
    }

    /* Same pairing as the map: colour alone is not enough, so the chosen card
       also carries the heavy border and the tick. */
    .bouer.gekies {
      background: var(--blok-gekies);
      border-color: var(--ink);
      color: #FFFFFF;
    }
    .bouer.gekies .naam,
    .bouer.gekies .rol,
    .bouer.gekies .oor { color: #FFFFFF; }
    .bouer.gekies .foto { border-color: #FFFFFF; }
    .tiek {
      position: absolute;
      top: 0.5rem;
      right: 0.75rem;
      font-size: 1.75rem;
      line-height: 1;
      color: #FFFFFF;
    }

    .bouer.geborg {
      cursor: not-allowed;
      background: var(--bg-chalk);
      opacity: 0.7;
    }
    .bouer.geborg .foto { filter: grayscale(1); }

    /* Bigger than the selected tick so a sponsored builder reads as done, not chosen. */
    .foto-raam { position: relative; display: block; width: 100%; }
    .geborg-seel {
      position: absolute;
      inset: 0 0 0.35rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.35);
    }
    .geborg-tiek {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 50%;
      background: var(--done);
      border: 3px solid #FFFFFF;
      color: #FFFFFF;
      font-size: 2.75rem;
      line-height: 1;
    }
    .geborg-teks {
      padding: 0.3rem 0.7rem;
      background: var(--done);
      color: #FFFFFF;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--fs-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .keuse-kaart {
      background: var(--tar);
      color: #fff;
      padding: 1.75rem;
      position: sticky;
      top: 5.5rem;
    }
    .keuse-kaart .eyebrow { color: rgba(255,255,255,0.55); }
    .teller {
      font-family: var(--font-display);
      font-size: 4rem;
      font-weight: 800;
      line-height: 1;
      margin: 0.75rem 0 0;
      font-variant-numeric: tabular-nums;
    }
    .teller-etiket { color: rgba(255,255,255,0.65); font-size: var(--fs-base); }
    .totaal {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--action);
      margin-top: 0.75rem;
    }
    .totaal-nota { color: rgba(255,255,255,0.6); font-size: var(--fs-sm); }
    .waarskuwing {
      background: rgba(251, 202, 14, 0.15);
      border-left: 4px solid var(--ob-yellow);
      color: #FFF3C4;
      font-size: var(--fs-base);
      padding: 0.75rem 1rem;
      margin: 1rem 0;
    }
    .gekose-bouers {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
      margin: 1.25rem 0 0.5rem;
      padding: 0;
    }
    .gekose-bouer {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
      min-height: var(--tap-large);
      padding: 0.5rem 0.75rem;
      background: var(--blok-gekies);
      border: 2px solid #FFFFFF;
      color: #FFFFFF;
      cursor: pointer;
      font-family: var(--font-display);
    }
    .gekose-bouer:hover,
    .gekose-bouer:focus-visible { background: var(--blok-verkoop); }
    .gekose-naam { font-size: var(--fs-lg); font-weight: 800; line-height: 1.1; }
    .gekose-af {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .leeg { color: rgba(255,255,255,0.6); font-size: var(--fs-base); margin: 1rem 0 0.5rem; }
    .keuse-kaart .btn-primary { width: 100%; margin-top: 1rem; }
    .maak-skoon,
    .keuse-kaart .btn-terug {
      width: 100%;
      margin-top: 0.75rem;
      border-color: rgba(255, 255, 255, 0.55);
      color: #fff;
    }
    .maak-skoon:hover,
    .keuse-kaart .btn-terug:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .maak-skoon { font-size: var(--fs-base); min-height: var(--tap-min); padding: 0.6rem 1rem; }

    .voetbalk { display: none; }

    @media (max-width: 1000px) {
      .layout { grid-template-columns: 1fr; }
      .keuse-kaart { position: static; }
    }

    @media (max-width: 820px) {
      .voetbalk {
        display: flex;
        position: sticky;
        bottom: 0;
        z-index: 20;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin: 0 -1.5rem -4rem;
        padding: 0.7rem 1.25rem;
        background: var(--tar);
        color: #fff;
        box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.3);
      }
      .voetbalk-getal {
        display: block;
        font-family: var(--font-display);
        font-size: 1.9rem;
        font-weight: 800;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .voetbalk-woord { font-size: 0.9rem; color: rgba(255,255,255,0.7); }
      .voetbalk .btn-primary {
        min-height: var(--tap-min);
        padding: 0.6rem 1.25rem;
        font-size: var(--fs-base);
        white-space: nowrap;
      }
      /* The bar carries the count and the way onward, so the panel stops repeating them. */
      .keuse-kaart .teller,
      .keuse-kaart .teller-etiket,
      .keuse-kaart > .btn-primary { display: none; }
    }

    @media (max-width: 700px) {
      .voetbalk { margin-left: -1rem; margin-right: -1rem; }
      .bouers { grid-template-columns: 1fr; }
    }
  `]
})
export class BouStadsbouersComponent implements OnInit {
  private router = inject(Router);
  private road = inject(RoadService);
  private purchase = inject(PurchaseService);
  private stadsbouers = inject(StadsbouerService);

  readonly prysPerMeter = PRYS_PER_METER;
  readonly randBedrag = randBedrag;
  readonly fotoUrl = (id: number) => this.stadsbouers.fotoUrl(id);

  bouers = signal<Stadsbouer[]>([]);
  laai = signal(true);
  laaiFout = signal<string | null>(null);
  besig = signal(false);
  boodskap = signal<string | null>(null);

  /** Selection order is kept: it is what pairs a builder to a block at checkout. */
  gekies = signal<number[]>([]);

  kanGaanVoort = computed(() => this.gekies().length > 0 && !this.besig());

  aankondiging = computed(() => {
    const n = this.gekies().length;
    return isEngels()
      ? `${n} road builder${n === 1 ? '' : 's'} selected`
      : `${n} stadsbouer${n === 1 ? '' : 's'} gekies`;
  });

  ngOnInit() {
    this.stadsbouers.list().subscribe({
      next: (bouers) => {
        this.bouers.set(bouers);
        this.laai.set(false);
      },
      error: () => {
        this.laaiFout.set('Kon nie die stadsbouers laai nie. Probeer weer.');
        this.laai.set(false);
      }
    });
  }

  kiesbaar(b: Stadsbouer) {
    return !b.isSponsored && !b.isPending;
  }

  isGekies(id: number) {
    return this.gekies().includes(id);
  }

  wissel(b: Stadsbouer) {
    if (!this.kiesbaar(b)) return;
    this.boodskap.set(null);

    const huidig = this.gekies();
    if (huidig.includes(b.id)) {
      this.gekies.set(huidig.filter(id => id !== b.id));
      return;
    }

    if (huidig.length >= MAKS_PER_TRANSAKSIE) {
      this.boodskap.set(`Maksimum van ${MAKS_PER_TRANSAKSIE} blokkies per transaksie`);
      return;
    }

    this.gekies.set([...huidig, b.id]);
  }

  verwyder(id: number) {
    this.gekies.set(this.gekies().filter(gekiesId => gekiesId !== id));
    this.boodskap.set(null);
  }

  maakSkoon() {
    this.gekies.set([]);
    this.boodskap.set(null);
  }

  /** Centred on the card, but nudged back inside the viewport so edge cards do not clip. */
  plaasDetail(event: Event) {
    const knop = event.currentTarget as HTMLElement;
    const detail = knop.querySelector<HTMLElement>('.detail');
    if (!detail) return;
    const kaart = knop.getBoundingClientRect();
    const rand = 16;
    const skuif = (midde: number, grootte: number, ruimte: number) =>
      Math.max(rand + grootte / 2, Math.min(ruimte - rand - grootte / 2, midde)) - midde;
    const x = skuif(kaart.left + kaart.width / 2, detail.offsetWidth, window.innerWidth);
    const y = skuif(kaart.top + kaart.height / 2, detail.offsetHeight, window.innerHeight);
    knop.style.setProperty('--skuif-x', `${x}px`);
    knop.style.setProperty('--skuif-y', `${y}px`);
  }

  naamVan(id: number) {
    return this.bouers().find(b => b.id === id)?.name ?? '';
  }

  letters(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(deel => deel[0].toUpperCase()).join('');
  }

  etiket(b: Stadsbouer) {
    const naam = b.title ? `${b.name}, ${b.title}` : b.name;
    if (b.isSponsored) return isEngels() ? `${naam}, already sponsored` : `${naam}, reeds geborg`;
    if (b.isPending) return isEngels() ? `${naam}, being sponsored` : `${naam}, word tans geborg`;
    return naam;
  }

  verwyderEtiket(id: number) {
    return isEngels() ? `Remove ${this.naamVan(id)}` : `Verwyder ${this.naamVan(id)}`;
  }

  /**
   * The blocks themselves are drawn here, the same way "kies vir my" does it, so nobody has to
   * pick a number for someone else. Order matters: block n goes to builder n.
   */
  gaanVoort() {
    if (!this.kanGaanVoort()) return;

    const ids = this.gekies();
    this.besig.set(true);
    this.boodskap.set(null);

    this.road.pickSquares(ids.length).subscribe({
      next: (res) => {
        const squareIds = res?.squareIds ?? [];
        if (squareIds.length < ids.length) {
          this.boodskap.set('Daar is nie meer genoeg blokkies beskikbaar nie. Kies ’n kleiner aantal.');
          this.besig.set(false);
          return;
        }
        this.purchase.bouAantal = ids.length;
        this.purchase.pendingSquareIds = squareIds;
        this.purchase.stadsbouerIds = ids;
        this.besig.set(false);
        this.router.navigate(['/bou/bevestig']);
      },
      error: (err) => {
        this.besig.set(false);
        this.boodskap.set(err.error?.message ?? 'Kon nie blokkies toeken nie. Probeer weer.');
      }
    });
  }
}
