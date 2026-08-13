import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-vrae',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">{{ 'Vrae · Orania bou ’n pad' | t }}</p>
        <h1 class="display page-hero-title">{{ 'Vrae en antwoorde oor die Oewerpad-projek' | t }}</h1>
        <p class="page-hero-body">
          {{ 'Gereelde vrae word hieronder beantwoord. Stuur gerus vir ons ’n e-pos indien jou vraag nie hier beantwoord word nie.' | t }}
        </p>
      </div>
    </section>

    <section class="section chalk">
      <div class="container container-narrow">
        <p class="eyebrow">{{ 'Gereelde vrae' | t }}</p>
        <h2 class="display section-title">{{ 'Gereelde vrae oor dié projek:' | t }}</h2>

        <div class="faq-list">
          @for (item of faqs; track item.question) {
            <details class="faq-item surface-card">
              <summary>{{ item.question | t }}</summary>
              <p>{{ item.answer | t }}</p>
            </details>
          }
        </div>

        <div class="vra-ons surface-card">
          <h3 class="display">{{ 'Indien jou vraag nie hier beantwoord is nie, stuur gerus vir ons ’n e-pos:' | t }}</h3>
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
          <p class="eyebrow cta-eyebrow">{{ 'Jou volgende stap' | t }}</p>
          <h2 class="display">{{ 'Raak nou betrokke!' | t }}</h2>
          <p>{{ 'Ontvang erkenning vir elke m² wat jy borg. Handel die proses binne minute af!' | t }}</p>
        </div>
        <a routerLink="/bou" class="btn btn-primary cta-btn">{{ 'Borg jou m²' | t }}</a>
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
      font-size: clamp(1.5rem, 3.5vw, 2.25rem);
      margin: 0 0 1.5rem;
      color: var(--ink);
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
        'Jou R500 finansier presies een m² van die nuwe teerpad in Diamantlaan. Dit word direk aan hierdie projek gewy.',
    },
    {
      question: 'Kan ek meer as een m² borg?',
      answer:
        'Ja, jy kan borg soveel jy wil! Indien jy as ’n geskenk vir familie of vriende wil borg, kan jy ook so maak en dan elkeen se naam op hul eie sertifikaat skryf.',
    },
    {
      question: 'Hoe word ek as ’n Stadsbouer erken?',
      answer:
        'Sodra die transaksie finaliseer is, word jou sertifikaat met jou unieke blokkie beskikbaar gestel. Jy kan dit aflaai, deel op sosiale media en selfs laat druk om te raam. Verdere erkenning sal in die toekoms langs die pad aangebring word.',
    },
    {
      question: 'Kan ek slegs aanlyn betaal?',
      answer:
        'Nee, jy kan ons direk kontak indien jy nie deur die webblad wil borg nie, of sommer die Orania Beweging se kantore in Orania kom besoek. Stuur gerus ’n e-pos na inligting@orania.co.za of skakel 053 207 0062.',
    },
    {
      question: 'Koop ek die grond of padoppervlak?',
      answer:
        'Nee. Jou bydrae finansier die projek; die blokkie is simboliese of digitale erkenning. Dit dra nie eiendoms-, toegang- of beheerregte oor nie.',
    },
  ];
}
