import { Component, DestroyRef, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StraatfeesService, StraatfeesTicket, toegang } from '../../services/straatfees.service';
import { randBedrag } from '../../utils/afrikaans.util';
import { TPipe } from '../../i18n/t.pipe';

/** How long to wait for PayFast's ITN after the buyer lands back here before giving up politely. */
const POLL_MS = 3000;
const POLL_TRIES = 40;

/**
 * Where PayFast returns the buyer, and where the emailed link points. The ticket code in the URL
 * is the only key. The ticket carries the same arrangements as the emailed one.
 */
@Component({
  selector: 'app-straatfees-kaartjie',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <section class="container-narrow kaartjie-blad">
      @switch (staat()) {
        @case ('laai') {
          <p class="muted">{{ 'Laai jou kaartjie...' | t }}</p>
        }
        @case ('wag') {
          <div class="wag" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <h1>{{ 'Ons bevestig jou betaling...' | t }}</h1>
            <p class="muted">{{ 'Dit neem gewoonlik net ’n paar sekondes. Jou kaartjie verskyn hier sodra PayFast bevestig.' | t }}</p>
          </div>
        }
        @case ('stadig') {
          <div class="wag">
            <h1>{{ 'Ons wag nog vir PayFast' | t }}</h1>
            <p class="muted">{{ 'Jou kaartjie word na jou e-pos gestuur sodra die betaling deurkom. Jy kan ook later hierdie bladsy herlaai.' | t }}</p>
          </div>
        }
        @case ('fout') {
          <div class="wag">
            <h1>{{ 'Kaartjie nie gevind nie' | t }}</h1>
            <p class="muted">{{ 'Kontroleer die skakel in jou e-pos.' | t }}</p>
            <a routerLink="/straatfees" class="btn btn-primary">{{ 'Terug na die straatfees' | t }}</a>
          </div>
        }
        @case ('gereed') {
          @if (kaartjie(); as k) {
            <h1>{{ 'Jou kaartjie is gereed!' | t }}</h1>
            <p class="muted">{{ 'Ons het dit ook na jou e-pos gestuur. Wys dit by die hek, op jou foon of gedruk.' | t }}</p>

            <div class="kaartjie" #kaartjieEl>
              <div class="kaartjie__kuns">
                <img class="kaartjie__hoek kaartjie__hoek--bo" src="straatfees/hoek.png" alt="" />
                <img class="kaartjie__hoek kaartjie__hoek--onder" src="straatfees/hoek.png" alt="" />
                <span class="kaartjie__merk">ORANIA</span>
                <span class="kaartjie__titel">STRAATFEES</span>
                <span class="kaartjie__lint"><img src="straatfees/lint.png" alt="" /><span>27-11-26</span></span>
                <span class="kaartjie__waar">18:30 &middot; Diamantlaan (by Heuwelsig)</span>
              </div>
              <div class="kaartjie__inhoud">
                <span class="etiket">Naam</span>
                <span class="waarde">{{ k.name }}</span>
                <span class="etiket">Toegang vir</span>
                <span class="waarde">{{ toegang(k.adults, k.children) }}</span>
                <span class="etiket">Kode</span>
                <span class="kode">{{ k.ticketCode }}</span>
              </div>
              <div class="kaartjie__reels">
                <p class="kaartjie__wit">Trek <strong>wit</strong> aan en vleg ’n blommekransie vir jou kop!</p>
                <span class="etiket">Reëlings</span>
                <ul>
                  <li>Bring ’n eenvoudige bykos uit jou kombuis / tuin vir die <strong>gemeenskaplike tafel.</strong></li>
                  <li>Bring <strong>vleis en eetgerei</strong> wat jy by jou tafel hou.</li>
                  <li>Wyne te koop: fondse vir die Padboufonds. Ondersteun asb!</li>
                  <li><strong>Parkeer</strong> by die rugbyveld.</li>
                </ul>
                <span class="kaartjie__voet">Navrae: Orania Beweging 053 2070 062</span>
              </div>
            </div>

            <div class="aksies">
              <button type="button" class="btn btn-primary" (click)="laaiAf()" [disabled]="besig()">
                {{ (besig() ? 'Berei PDF voor...' : 'Laai kaartjie af (PDF)') | t }}
              </button>
              <span class="muted">{{ toegang(k.adults, k.children) }} &middot; {{ bedrag(k.amount) }}</span>
            </div>
          }
        }
      }
    </section>
  `,
  styles: [`
    .kaartjie-blad { padding-top: clamp(2rem, 6vw, 4rem); padding-bottom: clamp(3rem, 8vw, 6rem); }
    h1 { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-weight: 600; text-transform: none; letter-spacing: 0; color: #2F4F8F; font-size: clamp(2.2rem, 5vw, 3.2rem); margin-bottom: 0.5rem; }
    .muted { color: var(--text-muted); }
    .wag { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    .spinner {
      width: 2.5rem; height: 2.5rem;
      border: 4px solid var(--fees-blue-soft);
      border-top-color: var(--fees-blue);
      border-radius: 50%;
      animation: draai 0.9s linear infinite;
    }
    @keyframes draai { to { transform: rotate(360deg); } }

    /* Fixed pixel layout: this exact box is what html2canvas draws into the PDF. */
    .kaartjie {
      display: grid;
      grid-template-columns: 220px 1fr;
      width: 100%;
      max-width: 680px;
      margin: 1.75rem 0;
      background: #fff;
      border: 2px solid #2F4F8F;
      border-radius: 6px;
      overflow: hidden;
      font-family: var(--font-body);
    }
    /* Poster motifs, kept to plain images and borders so html2canvas draws them faithfully. */
    .kaartjie__kuns {
      position: relative;
      overflow: hidden;
      background: #fff;
      color: #2F4F8F;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.25rem 1rem;
      border-right: 2px dashed #2F4F8F;
      text-align: center;
    }
    .kaartjie__hoek { position: absolute; width: 64px; height: 64px; }
    .kaartjie__hoek--bo { top: 6px; left: 6px; }
    .kaartjie__hoek--onder { bottom: 6px; right: 6px; transform: scale(-1); }
    .kaartjie__merk { font-family: 'Cormorant Garamond', 'Times New Roman', serif; letter-spacing: 0.35em; font-size: 0.85rem; font-weight: 600; }
    .kaartjie__titel {
      font-family: 'Cormorant Garamond', 'Times New Roman', serif;
      font-weight: 600;
      font-size: 1.65rem;
      letter-spacing: 0.04em;
      line-height: 1;
      padding: 0.3rem 0.2rem;
      margin: 0.25rem 0 0.75rem;
      border-block: 2px solid #2F4F8F;
    }
    .kaartjie__lint { position: relative; width: 150px; height: 28px; display: block; }
    .kaartjie__lint img { position: absolute; inset: 0; width: 100%; height: 100%; }
    .kaartjie__lint span { position: relative; display: block; line-height: 28px; font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-weight: 600; font-size: 1.15rem; color: #fff; font-variant-numeric: lining-nums; }
    .kaartjie__inhoud { display: flex; flex-direction: column; padding: 1.25rem 1.5rem; min-width: 0; }
    .etiket { font-family: var(--font-display); font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
    .waarde { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--ink); margin-bottom: 0.5rem; overflow-wrap: anywhere; }
    .kode { font-family: 'Courier New', monospace; font-size: 1.6rem; font-weight: 700; letter-spacing: 0.15em; color: var(--fees-blue); }
    .kaartjie__waar { margin-top: 0.6rem; font-size: 0.85rem; line-height: 1.3; }
    .kaartjie__reels { grid-column: 1 / -1; border-top: 2px dashed #2F4F8F; padding: 1rem 1.5rem 1.1rem; font-size: 0.9rem; line-height: 1.45; }
    .kaartjie__wit { color: #2F4F8F; margin-bottom: 0.6rem; }
    .kaartjie__reels ul { margin: 0.25rem 0 0.6rem; padding-left: 1.1rem; }
    .kaartjie__reels li + li { margin-top: 0.15rem; }
    .kaartjie__voet { font-size: 0.8rem; color: var(--text-muted); }

    .aksies { display: flex; align-items: center; flex-wrap: wrap; gap: 1rem; }

    @media (max-width: 560px) {
      .kaartjie { grid-template-columns: 1fr; }
      .kaartjie__kuns { border-right: none; border-bottom: 2px dashed #2F4F8F; }
    }
  `]
})
export class StraatfeesKaartjieComponent implements OnInit {
  private service = inject(StraatfeesService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private kaartjieEl = viewChild<ElementRef<HTMLElement>>('kaartjieEl');

  staat = signal<'laai' | 'wag' | 'stadig' | 'fout' | 'gereed'>('laai');
  kaartjie = signal<StraatfeesTicket | null>(null);
  besig = signal(false);

  private kode = '';
  private pogings = 0;
  private timer?: ReturnType<typeof setTimeout>;

  bedrag = randBedrag;
  toegang = toegang;

  ngOnInit() {
    this.kode = this.route.snapshot.paramMap.get('kode') ?? '';
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
    this.haal();
  }

  private haal() {
    this.service.ticket(this.kode).subscribe({
      next: k => {
        this.kaartjie.set(k);
        if (k.status === 'Confirmed') {
          this.staat.set('gereed');
        } else if (k.status === 'Pending' && ++this.pogings < POLL_TRIES) {
          this.staat.set('wag');
          this.timer = setTimeout(() => this.haal(), POLL_MS);
        } else if (k.status === 'Pending') {
          this.staat.set('stadig');
        } else {
          this.staat.set('fout');
        }
      },
      error: () => this.staat.set('fout')
    });
  }

  async laaiAf() {
    const el = this.kaartjieEl()?.nativeElement;
    const k = this.kaartjie();
    if (!el || !k) return;

    this.besig.set(true);
    try {
      await document.fonts.ready;
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#ffffff' });
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const pdf = new jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
      pdf.save(`straatfees-kaartjie-${k.ticketCode}.pdf`);
    } finally {
      this.besig.set(false);
    }
  }
}
