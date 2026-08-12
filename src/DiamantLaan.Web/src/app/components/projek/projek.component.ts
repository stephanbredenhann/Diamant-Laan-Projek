import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../shared/icon/icon.component';

@Component({
  selector: 'app-projek',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">Die projek · Diamantlaan-teerprojek</p>
        <h1 class="display page-hero-title">Wat ons bou, en hoe dit werk.</h1>
        <p class="page-hero-body">
          Diamantlaan is vandag ’n grondpad. Ons teer dit stuk vir stuk, en elke vierkante
          meter word deur ’n ondersteuner gefinansier.
        </p>
      </div>
    </section>

    <section class="section chalk">
      <div class="container-wide why-grid">
        <div>
          <p class="eyebrow">Waarom Diamantlaan</p>
          <h2 class="display section-title">Van grondpad na teerpad.</h2>
          <p class="lead">
            ’n Grondpad word stof in die somer en modder in die reën, en dit kos elke jaar geld
            om te herstel. Teer los dit permanent op. Deur die werk in vierkante meter op te deel,
            kan enigiemand ’n stuk daarvan finansier — en presies sien waar dit is.
          </p>

          <div class="scope-grid">
            @for (card of scopeCards; track card.title) {
              <article class="surface-card scope-card">
                <span class="scope-icon"><app-icon [name]="card.icon" [size]="26" /></span>
                <h3>{{ card.title }}</h3>
                <p>{{ card.body }}</p>
              </article>
            }
          </div>
        </div>

        <aside class="callout-panel">
          <div class="callout-media">
            <img src="diamant_laan_foto.jpg" alt="Diamantlaan — grondpad wat teerwerk nodig het" />
            <div class="price-chip">
              <span class="display price-chip-value">R500</span>
              <p>Per volle vierkante meter.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section class="section white">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">Die feite</p>
            <h2 class="display section-title">Lorem ipsum dolor sit amet.</h2>
            <!-- PLACEHOLDER: awaiting the confirmed project facts from the client. -->
            <p class="lead">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </div>

        <div class="fact-grid">
          @for (fact of factCards; track fact.label) {
            <article class="fact-card">
              <span class="display fact-value">{{ fact.value }}</span>
              <h3>{{ fact.label }}</h3>
              <p>{{ fact.note }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <p class="eyebrow cta-eyebrow">Jou volgende stap</p>
          <h2 class="display">Help om die plan in pad te verander.</h2>
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
    .white { background: var(--surface); }

    .section-title {
      font-size: clamp(2rem, 4vw, 3.25rem);
      margin: 0.75rem 0 1rem;
      color: var(--ink);
    }
    .lead {
      font-size: var(--fs-lg);
      color: var(--text-muted);
      line-height: 1.65;
      max-width: 40rem;
      margin: 0 0 2rem;
    }

    .why-grid {
      display: grid;
      gap: 3rem;
      align-items: start;
    }
    @media (min-width: 960px) {
      .why-grid { grid-template-columns: 1.15fr 0.85fr; gap: 3.5rem; }
    }

    .scope-grid {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) {
      .scope-grid { grid-template-columns: 1fr 1fr; }
    }
    .scope-card h3 {
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      font-weight: 700;
      margin: 1rem 0 0.5rem;
      color: var(--ink);
    }
    .scope-card p {
      margin: 0;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      line-height: 1.55;
    }
    .stamp-sm {
      font-size: 0.7rem;
      padding: 0.25rem 0.55rem;
    }

    .callout-media {
      position: relative;
    }
    .callout-media img {
      width: 100%;
      aspect-ratio: 4 / 5;
      object-fit: cover;
      display: block;
      box-shadow: var(--shadow-lg);
    }
    .price-chip {
      position: absolute;
      left: -0.75rem;
      bottom: -1.25rem;
      max-width: 16rem;
      background: var(--tar);
      color: #fff;
      padding: 1.5rem 1.75rem;
    }
    .price-chip-value {
      display: block;
      font-size: 3rem;
      color: var(--action);
      line-height: 1;
    }
    .price-chip p {
      margin: 0.5rem 0 0;
      font-size: var(--fs-sm);
      color: rgba(255, 255, 255, 0.65);
      line-height: 1.45;
    }
    @media (max-width: 639px) {
      .price-chip {
        position: static;
        margin-top: 0;
        max-width: none;
      }
    }

    .section-head { margin-bottom: 2.5rem; }

    .fact-grid {
      display: grid;
      gap: 1px;
      background: rgba(26, 26, 26, 0.1);
      grid-template-columns: 1fr;
    }
    @media (min-width: 720px) {
      .fact-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .fact-card {
      background: var(--bg-chalk);
      padding: 2rem 1.75rem;
    }
    .fact-value {
      display: block;
      font-size: clamp(1.75rem, 3vw, 2.5rem);
      color: var(--route-blue);
      margin-bottom: 0.75rem;
    }
    .fact-card h3 {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--ink);
    }
    .fact-card p {
      margin: 0;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      line-height: 1.5;
    }

    .scope-icon {
      display: inline-grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border: 2px solid var(--route-blue);
      color: var(--route-blue);
      margin-bottom: 0.85rem;
    }
    .pending-panel {
      margin-top: 2.5rem;
      padding: 2rem;
      background: var(--bg-chalk);
      border-left: 4px solid var(--route-blue);
      max-width: 52rem;
    }
    .pending-panel h3 {
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      margin-bottom: 0.75rem;
      color: var(--ink);
    }
    .pending-panel p { color: var(--text-muted); line-height: 1.6; }
    .pending-panel ul {
      margin: 1rem 0 0;
      padding-left: 1.25rem;
      color: var(--text-body);
      line-height: 1.7;
    }
    .pending-contact { margin-top: 1.25rem; }

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
export class ProjekComponent {
  readonly scopeCards: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'road',
      title: 'Een pad, in blokke verdeel',
      body: 'Diamantlaan is in vierkante meter opgedeel. Elke blokkie het ’n nommer en ’n plek op die kaart.',
    },
    {
      icon: 'wallet',
      title: 'R500 per vierkante meter',
      body: 'Een prys, vir almal dieselfde. Jy kies self hoeveel vierkante meter jy wil finansier.',
    },
    {
      icon: 'map-pin',
      title: 'Jy sien presies waar',
      body: 'Jy kan jou blokkies se ligging op die kaart sien.',
    },
    {
      icon: 'award',
      title: 'Erkenning as Stadsbouer',
      body: 'Elke ondersteuner kry ’n sertifikaat met sy of haar naam en bloknommer daarop.',
    },
  ];

  /**
   * PLACEHOLDER CONTENT — awaiting the confirmed project facts from the client.
   * Replace each entry with the real figure before this page goes live.
   */
  readonly factCards = [
    { value: 'Lorem ipsum', label: 'Dolor sit amet', note: 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt.' },
    { value: 'Ut labore', label: 'Et dolore magna', note: 'Aliqua enim ad minim veniam, quis nostrud exercitation ullamco.' },
    { value: 'Laboris nisi', label: 'Ut aliquip ex ea', note: 'Commodo consequat duis aute irure dolor in reprehenderit.' },
    { value: 'In voluptate', label: 'Velit esse cillum', note: 'Dolore eu fugiat nulla pariatur excepteur sint occaecat.' },
    { value: 'Cupidatat', label: 'Non proident sunt', note: 'In culpa qui officia deserunt mollit anim id est laborum.' },
    { value: 'Sed ut', label: 'Perspiciatis unde', note: 'Omnis iste natus error sit voluptatem accusantium doloremque.' },
  ];
}
