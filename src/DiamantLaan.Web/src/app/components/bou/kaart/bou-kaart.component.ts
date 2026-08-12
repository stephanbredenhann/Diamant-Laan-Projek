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
  Reeks,
  blokRede,
  groepe,
  reeksSleutel,
  seksieVan,
  seksies,
  telBeskikbaar,
} from './blok-reekse';

const PRYS_PER_METER = 500;

/**
 * Step 2, the "kies self" path: a guided drill-down instead of a free map.
 *
 * Thousand, then hundred, then the blocks themselves. Nothing on this page
 * pans, zooms or scrolls sideways, because every one of those is a way to end
 * up lost, and the visitor is in the middle of paying.
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
      <p class="eyebrow page-eyebrow">Stap 2 van 3 · Kies self</p>
      <div class="visually-hidden" aria-live="polite">{{ aankondiging() }}</div>
      <h1 class="page-title">{{ titel() }}</h1>
      <p class="page-lead">{{ leidraad() }}</p>

      <app-bou-step-bar [active]="2" [nextEnabled]="klaarGekies()" />

      <nav class="krummels" aria-label="Waar jy is">
        <button type="button" class="krummel" [class.huidig]="vlak() === 1" (click)="gaanNaVlak(1)">
          Alle blokke
        </button>
        @if (groep(); as g) {
          <span class="krummel-skei" aria-hidden="true">›</span>
          <button type="button" class="krummel" [class.huidig]="vlak() === 2" (click)="gaanNaVlak(2)">
            {{ reeksNaam(g) }}
          </button>
        }
        @if (seksie(); as s) {
          <span class="krummel-skei" aria-hidden="true">›</span>
          <button type="button" class="krummel huidig" (click)="gaanNaVlak(3)">
            {{ reeksNaam(s) }}
          </button>
        }
      </nav>

      <div class="layout">
        <div class="werkarea" [class.langs]="vlak() < 3">
          <!-- Beside the buttons it is a panel and can afford height; above the
               blocks it is a slim band, so it orients without crowding them. -->
          <app-pad-oorsig [merk]="gemerk()" [aspek]="vlak() === 3 ? 7 : 16 / 9" />
          <div class="inhoud">
          @if (laai()) {
            <p class="laai-nota">Besig om die blokke te laai...</p>
          } @else if (laaiFout()) {
            <p class="error-alert">{{ laaiFout() }}</p>
          } @else if (vlak() === 1) {
            <div class="reeks-rooster groot" role="group" aria-label="Kies ’n groep blokke">
              @for (g of alleGroepe; track reeksSleutel(g)) {
                <button
                  type="button"
                  class="reeks-kaart"
                  [disabled]="beskikbaarIn(g) === 0"
                  (click)="kiesGroep(g)"
                >
                  <span class="reeks-eyebrow">Blokke</span>
                  <span class="reeks-nommer">{{ reeksNaam(g) }}</span>
                  <span class="reeks-telling">{{ vryTeks(g) }}</span>
                  <span class="reeks-balk" aria-hidden="true">
                    <span class="reeks-balk-vul" [style.width.%]="vryPersent(g)"></span>
                  </span>
                </button>
              }
            </div>
          } @else if (vlak() === 2) {
            <div class="reeks-rooster smal" role="group" aria-label="Kies ’n honderdtal blokke">
              @for (s of huidigeSeksies(); track reeksSleutel(s)) {
                <button
                  type="button"
                  class="reeks-kaart"
                  [disabled]="beskikbaarIn(s) === 0"
                  (click)="kiesSeksie(s)"
                >
                  <span class="reeks-eyebrow">Blokke</span>
                  <span class="reeks-nommer">{{ reeksNaam(s) }}</span>
                  <span class="reeks-telling">{{ vryTeks(s) }}</span>
                  <span class="reeks-balk" aria-hidden="true">
                    <span class="reeks-balk-vul" [style.width.%]="vryPersent(s)"></span>
                  </span>
                </button>
              }
            </div>
          } @else {
            @let s = seksie()!;
            <div class="strook-paneel">
              <div class="strook-kop">
                <button type="button" class="strook-blaai" (click)="skuifSeksie(-1)" [disabled]="!vorigeSeksie()">
                  ‹ Vorige 100
                </button>
                <div class="legende">
                  <span><i class="swatch beskikbaar"></i> Beskikbaar</span>
                  <span><i class="swatch gekies"></i> Gekies</span>
                  <span><i class="swatch verkoop"></i> Verkoop</span>
                  <span><i class="swatch onbeskikbaar"></i> Onbeskikbaar</span>
                </div>
                <button type="button" class="strook-blaai" (click)="skuifSeksie(1)" [disabled]="!volgendeSeksie()">
                  Volgende 100 ›
                </button>
              </div>
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
              <p class="strook-nota">Druk op ’n blokkie om dit te kies. Druk weer om dit af te haal.</p>
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
                    [attr.aria-label]="'Haal blok ' + id + ' af'"
                  >
                    <span class="gekose-nommer">{{ id }}</span>
                    <span class="gekose-af" aria-hidden="true">Haal af</span>
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
    /* Wider than .container-wide: at level 3 the strip has to fit seventeen
       blocks across and still print a four-digit number on each one. */
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
    .werkarea { min-width: 0; }
    .werkarea app-pad-oorsig { margin-bottom: 1.5rem; }

    /* Stacked, the preview's 486 px pushed the range buttons a full screen below
       the fold, so the page opened on a map with no visible way to act on it.
       While choosing a range there is spare width beside the buttons, so the
       preview goes there and the buttons start at the top. At block level the
       strip needs the full width back, and by then the visitor has already
       used the page. */
    .werkarea.langs {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(22rem, 30rem);
      gap: 1.5rem;
      align-items: start;
    }
    /* The button column is narrower here than at full width, so the range
       numbers step down a size rather than overflow their card. */
    .werkarea.langs .reeks-rooster.groot .reeks-nommer {
      font-size: clamp(1.5rem, 1.8vw, 2.2rem);
    }
    .werkarea.langs .inhoud { grid-column: 1; grid-row: 1; }
    .werkarea.langs app-pad-oorsig {
      grid-column: 2;
      grid-row: 1;
      margin-bottom: 0;
      position: sticky;
      top: 5.5rem;
    }
    .laai-nota { color: var(--text-muted); font-size: var(--fs-lg); }

    .krummels {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    .krummel {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
      min-height: var(--tap-min);
      padding: 0.5rem 1.1rem;
      background: var(--surface);
      border: 2px solid var(--border-soft);
      color: var(--route-blue);
      cursor: pointer;
    }
    .krummel:hover { border-color: var(--route-blue); }
    .krummel.huidig {
      background: var(--route-blue);
      border-color: var(--route-blue);
      color: #fff;
      cursor: default;
    }
    .krummel-skei {
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      color: var(--text-muted);
    }

    .reeks-rooster {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
      max-width: 60rem;
    }
    /* Four groups sit as a 2×2 block rather than a row of three and a stray. */
    .reeks-rooster.groot {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-width: 44rem;
    }
    .reeks-rooster.smal {
      grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
      max-width: 66rem;
    }
    /* Four-digit ranges are wide; kept on one line so the eye can scan the
       column of numbers without every card breaking in a different place. */
    .reeks-rooster.smal .reeks-nommer { font-size: clamp(1.5rem, 1.8vw, 1.95rem); }
    .reeks-kaart {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.3rem;
      padding: 1.25rem;
      min-height: 9.5rem;
      background: var(--surface);
      border: 2px solid var(--border-soft);
      text-align: left;
      font-family: var(--font-body);
      cursor: pointer;
      transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    }
    .reeks-kaart:hover:not(:disabled) {
      border-color: var(--action);
      transform: translateY(-2px);
      box-shadow: var(--shadow-cta);
    }
    .reeks-eyebrow {
      font-family: var(--font-display);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--route-blue);
    }
    .reeks-nommer {
      font-family: var(--font-display);
      font-size: clamp(1.9rem, 2.4vw, 2.6rem);
      font-weight: 800;
      line-height: 1;
      color: var(--ink);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .reeks-telling {
      font-size: var(--fs-base);
      color: var(--text-muted);
      margin-top: auto;
    }
    .reeks-balk {
      display: block;
      width: 100%;
      height: 0.5rem;
      background: var(--surface-sand);
      margin-top: 0.6rem;
    }
    .reeks-balk-vul { display: block; height: 100%; background: var(--blok-gekies); }
    .reeks-kaart:disabled .reeks-nommer,
    .reeks-kaart:disabled .reeks-eyebrow { color: var(--text-muted); }

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
    .legende {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
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
      margin-top: 0.75rem;
      font-size: var(--fs-base);
      color: var(--text-muted);
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
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.2);
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
      /* Full width again: stacking the preview above the buttons is right once
         there is no room to put it beside them. */
      .werkarea.langs { display: block; }
      .werkarea.langs app-pad-oorsig { position: static; margin-bottom: 1.5rem; }
    }

    @media (max-width: 820px) {
      .net-wyd { display: none; }
      .net-smal { display: block; }
      .strook-paneel { background: transparent; border: none; padding: 0; }
      .legende { order: -1; width: 100%; justify-content: center; }
      .strook-kop { gap: 0.5rem; }
      .strook-blaai { flex: 1; }
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
      .krummels { gap: 0.35rem; }
      .krummel { font-size: var(--fs-base); padding: 0.45rem 0.7rem; }
      .reeks-rooster.groot,
      .reeks-rooster.smal { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .reeks-kaart { min-height: 7.5rem; padding: 1rem; }
      .reeks-nommer { font-size: 1.6rem; }
    }
  `]
})
export class BouKaartComponent implements OnInit {
  private router = inject(Router);
  private road = inject(RoadService);
  private purchase = inject(PurchaseService);

  readonly prysPerMeter = PRYS_PER_METER;
  readonly alleGroepe = groepe();
  readonly maxBlokId = this.alleGroepe[this.alleGroepe.length - 1].tot;
  readonly randBedrag = randBedrag;
  readonly reeksSleutel = reeksSleutel;

  squares = signal<Square[]>([]);
  laai = signal(true);
  laaiFout = signal<string | null>(null);

  aantal = signal(0);
  vlak = signal<1 | 2 | 3>(1);
  groep = signal<Reeks | null>(null);
  seksie = signal<Reeks | null>(null);
  gekies = signal<Set<number>>(new Set());
  boodskap = signal<string | null>(null);
  beklemtoon = signal<number | null>(null);
  soekNommer: number | null = null;
  soekFout = signal<string | null>(null);

  private byId = computed(() => new Map(this.squares().map(s => [s.id, s])));

  /**
   * Free-block counts for every range, worked out once per load rather than on
   * each change-detection pass: the template asks for them three times a card.
   */
  private tellings = computed(() => {
    const byId = this.byId();
    const m = new Map<string, number>();
    for (const g of this.alleGroepe) {
      m.set(reeksSleutel(g), telBeskikbaar(g, byId));
      for (const s of seksies(g)) {
        m.set(reeksSleutel(s), telBeskikbaar(s, byId));
      }
    }
    return m;
  });

  gekiesLys = computed(() => Array.from(this.gekies()).sort((a, b) => a - b));
  klaarGekies = computed(() => this.aantal() > 0 && this.gekies().size === this.aantal());

  huidigeSeksies = computed(() => {
    const g = this.groep();
    return g ? seksies(g) : [];
  });

  /** What the overview band highlights: always the narrowest thing chosen so far. */
  gemerk = computed(() => this.seksie() ?? this.groep());

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
      },
      error: () => {
        this.laai.set(false);
        this.laaiFout.set('Kon nie die blokke laai nie. Herlaai die bladsy en probeer weer.');
      },
    });
  }

  titel(): string {
    switch (this.vlak()) {
      case 1: return 'Kies waar op die pad';
      case 2: return `Blokke ${this.reeksNaam(this.groep()!)}`;
      default: return `Blokke ${this.reeksNaam(this.seksie()!)}`;
    }
  }

  leidraad(): string {
    switch (this.vlak()) {
      case 1: return 'Begin breed. Kies eers ’n groot groep blokke, dan ’n kleiner groep, en eers daarna kies jy die blokkies self.';
      case 2: return 'Kies nou ’n kleiner groep van honderd blokke. Die getal onderaan wys hoeveel nog beskikbaar is.';
      default: return 'Hier is die blokkies op die pad. Klik op ’n oop blokkie om dit te kies.';
    }
  }

  aankondiging = computed(() => {
    const v = this.vlak();
    if (v === 1) return 'Stap 2 van 3: kies ’n groep blokke.';
    if (v === 2) return `Groep ${this.reeksNaam(this.groep()!)} oop. Kies ’n honderdtal.`;
    return `Blokke ${this.reeksNaam(this.seksie()!)} is oop.`;
  });

  reeksNaam(r: Reeks): string {
    return `${nommer(r.van)} – ${nommer(r.tot)}`;
  }

  beskikbaarIn(r: Reeks): number {
    return this.tellings().get(reeksSleutel(r)) ?? 0;
  }

  vryTeks(r: Reeks): string {
    const vry = this.beskikbaarIn(r);
    if (vry === 0) return 'Niks meer beskikbaar nie';
    if (vry === 1) return '1 nog beskikbaar';
    return `${nommer(vry)} nog beskikbaar`;
  }

  vryPersent(r: Reeks): number {
    const totaal = r.tot - r.van + 1;
    return totaal === 0 ? 0 : (this.beskikbaarIn(r) / totaal) * 100;
  }

  leegTeks(): string {
    return this.vlak() === 3
      ? 'Nog niks gekies nie. Klik op ’n blokkie op die kaart.'
      : 'Nog niks gekies nie. Kies ’n groep om te begin.';
  }

  oorblywendTeks(): string {
    const oor = this.aantal() - this.gekies().size;
    if (oor <= 0) return 'Alles gekies. Gaan gerus voort.';
    return oor === 1 ? 'Kies nog 1 blokkie.' : `Kies nog ${oor} blokkies.`;
  }

  /** Short enough to sit beside the count in the phone bar. */
  voetbalkTeks(): string {
    const oor = this.aantal() - this.gekies().size;
    if (oor <= 0) return 'Alles gekies';
    return oor === 1 ? 'Kies nog 1' : `Kies nog ${oor}`;
  }

  // --- Navigation -------------------------------------------------------

  /**
   * Moving up drops what was chosen below it. Leaving the old section behind
   * meant the trail still offered "2 301 – 2 400" after you had gone back to
   * pick a different thousand, and it would silently reopen the stretch you had
   * just left.
   */
  gaanNaVlak(v: 1 | 2 | 3) {
    if (v === 2 && !this.groep()) return;
    if (v === 3 && !this.seksie()) return;

    if (v <= 2) this.seksie.set(null);
    if (v === 1) this.groep.set(null);

    this.vlak.set(v);
    this.wisBoodskappe();
  }

  kiesGroep(g: Reeks) {
    this.groep.set(g);
    this.seksie.set(null);
    this.vlak.set(2);
    this.wisBoodskappe();
  }

  kiesSeksie(s: Reeks) {
    this.seksie.set(s);
    this.vlak.set(3);
    this.wisBoodskappe();
  }

  /** One step back up the drill-down, or out of the wizard step entirely. */
  gaanTerug() {
    const v = this.vlak();
    if (v === 1) {
      this.router.navigate(['/bou/kies']);
      return;
    }
    this.gaanNaVlak(v === 3 ? 2 : 1);
  }

  private buurSeksie(rigting: -1 | 1): Reeks | null {
    const huidig = this.seksie();
    if (!huidig) return null;
    const van = huidig.van + rigting * (huidig.tot - huidig.van + 1);
    return seksieVan(van)?.seksie ?? null;
  }

  vorigeSeksie = computed(() => this.buurSeksie(-1));
  volgendeSeksie = computed(() => this.buurSeksie(1));

  skuifSeksie(rigting: -1 | 1) {
    const volgende = this.buurSeksie(rigting);
    if (!volgende) return;
    const plek = seksieVan(volgende.van);
    if (!plek) return;
    this.groep.set(plek.groep);
    this.seksie.set(plek.seksie);
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
        'Haal een af om ’n ander te kies.'
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
    this.groep.set(plek.groep);
    this.seksie.set(plek.seksie);
    this.vlak.set(3);
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
