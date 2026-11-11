import { Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StraatfeesInfo, StraatfeesService, postToPayFast } from '../../services/straatfees.service';
import { randBedrag } from '../../utils/afrikaans.util';
import { validateEmail } from '../../utils/validation.util';
import { TPipe } from '../../i18n/t.pipe';

/**
 * Straatfees landing page. POC: the hero carries the Delft-blue poster artwork and lines;
 * the rest is lorem ipsum with "(foto hier)" slots until the real content arrives. The only live part is the ticket purchase:
 * one button, one dialog (name, email, count), then PayFast.
 */
@Component({
  selector: 'app-straatfees',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <section class="fees-hero">
      <div class="teel">
        <span class="raam" aria-hidden="true"></span>
        @for (h of hoeke; track h) {
          <span class="hoek" [class]="'hoek hoek--' + h" aria-hidden="true"><img src="straatfees/hoek.png" alt="" /></span>
        }
        <img class="blom blom--bo" src="straatfees/blom.png" alt="" aria-hidden="true" />
        <img class="blom blom--l" src="straatfees/blom.png" alt="" aria-hidden="true" />
        <img class="blom blom--r" src="straatfees/blom.png" alt="" aria-hidden="true" />

        <div class="teel__binne">
          <div class="teel__teks">
            <h1 class="titel">Straatfees</h1>

            <div class="slagspreuke" aria-live="polite">
              @for (s of skyfies; track s.beeld; let i = $index) {
                <p class="slagspreuk" [class.aktief]="i === skyfie()" [attr.aria-hidden]="i !== skyfie()">{{ s.teks }}</p>
              }
            </div>

            <div class="lint"><span>27-11-26</span></div>

            @if (gekanselleer()) {
              <p class="fees-alert" role="status">{{ 'Jou betaling is gekanselleer. Geen geld is afgetrek nie.' | t }}</p>
            }

            <div class="fees-hero__actions">
              @if (info(); as i) {
                @if (i.enabled) {
                  <button type="button" class="btn btn-primary btn-koop" (click)="openDialog()">
                    {{ 'Koop kaartjies' | t }}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                  <span class="prys">{{ prys() }} {{ 'per kaartjie' | t }}</span>
                } @else {
                  <p class="fees-alert">{{ 'Kaartjieverkope is tans gesluit.' | t }}</p>
                }
              }
            </div>
            <p class="kontant">Ook kontant by Orania Beweging</p>
          </div>

          <div class="teel__beeld">
            <div class="beelde">
              @for (s of skyfies; track s.beeld; let i = $index) {
                <img [src]="'straatfees/' + s.beeld + '.png'" [alt]="s.alt" [class.aktief]="i === skyfie()" [attr.aria-hidden]="i !== skyfie()" />
              }
            </div>
            <div class="kolle">
              @for (s of skyfies; track s.beeld; let i = $index) {
                <button type="button" [class.aktief]="i === skyfie()" (click)="kies(i)" [attr.aria-label]="s.alt" [attr.aria-pressed]="i === skyfie()"></button>
              }
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="fees-band verskyn">
      <div class="container fees-split">
        <div class="foto foto--staan" role="img" aria-label="Plekhouer vir foto">(foto hier)</div>
        <div>
          <h2>Ut enim ad minim veniam, quis nostrud.</h2>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium,
            totam rem aperiam, eaque ipsa quae ab illo inventore veritatis.
          </p>
        </div>
      </div>
    </section>

    <section class="container fees-section verskyn">
      <img class="skeier" src="straatfees/blom.png" alt="" aria-hidden="true" />
      <h2>Lorem ipsum dolor sit amet</h2>
      <div class="fees-cards">
        @for (kaart of kaarte; track kaart.titel) {
          <article class="fees-card">
            <div class="foto foto--kaart" role="img" aria-label="Plekhouer vir foto">(foto hier)</div>
            <h3>{{ kaart.titel }}</h3>
            <p>{{ kaart.teks }}</p>
          </article>
        }
      </div>
    </section>

    <section class="container fees-section verskyn">
      <img class="skeier" src="straatfees/blom.png" alt="" aria-hidden="true" />
      <h2>Neque porro quisquam est</h2>
      <div class="fees-galery">
        @for (n of galery; track n) {
          <div class="foto" [class]="'foto foto--g' + n" role="img" aria-label="Plekhouer vir foto">(foto hier)</div>
        }
      </div>
    </section>

    <section class="fees-slot verskyn">
      <div class="teel teel--klein">
        <span class="raam" aria-hidden="true"></span>
        @for (h of hoeke; track h) {
          <span class="hoek" [class]="'hoek hoek--' + h" aria-hidden="true"><img src="straatfees/hoek.png" alt="" /></span>
        }
        <div class="teel__slot">
          <h2>Lorem ipsum dolor sit amet?</h2>
          <p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.</p>
          <div class="lint lint--klein"><span>27-11-26</span></div>
          @if (info()?.enabled) {
            <button type="button" class="btn btn-primary btn-koop" (click)="openDialog()">{{ 'Koop kaartjies' | t }}</button>
          }
        </div>
      </div>
    </section>

    <dialog #dialog class="fees-dialog" (close)="fout.set(null)" [attr.aria-label]="'Koop kaartjies' | t">
      <form (ngSubmit)="koop()" class="fees-form" novalidate>
        <div class="fees-form__kop">
          <h2>{{ 'Koop kaartjies' | t }}</h2>
          <button type="button" class="sluit" (click)="dialog.close()" [attr.aria-label]="'Maak toe' | t">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="fees-form__uitleg">{{ 'Geen rekening nodig nie. Ons e-pos jou kaartjie sodra jy betaal het.' | t }}</p>

        <label for="fees-naam">{{ 'Naam en van' | t }}</label>
        <input id="fees-naam" name="naam" type="text" autocomplete="name" [(ngModel)]="naam" required maxlength="120" />

        <label for="fees-epos">{{ 'E-posadres' | t }}</label>
        <input id="fees-epos" name="epos" type="email" autocomplete="email" [(ngModel)]="epos" required />

        <label for="fees-aantal">{{ 'Aantal kaartjies' | t }}</label>
        <div class="stepper">
          <button type="button" (click)="stel(aantal() - 1)" [disabled]="aantal() <= 1" [attr.aria-label]="'Een minder' | t">−</button>
          <input id="fees-aantal" name="aantal" type="number" inputmode="numeric" min="1" [max]="maks()"
                 [ngModel]="aantal()" (ngModelChange)="stel($event)" />
          <button type="button" (click)="stel(aantal() + 1)" [disabled]="aantal() >= maks()" [attr.aria-label]="'Een meer' | t">+</button>
        </div>

        <div class="totaal">
          <span>{{ 'Totaal' | t }}</span>
          <strong class="tabular">{{ totaal() }}</strong>
        </div>

        @if (fout(); as f) {
          <p class="fees-fout" role="alert">{{ f | t }}</p>
        }

        <button type="submit" class="btn btn-primary btn-xl" [disabled]="besig()">
          {{ (besig() ? 'Gaan na PayFast...' : 'Betaal met PayFast') | t }}
        </button>
      </form>
    </dialog>
  `,
  styles: [`
    :host { display: block; }

    /* "(foto hier)" slots. Each has a fixed aspect ratio so the layout holds once real photos land. */
    .foto {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, #E9EEF8 0%, #DCE4F3 100%);
      box-shadow: inset 0 0 0 1px rgba(43, 76, 155, 0.08);
      color: color-mix(in srgb, var(--fees-blue) 55%, white);
      font-family: var(--font-body);
      font-size: 0.95rem;
      font-style: italic;
      letter-spacing: 0.02em;
      border-radius: 4px;
      width: 100%;
    }

    /* Sections ease in as they scroll into view. Browsers without scroll timelines just show them. */
    @supports (animation-timeline: view()) {
      @media (prefers-reduced-motion: no-preference) {
        .verskyn {
          animation: verskyn linear both;
          animation-timeline: view();
          animation-range: entry 0% entry 40%;
        }
      }
    }
    @keyframes verskyn {
      from { opacity: 0; transform: translateY(2rem); }
      to   { opacity: 1; transform: none; }
    }
    .foto--staan { aspect-ratio: 4 / 5; }
    .foto--kaart { aspect-ratio: 3 / 2; margin-bottom: 1rem; }

    :host {
      --serif: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
      font-variant-numeric: lining-nums;
      --delft: #2F4F8F;
      --hoek: clamp(4.5rem, 10vw, 8.5rem);
      --raam-inset: clamp(0.9rem, 2vw, 1.6rem);
    }

    /* ── Delft tile: the poster's frame. Thin rules, four ornamental corners, flowers on the rules. ── */
    .teel {
      position: relative;
      background: #fff;
      box-shadow: 0 1px 2px rgba(20, 35, 75, 0.05), 0 30px 70px -20px rgba(20, 35, 75, 0.18);
      isolation: isolate;
    }
    .raam { position: absolute; inset: var(--raam-inset); pointer-events: none; z-index: -1; }
    .raam::before, .raam::after { content: ''; position: absolute; inset: 0; }
    /* Top and bottom rules, faded out under the corner art; they draw outward from the middle. */
    .raam::before {
      border-block: 2px solid var(--delft);
      -webkit-mask-image: linear-gradient(90deg, transparent calc(var(--hoek) * 0.75), #000 calc(var(--hoek) * 0.95), #000 calc(100% - var(--hoek) * 0.95), transparent calc(100% - var(--hoek) * 0.75));
      mask-image: linear-gradient(90deg, transparent calc(var(--hoek) * 0.75), #000 calc(var(--hoek) * 0.95), #000 calc(100% - var(--hoek) * 0.95), transparent calc(100% - var(--hoek) * 0.75));
      animation: trek-x 1.4s cubic-bezier(0.65, 0, 0.35, 1) 0.2s both;
    }
    .raam::after {
      border-inline: 2px solid var(--delft);
      -webkit-mask-image: linear-gradient(180deg, transparent calc(var(--hoek) * 0.75), #000 calc(var(--hoek) * 0.95), #000 calc(100% - var(--hoek) * 0.95), transparent calc(100% - var(--hoek) * 0.75));
      mask-image: linear-gradient(180deg, transparent calc(var(--hoek) * 0.75), #000 calc(var(--hoek) * 0.95), #000 calc(100% - var(--hoek) * 0.95), transparent calc(100% - var(--hoek) * 0.75));
      animation: trek-y 1.4s cubic-bezier(0.65, 0, 0.35, 1) 0.35s both;
    }

    /* The span mirrors the art into its corner; the img inside does the moving, pivoting on the stem. */
    .hoek { position: absolute; width: var(--hoek); aspect-ratio: 1; pointer-events: none; }
    .hoek img { width: 100%; height: 100%; transform-origin: 10% 10%; animation: hoek-in 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) both, swaai 8s ease-in-out 1.6s infinite; }
    .hoek--lb { top: calc(var(--raam-inset) * 0.4); left: calc(var(--raam-inset) * 0.4); }
    .hoek--rb { top: calc(var(--raam-inset) * 0.4); right: calc(var(--raam-inset) * 0.4); transform: scaleX(-1); }
    .hoek--lo { bottom: calc(var(--raam-inset) * 0.4); left: calc(var(--raam-inset) * 0.4); transform: scaleY(-1); }
    .hoek--ro { bottom: calc(var(--raam-inset) * 0.4); right: calc(var(--raam-inset) * 0.4); transform: scale(-1); }
    .hoek--rb img { animation-delay: 0.12s, 1.9s; }
    .hoek--lo img { animation-delay: 0.24s, 2.2s; }
    .hoek--ro img { animation-delay: 0.36s, 2.5s; }

    /* Flowers sit on the rules; the white box behind each one breaks the line like on the poster. */
    .blom { position: absolute; width: clamp(7rem, 12vw, 10rem); aspect-ratio: 461 / 308; object-fit: cover; pointer-events: none; }
    .blom--bo { top: var(--raam-inset); left: 50%; translate: -50% -50%; height: 2.6rem; aspect-ratio: auto; background: #fff; padding-inline: 0.75rem; animation: blom-in 1s ease-out 0.9s both, bloei 6s ease-in-out 2s infinite; }
    .blom--l, .blom--r { top: 50%; width: 7rem; height: 2.4rem; aspect-ratio: auto; background: #fff; padding-inline: 0.5rem; animation: blom-in 1s ease-out 1.1s both; }
    .blom--l { left: var(--raam-inset); translate: -50% -50%; rotate: 90deg; }
    .blom--r { right: var(--raam-inset); translate: 50% -50%; rotate: -90deg; }

    /* ── Hero ── */
    .fees-hero { padding: clamp(1.5rem, 4vw, 3.5rem) clamp(0.75rem, 3vw, 2.5rem) clamp(2rem, 5vw, 4rem); max-width: 1320px; margin: 0 auto; }
    .teel__binne {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      gap: clamp(1rem, 3vw, 3rem);
      align-items: end;
      padding: clamp(4rem, 8vw, 6.5rem) clamp(2rem, 7vw, 6rem) clamp(3rem, 6vw, 5rem);
    }
    .teel__teks { text-align: center; display: flex; flex-direction: column; align-items: center; align-self: center; }

    .titel {
      position: relative;
      font-family: var(--serif);
      font-weight: 500;
      font-size: clamp(2.9rem, 7.5vw, 6.25rem);
      line-height: 1;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--delft);
      padding: 0.22em 0.1em 0.16em;
      margin-bottom: 1.5rem;
      animation: op 1.1s ease-out 0.5s both;
    }
    .titel::before, .titel::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--delft);
      transform-origin: center;
      animation: lyn 1.1s cubic-bezier(0.65, 0, 0.35, 1) 0.7s both;
    }
    .titel::before { top: 0; }
    .titel::after { bottom: 0; }

    /* The four poster lines, one per illustration, crossfading together. */
    .slagspreuke { display: grid; margin-bottom: 1.75rem; max-width: 30rem; }
    .slagspreuk {
      grid-area: 1 / 1;
      font-family: var(--serif);
      font-style: italic;
      font-weight: 500;
      font-size: clamp(1.45rem, 2.8vw, 2.15rem);
      line-height: 1.2;
      color: #3B5A9A;
      opacity: 0;
      translate: 0 0.6rem;
      transition: opacity 0.9s ease, translate 0.9s ease;
    }
    .slagspreuk.aktief { opacity: 1; translate: 0 0; }

    /* Date ribbon from the poster, with a light sweep clipped to its shape. */
    .lint {
      position: relative;
      display: grid;
      place-items: center;
      width: min(100%, 21rem);
      aspect-ratio: 2177 / 406;
      background: url('/straatfees/lint.png') center / 100% 100% no-repeat;
      margin-bottom: 1.75rem;
      filter: drop-shadow(0 8px 14px rgba(15, 80, 160, 0.22));
      animation: op 0.9s ease-out 1s both;
    }
    .lint span { font-family: var(--serif); font-weight: 600; font-size: clamp(1.7rem, 3.4vw, 2.4rem); color: #fff; letter-spacing: 0.04em; text-shadow: 0 1px 3px rgba(0, 40, 90, 0.35); }
    .lint::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.55) 50%, transparent 65%) 0 0 / 250% 100% no-repeat;
      -webkit-mask: url('/straatfees/lint.png') center / 100% 100% no-repeat;
      mask: url('/straatfees/lint.png') center / 100% 100% no-repeat;
      animation: glans 5s ease-in-out 2s infinite;
    }
    .lint--klein { width: min(100%, 15rem); }

    .fees-hero__actions { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.75rem 1.25rem; }
    .btn-koop { font-size: var(--fs-xl); padding: 0.9rem 2rem; min-height: var(--tap-large); box-shadow: 0 10px 24px -8px rgba(43, 76, 155, 0.55); transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.2s ease; }
    .btn-koop:hover { transform: translateY(-2px); box-shadow: 0 16px 30px -10px rgba(43, 76, 155, 0.6); }
    .btn-koop svg { transition: translate 0.25s ease; }
    .btn-koop:hover svg { translate: 3px 0; }
    .prys { font-family: var(--serif); font-style: italic; font-size: var(--fs-xl); font-weight: 600; color: var(--delft); }
    .kontant { margin-top: 1rem; font-family: var(--serif); font-style: italic; font-size: var(--fs-lg); color: var(--text-muted); }
    .fees-alert {
      background: var(--fees-blue-soft);
      border-left: 4px solid var(--fees-blue);
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      max-width: 30rem;
      text-align: left;
    }

    .teel__beeld { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .beelde { position: relative; width: 100%; aspect-ratio: 653 / 820; animation: dryf 7s ease-in-out infinite; }
    .beelde img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center bottom;
      opacity: 0;
      scale: 0.96;
      transition: opacity 1.1s ease, scale 1.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .beelde img.aktief { opacity: 1; scale: 1; }
    .kolle { display: flex; gap: 0.6rem; }
    .kolle button { width: 0.6rem; height: 0.6rem; min-height: 0; padding: 0; border-radius: 50%; background: color-mix(in srgb, var(--delft) 25%, white); transition: background-color 0.3s ease, scale 0.3s ease; }
    .kolle button.aktief { background: var(--delft); scale: 1.3; }
    .kolle button::after { content: ''; position: absolute; inset: -0.75rem; }
    .kolle button { position: relative; }

    /* ── Body sections ── */
    .skeier { display: block; width: 9rem; height: 2.5rem; object-fit: cover; margin: 0 auto 0.75rem; }
    .fees-band { background: #fff; padding: clamp(3.5rem, 8vw, 7rem) 0; }
    .fees-split { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: clamp(1.5rem, 4vw, 4rem); align-items: center; }
    .fees-split h2, .fees-section h2, .teel__slot h2 { font-family: var(--serif); font-weight: 500; color: var(--delft); text-transform: none; letter-spacing: 0; font-size: clamp(2.2rem, 4.5vw, 3.1rem); line-height: 1.1; margin-bottom: 1rem; }
    .fees-split p + p { margin-top: 1rem; }

    .fees-section { padding-top: clamp(3.5rem, 8vw, 7rem); padding-bottom: 0; }
    .fees-section > h2 { text-align: center; }
    .fees-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; margin-top: 2.5rem; }
    .fees-card { background: #fff; border-radius: 4px; padding: 0.75rem 0.75rem 1.75rem; box-shadow: 0 1px 2px rgba(20, 35, 75, 0.04), 0 12px 32px rgba(20, 35, 75, 0.07); transition: transform 0.35s ease, box-shadow 0.35s ease; }
    .fees-card:hover { transform: translateY(-4px); box-shadow: 0 1px 2px rgba(20, 35, 75, 0.04), 0 20px 44px rgba(20, 35, 75, 0.12); }
    .fees-card h3, .fees-card p { padding-inline: 0.5rem; }
    .fees-card h3 { font-family: var(--serif); font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--delft); font-size: 1.65rem; margin-bottom: 0.3rem; }
    .fees-card p { color: var(--text-muted); font-size: var(--fs-sm); }

    /* Mixed sizes on purpose: the real set will be a mix of landscape and portrait shots. */
    .fees-galery {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-auto-rows: clamp(9rem, 16vw, 13rem);
      grid-auto-flow: dense;
      gap: 0.75rem;
      margin-top: 2.5rem;
    }
    .foto--g1 { grid-column: span 2; grid-row: span 2; }
    .foto--g4 { grid-row: span 2; }
    .foto--g6 { grid-column: span 2; }

    /* Closing tile, a smaller echo of the hero. */
    .fees-slot { padding: clamp(3.5rem, 8vw, 7rem) clamp(0.75rem, 3vw, 2.5rem); max-width: 900px; margin: 0 auto; }
    .teel--klein { --hoek: clamp(4rem, 9vw, 6.5rem); }
    .teel__slot { text-align: center; display: flex; flex-direction: column; align-items: center; padding: clamp(3.5rem, 8vw, 5rem) clamp(2rem, 8vw, 5rem); }
    .teel__slot p { color: var(--text-muted); max-width: 30rem; margin-bottom: 1.5rem; }

    @keyframes op { from { opacity: 0; translate: 0 0.75rem; } to { opacity: 1; translate: 0 0; } }
    @keyframes lyn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes trek-x { from { clip-path: inset(0 50%); } to { clip-path: inset(0 0); } }
    @keyframes trek-y { from { clip-path: inset(50% 0); } to { clip-path: inset(0 0); } }
    @keyframes hoek-in { from { opacity: 0; transform: rotate(-14deg) scale(0.8); } to { opacity: 1; transform: none; } }
    @keyframes swaai { 0%, 100% { transform: none; } 50% { transform: rotate(2deg); } }
    @keyframes blom-in { from { opacity: 0; scale: 0.7; } to { opacity: 1; scale: 1; } }
    @keyframes bloei { 0%, 100% { scale: 1; } 50% { scale: 1.06; } }
    @keyframes glans { 0% { background-position: 150% 0; } 45%, 100% { background-position: -60% 0; } }
    @keyframes dryf { 0%, 100% { translate: 0 0; } 50% { translate: 0 -8px; } }

    @media (prefers-reduced-motion: reduce) {
      .raam::before, .raam::after, .hoek img, .blom, .titel, .titel::before, .titel::after, .lint, .lint::after, .beelde { animation: none !important; }
      .slagspreuk, .beelde img { transition: none; }
    }

    .fees-dialog {
      border: none;
      border-radius: var(--radius-lg);
      padding: 0;
      width: min(28rem, calc(100vw - 2rem));
      margin: auto;
      box-shadow: 0 24px 60px rgba(20, 30, 60, 0.3);
    }
    .fees-dialog::backdrop { background: rgba(15, 25, 50, 0.55); }
    .fees-form { display: flex; flex-direction: column; padding: 1.5rem; }
    .fees-form__kop { display: flex; align-items: center; justify-content: space-between; border-top: 4px solid var(--fees-blue); margin: -1.5rem -1.5rem 0.75rem; padding: 1.25rem 1.5rem 0; }
    .fees-form__kop h2 { font-size: var(--fs-2xl); }
    .sluit { background: none; padding: 0.25rem; min-height: auto; color: var(--text-muted); }
    .sluit:hover { color: var(--ink); }
    .fees-form__uitleg { color: var(--text-muted); font-size: var(--fs-sm); margin-bottom: 1.25rem; }
    .fees-form label { font-weight: 600; margin-bottom: 0.35rem; }
    .fees-form input { margin-bottom: 1rem; width: 100%; }
    .stepper { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .stepper input { margin: 0; text-align: center; font-weight: 700; font-size: var(--fs-lg); -moz-appearance: textfield; }
    .stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .stepper button { background: var(--fees-blue-soft); color: var(--fees-blue); font-size: 1.5rem; padding: 0 1.1rem; flex-shrink: 0; }
    .stepper button:hover:not(:disabled) { background: color-mix(in srgb, var(--fees-blue) 18%, white); }
    .totaal { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--border-soft); padding: 0.85rem 0 1.1rem; font-size: var(--fs-lg); }
    .totaal strong { font-family: var(--font-display); font-size: var(--fs-2xl); color: var(--fees-blue); }
    .fees-fout { color: #B3261E; font-size: var(--fs-sm); margin-bottom: 0.85rem; }

    @media (max-width: 860px) {
      .teel__binne, .fees-split { grid-template-columns: 1fr; }
      .teel__binne { padding-inline: 1.75rem; }
      .beelde { width: min(100%, 17rem); }
      .blom--l, .blom--r { display: none; }
      .titel { font-size: clamp(2.2rem, 11.5vw, 2.9rem); }
      .beelde { width: min(100%, 14rem); }
      .fees-cards { grid-template-columns: 1fr; }
      .fees-galery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .foto--g1, .foto--g6 { grid-column: span 2; }
    }
  `]
})
export class StraatfeesComponent implements OnInit {
  private service = inject(StraatfeesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  info = signal<StraatfeesInfo | null>(null);
  gekanselleer = signal(false);

  naam = '';
  epos = '';
  aantal = signal(1);
  besig = signal(false);
  fout = signal<string | null>(null);

  maks = computed(() => this.info()?.maxPerOrder ?? 20);
  prys = computed(() => randBedrag(this.info()?.ticketPrice ?? 0));
  totaal = computed(() => randBedrag((this.info()?.ticketPrice ?? 0) * this.aantal()));

  readonly kaarte = [
    { titel: 'Lorem ipsum', teks: 'Dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.' },
    { titel: 'Dolor sit', teks: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.' },
    { titel: 'Amet consectetur', teks: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.' },
  ];
  readonly galery = [1, 2, 3, 4, 5, 6, 7];
  readonly hoeke = ['lb', 'rb', 'lo', 'ro'];

  /** The four posters: each line goes with its illustration. */
  readonly skyfies = [
    { teks: "2026 was 'n goeie jaar! Kom ons vier dit SAAM.", beeld: 'beeld-vlegsel', alt: 'Delfsblou beeldhouwerk' },
    { teks: 'Kom ons vier groot Orania mylpale saam!', beeld: 'beeld-kruger', alt: 'Delfsblou standbeeld van Paul Kruger' },
    { teks: 'Ons bou die pad na vryheid! Kom ons vier dit!', beeld: 'beeld-kleinjan', alt: 'Delfsblou Kleinjan-standbeeld' },
    { teks: 'Ons nooi elke Oraniër na ons grootste Straatfees!', beeld: 'vlag', alt: 'Delfsblou Orania-vlag' },
  ];
  skyfie = signal(0);
  private skyfieTimer?: ReturnType<typeof setInterval>;

  /** Set by the navbar's "Koop kaartjies" (?koop=1); honoured once the sale is known to be open. */
  private wilKoop = signal(false);

  constructor() {
    this.begin();
    inject(DestroyRef).onDestroy(() => clearInterval(this.skyfieTimer));

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(q => {
      if (q.has('koop')) this.wilKoop.set(true);
    });

    effect(() => {
      if (!this.wilKoop() || !this.info()) return;
      untracked(() => {
        this.wilKoop.set(false);
        if (this.info()!.enabled) this.openDialog();
        this.router.navigate([], { queryParams: { koop: null }, queryParamsHandling: 'merge', replaceUrl: true });
      });
    });
  }

  ngOnInit() {
    this.gekanselleer.set(this.route.snapshot.queryParamMap.has('gekanselleer'));
    this.service.info().subscribe({ next: i => this.info.set(i) });
  }

  /** Pick a poster; restarts the timer so it does not flip straight away. */
  kies(i: number) {
    this.skyfie.set(i);
    this.begin();
  }

  /** Rotates the posters every few seconds, unless the visitor asked for reduced motion. */
  private begin() {
    clearInterval(this.skyfieTimer);
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.skyfieTimer = setInterval(() => this.skyfie.update(i => (i + 1) % this.skyfies.length), 5500);
  }

  openDialog() {
    this.fout.set(null);
    const el = this.dialog().nativeElement;
    if (!el.open) el.showModal();
  }

  stel(value: number | string) {
    const n = Math.floor(Number(value));
    this.aantal.set(Number.isFinite(n) ? Math.min(this.maks(), Math.max(1, n)) : 1);
  }

  koop() {
    if (this.naam.trim().length < 2) return this.fout.set('Vul asseblief jou naam in.');
    const eposFout = validateEmail(this.epos);
    if (eposFout) return this.fout.set(eposFout);

    this.fout.set(null);
    this.besig.set(true);
    this.service.order(this.naam.trim(), this.epos.trim(), this.aantal()).subscribe({
      next: form => postToPayFast(form),
      error: err => {
        this.besig.set(false);
        this.fout.set(err.error?.message || 'Kon nie PayFast betaling voorberei nie.');
      }
    });
  }
}
