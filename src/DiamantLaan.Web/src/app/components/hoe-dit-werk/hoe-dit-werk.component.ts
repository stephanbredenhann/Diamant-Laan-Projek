import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../shared/icon/icon.component';

@Component({
  selector: 'app-hoe-dit-werk',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">Hoe dit werk · Diamantlaan-teerprojek</p>
        <h1 class="display page-hero-title">Vier stappe. Geen kaartkennis nodig nie.</h1>
        <p class="page-hero-body">
          Kies hoeveel vierkante meter jy wil finansier, betaal, en kry jou sertifikaat.
          Jy hoef nie met die kaart te werk nie — ons ken die blokkies vir jou toe.
        </p>
      </div>
    </section>

    <section class="section chalk">
      <div class="container">
        <p class="eyebrow">Die stappe</p>
        <h2 class="display section-title">Van bedrag tot sertifikaat.</h2>
        <p class="lead">Die hele proses neem omtrent twee minute.</p>

        <div class="steps">
          @for (step of steps; track step.number; let last = $last) {
            <article class="surface-card step-card">
              <div class="step-icon">
                <app-icon [name]="step.icon" [size]="34" />
                <span class="step-badge" aria-hidden="true">{{ step.number }}</span>
              </div>
              <div class="step-body">
                <h3>{{ step.title }}</h3>
                <p>{{ step.body }}</p>
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

    <section class="section white">
      <div class="container route-grid">
        <article class="route-panel route-panel--default">
          <p class="eyebrow">Aanbeveel</p>
          <h2 class="display route-title">Kies beskikbare blokkies vir my.</h2>
          <p>
            Die stelsel kies outomaties die korrekte aantal beskikbare vierkante meter.
            Geen zoom, sleep of blokkienommer is nodig nie.
          </p>
        </article>

        <article class="route-panel route-panel--optional">
          <p class="eyebrow optional-eyebrow">Opsioneel</p>
          <h2 class="display route-title">Kies self op die kaart.</h2>
          <p>
            Wil jy ’n spesifieke blokkie hê — langs ’n bekende punt, of naby mekaar as ’n gesin?
            Maak die kaart oop en soek die bloknommer. Jou hoeveelheid is reeds ingevul.
          </p>
        </article>
      </div>
    </section>

    <section class="section sand">
      <div class="container after-grid">
        <article class="surface-card after-card">
          <span class="after-icon"><app-icon name="award" [size]="30" /></span>
          <h3>Stadsbouer-erkenning</h3>
          <p>
            Persoon, gesin, onderneming of privaat — onderhewig aan die finale projekbeleid.
            Ná betaling ontvang jy erkenning as Stadsbouer.
          </p>
        </article>
        <article class="surface-card after-card">
          <span class="after-icon"><app-icon name="user" [size]="30" /></span>
          <h3>Opsionele rekening</h3>
          <p>
            Volg blokkies, laai dokumente af en bestuur toekomstige kontakvoorkeure.
            Jy hoef nie ’n rekening te hê om te begin bou nie.
          </p>
        </article>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <p class="eyebrow cta-eyebrow">Jou volgende stap</p>
          <h2 class="display">Gereed? Begin by jou hoeveelheid.</h2>
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
    .sand { background: var(--surface-alt); }

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
      margin: 0 0 2.5rem;
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-width: 52rem;
      margin: 0 auto;
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

    .route-grid {
      display: grid;
      gap: 1.5rem;
    }
    @media (min-width: 900px) {
      .route-grid { grid-template-columns: 1fr 1fr; }
    }
    .route-panel {
      padding: 2.25rem 2rem;
      border-top: 4px solid var(--action);
    }
    .route-panel--default {
      background: var(--surface-alt);
    }
    .route-panel--optional {
      background: var(--tar);
      color: #fff;
      border-top-color: var(--route-blue);
    }
    .route-title {
      font-size: clamp(2rem, 4vw, 3rem);
      margin: 1rem 0 1.25rem;
    }
    .route-panel--default .route-title { color: var(--ink); }
    .route-panel--optional .route-title { color: #fff; }
    .route-panel p {
      font-size: var(--fs-lg);
      line-height: 1.6;
      margin: 0;
    }
    .route-panel--default p { color: var(--text-muted); }
    .route-panel--optional p { color: rgba(255, 255, 255, 0.7); }
    .optional-eyebrow { color: var(--action); }
    .route-note {
      margin-top: 1.75rem !important;
      font-weight: 700;
      font-size: var(--fs-base) !important;
      color: var(--route-blue) !important;
    }
    .optional-note { color: var(--action) !important; }

    .after-grid {
      display: grid;
      gap: 1.25rem;
    }
    @media (min-width: 720px) {
      .after-grid { grid-template-columns: 1fr 1fr; }
    }
    .after-icon {
      display: inline-grid;
      place-items: center;
      width: 3.25rem;
      height: 3.25rem;
      border: 2px solid var(--route-blue);
      color: var(--route-blue);
    }
    .after-card h3 {
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      font-weight: 700;
      margin: 1rem 0 0.5rem;
      color: var(--ink);
    }
    .after-card p {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.55;
    }

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
export class HoeDitWerkComponent {
  readonly steps: { number: string; icon: IconName; title: string; body: string }[] = [
    {
      number: '01',
      icon: 'ruler',
      title: 'Kies jou hoeveelheid',
      body: 'Kies 1, 2, 5 of jou eie aantal vierkante meter. Jy sien die totaal dadelik — R500 per m².',
    },
    {
      number: '02',
      icon: 'map-pin',
      title: 'Ons ken die blokkies toe',
      body: 'Ons kies beskikbare blokkies vir jou. Wil jy self ’n plek kies, kan jy die kaart oopmaak.',
    },
    {
      number: '03',
      icon: 'shield',
      title: 'Betaal veilig deur PayFast',
      body: 'Jy sien jou totaal, betaal by PayFast en kom terug na die webwerf. Jy hoef nie ’n rekening te hê nie.',
    },
    {
      number: '04',
      icon: 'award',
      title: 'Kry jou sertifikaat',
      body: 'Laai jou Stadsbouer-sertifikaat af. Skep ’n rekening om later die werk op jou stuk pad te volg.',
    },
  ];
}
