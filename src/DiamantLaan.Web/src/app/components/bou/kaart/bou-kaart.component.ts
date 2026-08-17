import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoadService } from '../../../services/road.service';
import { PurchaseService } from '../../../services/purchase.service';
import { Square } from '../../../models/square';
import { nommer, randBedrag } from '../../../utils/afrikaans.util';
import { BouStepBarComponent } from '../../shared/bou-step-bar/bou-step-bar.component';
import { BlokRoosterComponent } from './blok-rooster.component';
import { BlokStrookComponent } from './blok-strook.component';
import { PadOorsigComponent } from './pad-oorsig.component';
import {
  MAX_BLOK_ID,
  Reeks,
  alleSeksies,
  blokRede,
  reeksSleutel,
  seksieVan,
  telBeskikbaar,
} from './blok-reekse';

const PRYS_PER_METER = 500;

/**
 * Step 2, the "kies self" path: a hundred numbered blocks at a time.
 *
 * It opens on real blocks rather than on ranges to drill through, starting at
 * the first hundred with anything left. Paging and a jump list move between the
 * hundreds. Nothing on this page pans, zooms or scrolls sideways, because every
 * one of those is a way to end up lost, and the visitor is in the middle of
 * paying.
 */
@Component({
  selector: 'app-bou-kaart',
  standalone: true,
  imports: [
    FormsModule, RouterLink, BouStepBarComponent,
    BlokStrookComponent, BlokRoosterComponent, PadOorsigComponent,
  ],
  template: `
    <div class="kaart-shell bou-shell">
      <p class="eyebrow page-eyebrow">Stap 2 van 4 · Kies jou blokkie</p>
      <div class="visually-hidden" aria-live="polite">{{ aankondiging() }}</div>
      <h1 class="page-title">{{ titel() }}</h1>
      <p class="page-lead">{{ leidraad() }}</p>

      <app-bou-step-bar [active]="2" [nextEnabled]="klaarGekies()" />

      <div class="layout">
        <div class="werkarea">
          <!-- A slim band under the blocks: it orients without pushing the thing
               you came to use below the fold. On a phone it goes back on top. -->
          <app-pad-oorsig [merk]="gemerk()" [aspek]="7" />
          <div class="inhoud">
          @if (laai()) {
            <p class="laai-nota">Besig om die blokke te laai...</p>
          } @else if (laaiFout()) {
            <p class="error-alert">{{ laaiFout() }}</p>
          } @else {
            @let s = seksie();
            <div class="strook-paneel">
              <div class="strook-kop">
                <button type="button" class="strook-blaai" (click)="skuifSeksie(-1)" [disabled]="!vorigeSeksie()">
                  ‹ Vorige 100
                </button>
                <div class="springer">
                  <select
                    id="seksie-keuse"
                    aria-label="Spring na blokke"
                    [value]="reeksSleutel(s)"
                    (change)="kiesSeksie($event)"
                  >
                    @for (opsie of alleSeksies; track reeksSleutel(opsie)) {
                      <option [value]="reeksSleutel(opsie)" [disabled]="beskikbaarIn(opsie) === 0">
                        {{ reeksNaam(opsie) }} · {{ vryKort(opsie) }}
                      </option>
                    }
                  </select>
                </div>
                <button type="button" class="strook-blaai" (click)="skuifSeksie(1)" [disabled]="!volgendeSeksie()">
                  Volgende 100 ›
                </button>
              </div>
              <div class="legende">
                <span><i class="swatch beskikbaar"></i> Beskikbaar</span>
                <span><i class="swatch gekies"></i> Gekies</span>
                <span><i class="swatch verkoop"></i> Verkoop</span>
                <span><i class="swatch onbeskikbaar"></i> Onbeskikbaar</span>
              </div>
              <p class="strook-nota">Klik op ’n blokkie om dit te kies. Klik weer daarop om jou keuse te verwyder.</p>
              <app-blok-strook
                class="net-wyd"
                [van]="s.van"
                [tot]="s.tot"
                [squares]="squares()"
                [selectedIds]="gekiesLys()"
                [beklemtoon]="beklemtoon()"
                (blokGekliek)="wisselBlok($event)"
              />
              <app-blok-rooster
                class="net-smal"
                [van]="s.van"
                [tot]="s.tot"
                [squares]="squares()"
                [selectedIds]="gekiesLys()"
                [beklemtoon]="beklemtoon()"
                (blokGekliek)="wisselBlok($event)"
              />
            </div>
          }
          </div>
        </div>

        <aside class="keuse-kaart">
          <p class="eyebrow">Jou keuse</p>
          <p class="teller" aria-live="polite">
            {{ gekies().size }} <span>/ {{ aantal() }}</span>
          </p>
          <p class="teller-etiket">blokkies gekies</p>
          <p class="totaal">{{ randBedrag(aantal() * prysPerMeter) }}</p>
          <p class="totaal-nota">R{{ prysPerMeter }} per blokkie</p>

          <div class="soek">
            <label for="soek-blok">Soek ’n bloknommer</label>
            <div class="soek-ry">
              <input
                id="soek-blok"
                type="number"
                name="soekBlok"
                inputmode="numeric"
                min="1"
                [max]="maxBlokId"
                placeholder="bv. 2350"
                [(ngModel)]="soekNommer"
                (keydown.enter)="soek()"
              >
              <button type="button" class="btn btn-accent" (click)="soek()">Soek</button>
            </div>
            @if (soekFout(); as f) {
              <p class="waarskuwing" role="alert">{{ f }}</p>
            }
          </div>

          @if (boodskap(); as b) {
            <p class="waarskuwing" role="alert">{{ b }}</p>
          }

          @if (gekiesLys().length > 0) {
            <ul class="gekose-blokke">
              @for (id of gekiesLys(); track id) {
                <li>
                  <button
                    type="button"
                    class="gekose-blok"
                    (click)="verwyder(id)"
                    [attr.aria-label]="'Verwyder blok ' + id"
                  >
                    <span class="gekose-nommer">{{ id }}</span>
                    <span class="gekose-af" aria-hidden="true">Verwyder</span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="leeg">{{ leegTeks() }}</p>
          }

          <p class="oorblywend">{{ oorblywendTeks() }}</p>

          <button type="button" class="btn btn-primary btn-xl" (click)="gaanVoort()" [disabled]="!klaarGekies()">
            Gaan voort
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>

          @if (gekies().size > 0) {
            <button type="button" class="btn btn-outline maak-skoon" (click)="maakSkoon()">
              Maak keuses skoon
            </button>
          }

          <button type="button" class="btn btn-outline btn-terug" (click)="gaanTerug()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Gaan terug
          </button>
          <a routerLink="/bou" class="verander">Verander hoeveelheid</a>
        </aside>
      </div>

      <!-- Phone only. The full panel sits at the foot of the page where it
           cannot swallow the blocks; this keeps the two things you need while
           tapping, how many are left and the way onward, always in reach. -->
      <div class="voetbalk net-smal">
        <div class="voetbalk-telling">
          <span class="voetbalk-getal">{{ gekies().size }} / {{ aantal() }}</span>
          <span class="voetbalk-woord">{{ voetbalkTeks() }}</span>
        </div>
        <button type="button" class="btn btn-primary" (click)="gaanVoort()" [disabled]="!klaarGekies()">
          Gaan voort
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Wider than .container-wide: the strip has to fit seventeen blocks across
       and still print a four-digit number on each one. */
    .kaart-shell {
      max-width: 1600px;
      margin: 0 auto;
    }
    .layout {
      display: grid;
      gap: 2rem;
      grid-template-columns: 1fr 340px;
      align-items: start;
      margin-top: 1.5rem;
    }
    /* DOM order puts the preview first, which is what a phone wants. On a wide
       screen it belongs under the blocks instead: the blocks are the thing you
       came to use, and a 486 px map above them pushed them below the fold. */
    .werkarea {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .werkarea app-pad-oorsig { order: 2; margin: 1.5rem 0 0; }
    .laai-nota { color: var(--text-muted); font-size: var(--fs-lg); }

    .strook-paneel {
      background: var(--bg-chalk);
      border: 1px solid var(--border-soft);
      padding: 1rem;
    }
    .strook-kop {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .strook-blaai {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
      min-height: var(--tap-min);
      padding: 0.5rem 1.1rem;
      background: var(--surface);
      border: 2px solid var(--route-blue);
      color: var(--route-blue);
      cursor: pointer;
      white-space: nowrap;
    }
    .strook-blaai:hover:not(:disabled) { background: rgba(3, 78, 162, 0.08); }

    /* Replaces the old thousand-then-hundred drill-down: one native control that
       reaches any stretch of the road in a single tap, sold-out ones greyed. */
    .springer {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      justify-content: center;
      min-width: 0;
    }
    .springer select {
      min-width: 0;
      min-height: var(--tap-min);
      padding: 0.5rem 0.75rem;
      font-family: var(--font-display);
      font-size: var(--fs-base);
      font-weight: 700;
      background: var(--surface);
      border: 2px solid var(--route-blue);
      color: var(--route-blue);
      cursor: pointer;
    }

    .legende {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
      font-size: var(--fs-sm);
      color: var(--text-muted);
    }
    .legende span { display: inline-flex; align-items: center; gap: 0.4rem; }
    .swatch {
      width: 1rem;
      height: 1rem;
      display: inline-block;
      border: 1px solid var(--border-strong);
    }
    .swatch.beskikbaar { background: var(--blok-beskikbaar); }
    .swatch.gekies { background: var(--blok-gekies); }
    .swatch.verkoop { background: var(--blok-verkoop); }
    .swatch.onbeskikbaar { background: var(--blok-onbeskikbaar); }
    .strook-nota {
      margin: 0 0 0.75rem;
      font-size: var(--fs-base);
      font-weight: 700;
      color: #000;
      text-align: center;
    }
    /* OpenStreetMap's licence requires this credit stays visible. */
    .erkenning {
      margin-top: 0.35rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
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
    .teller span { font-size: 2rem; opacity: 0.6; }
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
    /* Chosen blocks are shown as blocks, in the same green as on the map, so
       the sidebar and the road speak the same language. Big enough to read a
       four-digit number at arm's length, and the whole tile is the remove
       button rather than a small × beside it. */
    .gekose-blokke {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
      margin: 1.25rem 0 0.5rem;
      padding: 0;
    }
    .gekose-blok {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.1rem;
      min-width: 5rem;
      min-height: var(--tap-large);
      padding: 0.5rem 0.6rem;
      background: var(--blok-gekies);
      border: 2px solid #FFFFFF;
      color: #FFFFFF;
      cursor: pointer;
      font-family: var(--font-display);
    }
    .gekose-blok:hover,
    .gekose-blok:focus-visible {
      background: var(--blok-verkoop);
      border-color: #FFFFFF;
    }
    .gekose-nommer {
      font-size: var(--fs-xl);
      font-weight: 800;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .gekose-af {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .leeg { color: rgba(255,255,255,0.6); font-size: var(--fs-base); margin: 1rem 0 0.5rem; }
    .oorblywend {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--fs-lg);
      color: var(--ob-yellow);
      margin: 0.75rem 0 1rem;
    }
    .keuse-kaart .btn-primary { width: 100%; }
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

    .soek {
      margin: 1.25rem 0 0.5rem;
      padding: 1.25rem 0;
      border-top: 1px solid rgba(255,255,255,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    .soek label {
      display: block;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--fs-base);
      margin-bottom: 0.5rem;
    }
    .soek-ry { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; }
    .soek-ry input {
      min-width: 0;
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
    }
    .verander {
      display: block;
      text-align: center;
      margin-top: 1rem;
      color: rgba(255,255,255,0.75);
      font-size: var(--fs-base);
    }
    .verander:hover { color: #fff; }

    /* The road-shaped strip needs room for seventeen blocks across; below that
       the plain grid takes over. Exactly one of the two is ever rendered
       visible, and they share their colours and rules. */
    .net-smal { display: none; }

    @media (max-width: 1000px) {
      .layout { grid-template-columns: 1fr; }
      .keuse-kaart { position: static; }
      .strook-kop { justify-content: center; }
      /* On a narrow screen the map goes back on top: it is the orientation you
         want before you start tapping, and nothing is competing for the space. */
      .werkarea app-pad-oorsig { order: -1; margin: 0 0 1.5rem; }
    }

    @media (max-width: 820px) {
      .net-wyd { display: none; }
      .net-smal { display: block; }
      .strook-paneel { background: transparent; border: none; padding: 0; }
      .strook-kop { gap: 0.5rem; }
      .strook-blaai { flex: 1; }
      .springer { order: -1; width: 100%; }
    }

    .voetbalk { display: none; }

    @media (max-width: 820px) {
      /* One slim strip, not the whole panel. An earlier version pinned the full
         card and it covered most of a phone screen, leaving barely any blocks
         visible to tap. */
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
      /* The bar already carries the count and the way onward, so the panel below
         does not repeat them. */
      .keuse-kaart .teller,
      .keuse-kaart .teller-etiket,
      .keuse-kaart .oorblywend,
      .keuse-kaart > .btn-primary { display: none; }
    }

    @media (max-width: 700px) {
      .kaart-shell { padding-left: 1rem; padding-right: 1rem; }
      .voetbalk { margin-left: -1rem; margin-right: -1rem; }
      .springer select { width: 100%; }
    }
  `]
})
export class BouKaartComponent implements OnInit {
  private router = inject(Router);
  private road = inject(RoadService);
  private purchase = inject(PurchaseService);

  readonly prysPerMeter = PRYS_PER_METER;
  readonly alleSeksies = alleSeksies();
  readonly maxBlokId = MAX_BLOK_ID;
  readonly randBedrag = randBedrag;
  readonly reeksSleutel = reeksSleutel;

  squares = signal<Square[]>([]);
  laai = signal(true);
  laaiFout = signal<string | null>(null);

  aantal = signal(0);
  seksie = signal<Reeks>(this.alleSeksies[0]);
  gekies = signal<Set<number>>(new Set());
  boodskap = signal<string | null>(null);
  beklemtoon = signal<number | null>(null);
  soekNommer: number | null = null;
  soekFout = signal<string | null>(null);

  private byId = computed(() => new Map(this.squares().map(s => [s.id, s])));

  /**
   * Free-block counts per section, worked out once per load rather than on each
   * change-detection pass: the jump list asks for all forty-two of them.
   */
  private tellings = computed(() => {
    const byId = this.byId();
    return new Map(this.alleSeksies.map(s => [reeksSleutel(s), telBeskikbaar(s, byId)]));
  });

  gekiesLys = computed(() => Array.from(this.gekies()).sort((a, b) => a - b));
  klaarGekies = computed(() => this.aantal() > 0 && this.gekies().size === this.aantal());

  /** The overview band highlights whichever hundred is open. */
  gemerk = computed(() => this.seksie());

  ngOnInit() {
    const n = this.purchase.bouAantal;
    if (n === null) {
      this.router.navigate(['/bou']);
      return;
    }
    this.aantal.set(n);

    // Anything already picked (an auto-assignment, or a return trip from the
    // confirm step) becomes the starting selection so nobody has to redo it.
    // It is filtered against live data first: a stale session could otherwise
    // carry a block that has since been sold all the way to the payment page.
    const bestaande = this.purchase.pendingSquareIds;

    this.road.getSquares().subscribe({
      next: data => {
        this.squares.set(data);
        this.laai.set(false);

        const byId = this.byId();
        const geldig = bestaande.filter(id => blokRede(id, byId.get(id)) === null).slice(0, n);
        if (geldig.length > 0) this.gekies.set(new Set(geldig));

        this.seksie.set(this.openingsSeksie(geldig));
      },
      error: () => {
        this.laai.set(false);
        this.laaiFout.set('Kon nie die blokke laai nie. Herlaai die bladsy en probeer weer.');
      },
    });
  }

  /**
   * Where the page opens: the section holding the first block already picked, or
   * failing that the first one with anything left. Landing on a sold-out stretch
   * would look like a broken page to someone who has just paid attention.
   */
  private openingsSeksie(gekies: number[]): Reeks {
    const eerste = gekies.length > 0 ? seksieVan(Math.min(...gekies)) : null;
    if (eerste) return eerste;

    const byId = this.byId();
    return this.alleSeksies.find(s => telBeskikbaar(s, byId) > 0) ?? this.alleSeksies[0];
  }

  titel(): string {
    return `Blokkies ${this.reeksNaam(this.seksie())}`;
  }

  leidraad(): string {
    return 'Hier is die blokkies op die pad. Klik op ’n beskikbare blokkie om dit te kies.';
  }

  aankondiging = computed(() => `Blokkies ${this.reeksNaam(this.seksie())} is oop.`);

  reeksNaam(r: Reeks): string {
    return `${nommer(r.van)} – ${nommer(r.tot)}`;
  }

  beskikbaarIn(r: Reeks): number {
    return this.tellings().get(reeksSleutel(r)) ?? 0;
  }

  /** Short enough to sit on one line of the jump list, beside the range. */
  vryKort(r: Reeks): string {
    const vry = this.beskikbaarIn(r);
    if (vry === 0) return 'geen beskikbaar';
    return `${nommer(vry)} beskikbaar`;
  }

  leegTeks(): string {
    return 'Nog niks gekies nie. Klik op ’n blokkie op die kaart.';
  }

  oorblywendTeks(): string {
    const oor = this.aantal() - this.gekies().size;
    if (oor <= 0) return 'Alles gekies. Jy kan nou voortgaan.';
    return oor === 1 ? 'Kies nog 1 blokkie.' : `Kies nog ${oor} blokkies.`;
  }

  /** Short enough to sit beside the count in the phone bar. */
  voetbalkTeks(): string {
    const oor = this.aantal() - this.gekies().size;
    if (oor <= 0) return 'Alles gekies';
    return oor === 1 ? 'Kies nog 1' : `Kies nog ${oor}`;
  }

  // --- Navigation -------------------------------------------------------

  /** Jump list: the value is the range key, so map it back to the range. */
  kiesSeksie(gebeurtenis: Event) {
    const sleutel = (gebeurtenis.target as HTMLSelectElement).value;
    const s = this.alleSeksies.find(r => reeksSleutel(r) === sleutel);
    if (!s) return;
    this.seksie.set(s);
    this.wisBoodskappe();
  }

  /** Out of the wizard step; there is no drill-down left to climb. */
  gaanTerug() {
    this.router.navigate(['/bou/kies']);
  }

  private buurSeksie(rigting: -1 | 1): Reeks | null {
    const huidig = this.seksie();
    return seksieVan(huidig.van + rigting * (huidig.tot - huidig.van + 1));
  }

  vorigeSeksie = computed(() => this.buurSeksie(-1));
  volgendeSeksie = computed(() => this.buurSeksie(1));

  skuifSeksie(rigting: -1 | 1) {
    const volgende = this.buurSeksie(rigting);
    if (!volgende) return;
    this.seksie.set(volgende);
    this.wisBoodskappe();
  }

  // --- Selection --------------------------------------------------------

  wisselBlok(id: number) {
    this.wisBoodskappe();

    const huidig = new Set(this.gekies());
    if (huidig.has(id)) {
      huidig.delete(id);
      this.gekies.set(huidig);
      return;
    }

    if (!this.kanNogKies(id)) return;

    huidig.add(id);
    this.gekies.set(huidig);
  }

  /** Guards the cap and the availability rules for every path that adds a block. */
  private kanNogKies(id: number): boolean {
    if (blokRede(id, this.byId().get(id)) !== null) return false;
    if (this.gekies().size >= this.aantal()) {
      this.boodskap.set(
        `Jy het reeds ${this.aantal()} ${this.aantal() === 1 ? 'blokkie' : 'blokkies'} gekies. ` +
        'Verwyder een om ’n ander blokkie te kies.'
      );
      return false;
    }
    return true;
  }

  verwyder(id: number) {
    const huidig = new Set(this.gekies());
    huidig.delete(id);
    this.gekies.set(huidig);
    this.wisBoodskappe();
  }

  maakSkoon() {
    this.gekies.set(new Set());
    this.wisBoodskappe();
  }

  private wisBoodskappe() {
    this.boodskap.set(null);
    this.soekFout.set(null);
    this.beklemtoon.set(null);
  }

  // --- Search -----------------------------------------------------------

  soek() {
    this.wisBoodskappe();

    const id = Math.floor(Number(this.soekNommer));
    const plek = seksieVan(id);
    if (!plek) {
      this.soekFout.set(`Blok ${this.soekNommer} bestaan nie. Kies ’n nommer tussen 1 en ${nommer(this.maxBlokId)}.`);
      return;
    }

    // Show them where it is either way; a refusal makes far more sense when you
    // can see the block sitting there in red or black.
    this.seksie.set(plek);
    this.beklemtoon.set(id);

    if (this.gekies().has(id)) {
      this.soekFout.set(`Blok ${id} is reeds een van joune.`);
      return;
    }

    const rede = blokRede(id, this.byId().get(id));
    if (rede === 'verkoop') {
      this.soekFout.set(`Blok ${id} is reeds verkoop. Kies ’n ander een.`);
      return;
    }
    if (rede === 'onbeskikbaar') {
      this.soekFout.set(`Blok ${id} is nie beskikbaar nie.`);
      return;
    }

    if (!this.kanNogKies(id)) return;

    this.gekies.set(new Set(this.gekies()).add(id));
  }

  // --- Done -------------------------------------------------------------

  gaanVoort() {
    if (!this.klaarGekies()) return;
    this.purchase.pendingSquareIds = this.gekiesLys();
    this.router.navigate(['/bou/bevestig']);
  }
}
