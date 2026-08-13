import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../shared/icon/icon.component';
import { FotoSliderComponent } from '../shared/foto-slider/foto-slider.component';

@Component({
  selector: 'app-projek',
  standalone: true,
  imports: [RouterLink, IconComponent, FotoSliderComponent],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">Die projek · Orania bou ’n pad</p>
        <h1 class="display page-hero-title">Wat gebou word en hoe dit werk.</h1>
        <p class="page-hero-body">
          Die Oewerpad is ’n belangrike roete wat tans nog ’n grondpad is.
          Met eie Afrikanerhande en duisende ondersteuners, kan ons hierdie pad na ’n volgende vlak neem.
        </p>
      </div>
    </section>

    <section class="section chalk">
      <div class="container-wide why-grid">
        <div>
          <p class="eyebrow">Waarom die Oewerpad?</p>
          <h2 class="display section-title">Van grondpad na teerpad.</h2>
          <p class="lead">
            Die Oewerpad is een van Orania se paaie wat jaarliks die meeste verkeer sien.
            Dit is ’n besonder belangrike roete vir toeriste wat gastehuise, die hotel, restaurant of rivier wil gaan besoek.
            Dit is dikwels een van die roetes wat die meeste deur toeriste gery word en dit is daarom van kardinale belang om die pad te teer.
            Die opgradering van die Oewerpad is meer as net infrastruktuurverbetering, maar kan dien as ’n ekonomiese katalisator vir die hele area.
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
            <img src="oewerpad-03.jpg" alt="Oewerpad, grondpad wat teerwerk nodig het" />
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
            <p class="eyebrow">Die inisiatief</p>
            <h2 class="display section-title">Waar die projek vandaan kom.</h2>
            <p class="lead">
              Die Oewerpad is al lankal as een van die belangrikste en besigste roetes in Orania geïdentifiseer.
              Oraniërs werk egter sorgvuldig en berekend met beperkte hulpbronne.
              Geen staatstoelae beteken dat Oraniërs alles wat hulle graag wil hê, self moet befonds.
              Ná 35 jaar van sukses, is dit egter tyd dat Orania sy volgende groeifase betree.
              Groter ontwikkeling, meer mense en ’n groter, gevestigde ekonomie: dit is alles boublokke vir ’n vrye Afrikanertuiste.
              In dieselfde sin is Orania nie net ’n tuiste vir Oraniërs nie.
              Orania, die Afrikanerdorp wat met Afrikaner-arbeid op Afrikanergrond ontwikkel, behoort aan Afrikaners.
              Die groei en ontwikkeling van hierdie gemeenskap is binne die belange van elke Afrikaner tans in Suid-Afrika, en meer as dit, binne die belange van die Afrikanernageslag wie die beste weergawe van Orania gaan beleef.
            </p>
            <p class="lead">
              Die stryd begin egter reeds vandag.
              ’n Mens plant nie ’n boom om môre koelte te kry nie, maar as ons nie vandag ’n boom plant nie, dan is daar in die toekoms steeds niks nie.
            </p>
            <p class="lead">
              Die Oewerpad is meer as ’n pad. Dit is ’n weg na vryheid.
              Nie die infrastruktuur self nie, maar die simboliek van waartoe Afrikaners in staat is.
              Sonder om te smeek. Sonder om te pleit. Deur eenvoudig net te doen waarvoor ons die beste geken word:
            </p>
            <p class="inisiatief-slot">Deur self te bou!</p>
          </div>
        </div>

        <app-foto-slider />
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

    .inisiatief-slot {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 4vw, 2.75rem);
      font-weight: 800;
      color: var(--ink);
      margin: 0 0 0.5rem;
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
      title: 'Besige roete',
      body: 'As een van die paaie wat die meeste verkeer in Orania geniet, is dit belangrik om die infrastruktuur tot ’n volgende vlak te ontwikkel.',
    },
    {
      icon: 'wallet',
      title: 'Ekonomiese impak',
      body: 'Beter padinfrastruktuur verlaag voertuig- en instandhoudingskoste, verbeter reistye en maak dit makliker vir toeriste om by Orania se instellings aan te doen.',
    },
    {
      icon: 'map-pin',
      title: 'Bou die stad',
      body: 'Orania moet ontwikkel. Dinge gebeur nie vanself nie. Stap vir stap en stukkie vir stukkie moet ons verbeter, opgradeer en groei. Hoegehalte harde infrastruktuur in ’n eie Afrikanergemeenskap is die bewys van waartoe ons in staat is.',
    },
    {
      icon: 'award',
      title: 'Vele hande, ligte werk',
      body: 'Hierdie is ’n groot en ’n duur projek. Deur dit in blokkies op te deel en te skarefinansier, word die groot taak makliker gemaak.',
    },
  ];
}
