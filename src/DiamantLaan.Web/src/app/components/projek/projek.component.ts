import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../shared/icon/icon.component';
import { FotoSliderComponent } from '../shared/foto-slider/foto-slider.component';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-projek',
  standalone: true,
  imports: [RouterLink, IconComponent, FotoSliderComponent, TPipe],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">{{ 'Die projek · Orania bou ’n pad' | t }}</p>
        <h1 class="display page-hero-title">{{ 'Wat gebou word en hoe dit werk.' | t }}</h1>
        <p class="page-hero-body">
          {{ 'Die Oewerpad is ’n belangrike roete in Orania wat tans nog ’n grondpad is. Met eie Afrikanerhande en die ondersteuning van duisende mense kan ons die Oewerpad stap vir stap van ’n grondpad in ’n behoorlike pad omskep.' | t }}
        </p>
      </div>
    </section>

    <section class="section chalk">
      <div class="container-wide">
        <p class="eyebrow">{{ 'Waarom die Oewerpad?' | t }}</p>
        <h2 class="display section-title">{{ 'Van grondpad tot teerpad.' | t }}</h2>
        <p class="lead">
          {{ 'Die Oewerpad is een van Orania se besigste paaie en speel ’n belangrike rol in die toegang tot die oewergebied. Dit is ’n belangrike roete vir besoekers wat Orania se gastehuise, kampeerterreine en ander toerismegeriewe, asook die Oranjerivier, besoek. Vir baie besoekers is dit ook een van die eerste roetes wat hulle in Orania ry. Eerste indrukke maak saak.' | t }}
        </p>
        <p class="lead">
          {{ 'Die teer van die Oewerpad is daarom meer as net infrastruktuurontwikkeling. Dit ontsluit Orania se oewergebied vir ’n volgende fase van toerismeontwikkeling en skep nuwe ruimte vir ekonomiese groei.' | t }}
        </p>

        <div class="why-grid">
          <aside class="callout-panel">
            <div class="callout-media">
              <img src="orania-scooter-teken.jpg" [alt]="'Scooter-padteken langs die pad in Orania' | t" />
            </div>
          </aside>
          <div class="scope-grid">
            @for (card of scopeCards; track card.title) {
              <article class="surface-card scope-card">
                <span class="scope-icon"><app-icon [name]="card.icon" [size]="26" /></span>
                <h3>{{ card.title | t }}</h3>
                <p>{{ card.body | t }}</p>
              </article>
            }
          </div>
        </div>
      </div>
    </section>

    <section class="section white">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="eyebrow">{{ 'Die inisiatief' | t }}</p>
            <h2 class="display section-title">{{ 'Waar die projek vandaan kom.' | t }}</h2>
            <p class="lead">
              {{ 'Die Oewerpad is reeds lank as een van die belangrikste en besigste roetes in Orania geïdentifiseer. Oraniërs werk egter sorgvuldig en berekend met beperkte hulpbronne. Sonder staatstoelaes beteken dit dat Oraniërs self moet betaal vir alles wat hulle graag wil hê en nodig het.' | t }}
            </p>
            <p class="lead">
              {{ 'Ná 35 jaar van sukses is dit weer tyd dat Orania sy volgende groeifase betree. Groter ontwikkeling, meer mense en ’n groter, gevestigde ekonomie: dit is die boustene van ’n vrye Afrikanertuiste. Orania is egter nie net ’n tuiste vir Oraniërs nie. Orania, die Afrikanerdorp wat deur Afrikaner-arbeid op Afrikanergrond ontwikkel word, behoort aan Afrikaners. Die groei en ontwikkeling van hierdie gemeenskap is in die belang van elke Afrikaner wat vandag in Suid-Afrika woon, maar ook van die Afrikanernageslag wat eendag die erfenis in besit sal neem.' | t }}
            </p>
            <p class="lead">
              {{ 'Die Oewerpad is meer as net ’n pad. Dit is ’n weg na vryheid. Nie vanweë die infrastruktuur self nie, maar vanweë die simboliek van waartoe Afrikaners in staat is. Sonder om te smeek. Sonder om te pleit. Deur eenvoudig te doen waarvoor ons die beste bekend is:' | t }}
            </p>
            <p class="inisiatief-slot">{{ 'Deur self te bou!' | t }}</p>
          </div>
          <aside class="inisiatief-foto">
            <img src="orania-paar.jpg" [alt]="'Jong man en vrou wat voor ’n huis in Orania glimlag' | t" />
          </aside>
        </div>

        <app-foto-slider />
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
      .why-grid { grid-template-columns: 0.85fr 1.15fr; gap: 3.5rem; }
      .scope-grid { grid-template-columns: 1fr 1fr; }
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

    .callout-media img {
      width: 100%;
      aspect-ratio: 2 / 3;
      object-fit: cover;
      display: block;
      box-shadow: var(--shadow-lg);
    }
    .section-head {
      display: grid;
      gap: 3rem;
      align-items: start;
      margin-bottom: 2.5rem;
    }
    @media (min-width: 960px) {
      .section-head { grid-template-columns: 1.15fr 0.85fr; gap: 3.5rem; }
    }
    .inisiatief-foto img {
      width: 100%;
      aspect-ratio: 2 / 3;
      object-fit: cover;
      display: block;
      box-shadow: var(--shadow-lg);
    }

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
      body: 'As een van Orania se besigste paaie, is die Oewerpad ’n belangrike roete wat opgegradeer moet word om by Orania se groeiende behoeftes te pas.',
    },
    {
      icon: 'wallet',
      title: 'Ekonomiese waarde',
      body: 'Beter padinfrastruktuur verlaag voertuig- en instandhoudingskoste, verkort reistye en verbeter die besoekerservaring by een van Orania se gewildste bestemmings.',
    },
    {
      icon: 'map-pin',
      title: 'Bou die stad',
      body: 'Afrikaners het ’n eie plek nodig: ’n plek waar hulle die meerderheid is, hul taal en kultuur kan uitleef en die Afrikanerkultuur kan floreer. Die grondslag van ’n lewenskragtige Afrikanerstad is sterk, moderne infrastruktuur. Die teer van die Oewerpad vorm daarom deel van Orania se omvattende infrastruktuurontwikkelingsplan, ’n plan om die stad stap vir stap uit te bou en vir die toekoms toe te rus.',
    },
    {
      icon: 'hammer',
      title: 'Vele hande, ligte werk',
      body: 'Dit is ’n belangrike én omvangryke projek. Deur die pad in kleiner blokkies op te deel, maak ons dit moontlik vir elkeen om ’n deel by te dra. Só dra ons almal saam verantwoordelikheid om hierdie groot visie stap vir stap ’n werklikheid te maak.',
    },
  ];
}
