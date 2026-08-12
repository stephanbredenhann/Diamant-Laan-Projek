import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-vrae',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">Vrae · Diamantlaan-teerprojek</p>
        <h1 class="display page-hero-title">Antwoorde vóór die besluit, nie ná die betaling nie.</h1>
        <p class="page-hero-body">
          Duidelike antwoorde oor koste, eienaarskap, betaling, erkenning en projekbeleid verwyder
          onsekerheid voordat iemand begin bou.
        </p>
      </div>
    </section>

    <section class="section chalk">
      <div class="container container-narrow">
        <p class="eyebrow">Gereelde vrae</p>
        <h2 class="display section-title">Wat mense die meeste wil weet.</h2>

        <div class="faq-list">
          @for (item of faqs; track item.question) {
            <details class="faq-item surface-card">
              <summary>{{ item.question }}</summary>
              <p>{{ item.answer }}</p>
            </details>
          }
        </div>

        <div class="vra-ons surface-card">
          <h3 class="display">Het jy enige ander vrae vir ons?</h3>
          <p>Stuur gerus ’n e-pos. Ons help graag.</p>
          <a href="mailto:inligting&#64;orania.co.za" class="btn btn-primary btn-terug">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 6 12 13 22 6"/>
            </svg>
            inligting&#64;orania.co.za
          </a>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <p class="eyebrow cta-eyebrow">Jou volgende stap</p>
          <h2 class="display">Het jy jou antwoord? Kies nou jou hoeveelheid.</h2>
          <p>Begin met 1 m² vir R500. Ons kan jou blokkie outomaties kies, of jy kan self die kaart oopmaak.</p>
        </div>
        <a routerLink="/bou" class="btn btn-primary cta-btn">Bou 1 m² vir R500</a>
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

    .section { padding: 4.5rem 0; }
    .chalk { background: var(--bg-chalk); }

    .section-title {
      font-size: clamp(2rem, 4vw, 3.25rem);
      margin: 0.75rem 0 2rem;
      color: var(--ink);
    }

    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .faq-item {
      padding: 0;
      overflow: hidden;
    }
    .faq-item summary {
      list-style: none;
      cursor: pointer;
      font-family: var(--font-display);
      font-size: clamp(1.25rem, 2.5vw, 1.6rem);
      font-weight: 700;
      color: var(--ink);
      padding: 1.35rem 1.5rem;
      min-height: var(--tap-min);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary::after {
      content: '+';
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--route-blue);
      line-height: 1;
      flex-shrink: 0;
    }
    .faq-item[open] summary::after { content: '−'; }
    .faq-item[open] summary {
      border-bottom: 1px solid var(--border-soft);
    }
    .faq-item p {
      margin: 0;
      padding: 1.25rem 1.5rem 1.5rem;
      color: var(--text-muted);
      font-size: var(--fs-base);
      line-height: 1.65;
    }

    .vra-ons {
      margin-top: 2.5rem;
      padding: 2rem;
      text-align: center;
      border-top: 4px solid var(--action);
    }
    .vra-ons h3 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      margin: 0 0 0.5rem;
      color: var(--ink);
    }
    .vra-ons p {
      margin: 0 0 1.5rem;
      color: var(--text-muted);
      font-size: var(--fs-lg);
    }
    /* Long address must not blow out the button on a narrow phone. */
    .vra-ons .btn { max-width: 100%; word-break: break-word; }

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
export class VraeComponent {
  readonly faqs: FaqItem[] = [
    {
      question: 'Wat finansier my R500?',
      answer:
        'Jou R500 finansier presies 1 volle vierkante meter teerpad in die Diamantlaan-teerprojek. Dit is ’n meetbare bydrae — nie ’n vae skenking nie.',
    },
    {
      question: 'Moet ek self ’n blokkie kies?',
      answer:
        'Nee. Outomatiese toekenning is die vinnigste roete: jy kies net die hoeveelheid en ons ken beskikbare blokkies aan jou toe. Die kaart is ’n opsionele manier om ’n spesifieke plek te kies.',
    },
    {
      question: 'Kan ek meer as een m² finansier?',
      answer:
        'Ja. Jy kan 1, 2, 5 of ’n eie hoeveelheid vierkante meter finansier — teen R500 per volle m².',
    },
    {
      question: 'Moet ek ’n rekening hê?',
      answer:
        'Nee. Jy kan as gas betaal. Ná betaling kan jy opsioneel ’n rekening skep om sertifikate, blokkies en opdaterings later te bestuur.',
    },
    {
      question: 'Hoe word ek as Stadsbouer erken?',
      answer:
        'Sodra jou betaling ontvang is, ontvang jy ’n Stadsbouer-sertifikaat. Erkenning kan as persoon, gesin, onderneming of privaat ondersteuner verskyn — volgens die projek se erkenningsopsies.',
    },
    {
      question: 'Is betaling veilig?',
      answer:
        'Ja. Alle betalings word veilig deur PayFast verwerk, ’n vertroude Suid-Afrikaanse betalingsverskaffer. Jy sien eers ’n opsomming van jou totaal voordat jy na PayFast gestuur word.',
    },
    {
      question: 'Koop ek die grond of padoppervlak?',
      answer:
        'Nee. Jou bydrae finansier die projek; die blokkie is simboliese of digitale erkenning. Dit dra nie eiendoms-, toegang- of beheerregte oor nie.',
    },
  ];
}
