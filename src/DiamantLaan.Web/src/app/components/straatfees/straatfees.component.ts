import { Component, DestroyRef, OnInit, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { StraatfeesInfo, StraatfeesService } from '../../services/straatfees.service';
import { randBedrag } from '../../utils/afrikaans.util';
import { TPipe } from '../../i18n/t.pipe';
import { FeesKoopDialogComponent } from './fees-koop-dialog.component';
import { FeesLintComponent } from './fees-lint.component';
import { FeesTeelComponent } from './fees-teel.component';

/**
 * Straatfees landing page. The hero carries the Delft-blue poster artwork and lines; the rest is
 * the organisers' copy and photos from a previous straatfees. The only live part is the ticket
 * purchase: one button, one dialog (FeesKoopDialogComponent), then PayFast.
 */
@Component({
  selector: 'app-straatfees',
  standalone: true,
  imports: [TPipe, FeesTeelComponent, FeesLintComponent, FeesKoopDialogComponent],
  template: `
    <section class="fees-hero">
      <app-fees-teel [blomme]="true">

        <div class="teel__binne">
          <div class="teel__teks">
            <h1 class="titel">Straatfees</h1>

            <div class="slagspreuke" aria-live="polite">
              @for (s of skyfies; track s.beeld; let i = $index) {
                <p class="slagspreuk" [class.aktief]="i === skyfie()" [attr.aria-hidden]="i !== skyfie()">{{ s.teks }}</p>
              }
            </div>

            <app-fees-lint class="lint-plek">27-11-26</app-fees-lint>

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
                  <span class="prys">{{ prys(i.adultPrice) }} {{ 'per volwassene' | t }} &middot; {{ prys(i.childPrice) }} {{ 'per kind' | t }}</span>
                } @else {
                  <p class="fees-alert">{{ 'Kaartjieverkope is tans gesluit.' | t }}</p>
                }
              }
            </div>
            <p class="kontant">Kaartjies ook vir kontant by die Orania Beweging beskikbaar</p>
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
      </app-fees-teel>
    </section>

    <section class="fees-band verskyn">
      <div class="container fees-split">
        <img class="foto foto--staan" [src]="foto('kransie', 1600)" [srcset]="srcset('kransie')" sizes="(max-width: 860px) 100vw, 40vw"
             alt="Feesganger in wit met ’n blommekransie" loading="lazy" style="object-position: 57% 30%" />
        <div>
          <h2>Tuin-tot-Tafel</h2>
          <p>
            Die Tuin-tot-Tafel Straatfees is gebaseer op die gedagte dat die gemeenskap hul oeste met mekaar deel.
            Dis ’n kuierfees, so bring ’n dankbaarheidsgees! Hierdie jaar vier ons ook die nuwe pad, wat die
            Orania-gemeenskap saam bou. Wat ’n voorreg om saam die pad na vryheid te kan bou!
          </p>
        </div>
      </div>
    </section>

    <section class="container fees-section verskyn">
      <img class="skeier" src="straatfees/blom.png" alt="" aria-hidden="true" />
      <h2>Waar, wanneer en wat bring ek?</h2>
      <div class="fees-cards">
        @for (kaart of kaarte; track kaart.titel) {
          <article class="fees-card">
            <img class="foto foto--kaart" [src]="foto(kaart.foto, 800)" [srcset]="srcset(kaart.foto)" sizes="(max-width: 860px) 100vw, 33vw"
                 [alt]="kaart.alt" loading="lazy" />
            <h3>{{ kaart.titel }}</h3>
            <p>{{ kaart.teks }}</p>
          </article>
        }
      </div>
    </section>

    <section class="fees-band fees-band--prys verskyn">
      <div class="container fees-split fees-split--om">
        <div>
          <h2>Wat kos dit en wat kry ek?</h2>
          <div class="pryse">
            <div><strong>R70</strong><span>vir volwassenes</span></div>
            <div><strong>R10</strong><span>vir kinders</span></div>
          </div>
          <p>
            Dit sluit ’n glasie vonkelwyn, ’n klein soetdingetjie, die mooiste dekor en ’n heerlike saamkuier in.
            Bring <strong>kontant vir ’n bottel wyn</strong> (ten bate van die Padboufonds!).
          </p>
        </div>
        <img class="foto foto--staan" [src]="foto('boog', 1600)" [srcset]="srcset('boog')" sizes="(max-width: 860px) 100vw, 40vw"
             alt="Gaste in wit by die blommeboog" loading="lazy" style="object-position: 38% 50%" />
      </div>
    </section>

    <section class="container fees-section verskyn">
      <img class="skeier" src="straatfees/blom.png" alt="" aria-hidden="true" />
      <div class="fees-galery">
        @for (g of galery; track g.foto) {
          <img [class]="'foto ' + (g.vorm ? 'foto--' + g.vorm : '')" [src]="foto(g.foto, 800)" [srcset]="srcset(g.foto)"
               [attr.sizes]="g.vorm === 'breed' ? '(max-width: 860px) 100vw, 50vw' : '(max-width: 860px) 50vw, 25vw'"
               [alt]="g.alt" loading="lazy" />
        }
      </div>
    </section>

    <section class="fees-slot verskyn">
      <app-fees-teel [klein]="true">
        <div class="teel__slot">
          <h2>Straatfees</h2>
          <app-fees-lint class="lint-plek" [klein]="true">27-11-26</app-fees-lint>
          <p>Kaartjies te koop by Orania Beweging (kontant) of by bou.orania.co.za.</p>
          @if (info()?.enabled) {
            <button type="button" class="btn btn-primary btn-koop" (click)="openDialog()">{{ 'Koop kaartjies' | t }}</button>
          }
          <p class="navrae">Navrae: Orania Beweging (<a href="tel:+27532070062">053 2070 062</a>)</p>
        </div>
      </app-fees-teel>
    </section>

    <app-fees-koop-dialog [info]="info()" />
  `,
  styles: [`
    :host { display: block; }

    /* Photos fill fixed-ratio frames, so the layout holds while they load. */
    .foto { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 4px; background: #DCE4F3; }

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
    .foto--staan { aspect-ratio: 4 / 5; height: auto; }
    .foto--kaart { aspect-ratio: 3 / 2; height: auto; margin-bottom: 1rem; }

    :host {
      --serif: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
      font-variant-numeric: lining-nums;
      --delft: #2F4F8F;
    }

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

    .lint-plek { margin-bottom: 1.75rem; }

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
    .fees-split p { font-size: var(--fs-lg); line-height: 1.65; }
    .fees-band--prys { background: transparent; }
    .fees-split--om { grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr); }
    .pryse { display: flex; gap: clamp(1.5rem, 4vw, 3rem); margin: 0.5rem 0 1.5rem; }
    .pryse div { display: flex; flex-direction: column; }
    .pryse strong { font-family: var(--serif); font-weight: 600; font-size: clamp(2.6rem, 6vw, 3.6rem); line-height: 1; color: var(--delft); }
    .pryse span { font-family: var(--serif); font-style: italic; font-size: var(--fs-lg); color: var(--text-muted); }

    .fees-section { padding-top: clamp(3.5rem, 8vw, 7rem); padding-bottom: 0; }
    .fees-section > h2 { text-align: center; }
    .fees-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; margin-top: 2.5rem; }
    .fees-card { background: #fff; border-radius: 4px; padding: 0.75rem 0.75rem 1.75rem; box-shadow: 0 1px 2px rgba(20, 35, 75, 0.04), 0 12px 32px rgba(20, 35, 75, 0.07); transition: transform 0.35s ease, box-shadow 0.35s ease; }
    .fees-card:hover { transform: translateY(-4px); box-shadow: 0 1px 2px rgba(20, 35, 75, 0.04), 0 20px 44px rgba(20, 35, 75, 0.12); }
    .fees-card h3, .fees-card p { padding-inline: 0.5rem; }
    .fees-card h3 { font-family: var(--serif); font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--delft); font-size: 1.65rem; margin-bottom: 0.3rem; }
    .fees-card p { color: var(--text-muted); font-size: var(--fs-sm); }

    .fees-galery {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-auto-rows: clamp(10rem, 19vw, 16rem);
      gap: 0.75rem;
      margin-top: 2.5rem;
    }
    .foto--breed { grid-column: span 2; }

    /* Closing tile, a smaller echo of the hero. */
    .fees-slot { padding: clamp(3.5rem, 8vw, 7rem) clamp(0.75rem, 3vw, 2.5rem); max-width: 900px; margin: 0 auto; }
    .teel__slot { text-align: center; display: flex; flex-direction: column; align-items: center; padding: clamp(3.5rem, 8vw, 5rem) clamp(2rem, 8vw, 5rem); }
    .teel__slot p { color: var(--text-muted); max-width: 30rem; margin-bottom: 1.5rem; }
    .teel__slot .navrae { margin: 1.5rem 0 0; font-size: var(--fs-sm); }
    .navrae a { color: inherit; }

    @keyframes op { from { opacity: 0; translate: 0 0.75rem; } to { opacity: 1; translate: 0 0; } }
    @keyframes lyn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes dryf { 0%, 100% { translate: 0 0; } 50% { translate: 0 -8px; } }

    @media (prefers-reduced-motion: reduce) {
      .titel, .titel::before, .titel::after, .beelde { animation: none !important; }
      .slagspreuk, .beelde img { transition: none; }
    }

    @media (max-width: 860px) {
      .teel__binne, .fees-split, .fees-split--om { grid-template-columns: 1fr; }
      .fees-split--om .foto { order: -1; }
      .teel__binne { padding-inline: 1.75rem; }
      .titel { font-size: clamp(2.2rem, 11.5vw, 2.9rem); }
      .beelde { width: min(100%, 14rem); }
      .fees-cards { grid-template-columns: 1fr; }
      .fees-galery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `]
})
export class StraatfeesComponent implements OnInit {
  private service = inject(StraatfeesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private koopDialog = viewChild.required(FeesKoopDialogComponent);

  info = signal<StraatfeesInfo | null>(null);
  gekanselleer = signal(false);

  prys = randBedrag;

  readonly kaarte = [
    {
      titel: 'Waar en wanneer', foto: 'wit-straat', alt: 'Feesgangers in wit op Diamantlaan',
      teks: '27-11-26, 18:30. Diamantlaan (by Heuwelsig). Parkeer by die Sportgronde.',
    },
    {
      titel: 'Trek wit aan', foto: 'kransies', alt: 'Feesgangers vleg blommekransies',
      teks: 'Trek wit klere aan en vleg ’n blommekransie vir jou kop.',
    },
    {
      titel: 'Wat bring ek?', foto: 'bykos-tafel', alt: 'Die gemeenskaplike bykostafel',
      teks: 'Bring die mooiste van jou oes of uit jou kombuis vir die gemeenskaplike bykostafel. '
        + 'Bring ’n vleisgereg en eetgerei wat jy by jou tafel vir jou gesin hou.',
    },
  ];

  /**
   * Daylight first, sparklers last: the gallery follows the evening from light to dark.
   * breed spans two columns; two rows of four cells, so the grid closes on desktop and on phones.
   */
  readonly galery: { foto: string; alt: string; vorm?: 'breed' }[] = [
    { foto: 'wit-gaste', alt: 'Gaste in wit kuier op straat', vorm: 'breed' },
    { foto: 'bykos-skep', alt: 'Gaste skep by die bykostafel' },
    { foto: 'wit-vlae', alt: 'Vlaggies oor die straat' },
    { foto: 'bykos-skemer', alt: 'Die bykostafel teen skemer' },
    { foto: 'skemer-ligte', alt: 'Liggies oor die straat teen skemer' },
    { foto: 'sterretjies-1', alt: 'Sterretjies in die aand', vorm: 'breed' },
  ];

  foto = (naam: string, w: 800 | 1600) => `straatfees/fotos/${naam}-${w}.webp`;
  srcset = (naam: string) => `straatfees/fotos/${naam}-800.webp 800w, straatfees/fotos/${naam}-1600.webp 1600w`;

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
    this.koopDialog().open();
  }
}
