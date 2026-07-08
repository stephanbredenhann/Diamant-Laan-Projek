import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container privacy-page">
      <article class="privacy-content">
        <p class="privacy-back"><a routerLink="/">← Terug na tuisblad</a></p>

        <h1>Privaatheidsbeleid</h1>
        <p class="privacy-meta">Laas bygewerk: 8 Julie 2026</p>

        <p>
          Hierdie kennisgewing verduidelik hoe die Diamant Laan-webwerf persoonlike inligting
          versamel, gebruik en beskerm. Dit is ’n informele, praktiese opsomming van ons
          praktyke en is nie formele regsadvisering nie.
        </p>

        <section>
          <h2>1. Wie ons is</h2>
          <p>
            Die verantwoordelike party vir hierdie webwerf en die verwerking van persoonlike
            inligting is die <strong>Orania Beweging</strong>.
          </p>
          <p>
            Vir privaatheidsvrae of versoeke oor jou data, kontak ons by
            <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>.
          </p>
        </section>

        <section>
          <h2>2. Watter persoonlike inligting ons versamel</h2>
          <p>Afhangende van hoe jy die webwerf gebruik, kan ons die volgende inligting verwerk:</p>
          <ul>
            <li>
              <strong>Rekeningbesonderhede:</strong> voornaam, van, e-posadres, opsionele
              telefoonnommer, of jy ’n Orania-inwoner is, en ’n gehashte wagwoord.
            </li>
            <li>
              <strong>Aankope en blokke:</strong> aankooprekords (bedrag, status, datum),
              watter padblokke jy besit of gereserveer het, PayFast-betalingsverwysings, en
              waar van toepassing bewys-van-betaling-lêers (byvoorbeeld PDF’s vir
              telefoon-aankope).
            </li>
            <li>
              <strong>Aanmeldingssessies:</strong> verversingstokens (in ’n beveiligde
              koekie) en ’n toegangstoken plus profielbesonderhede wat tydelik in jou
              blaaier se plaaslike berging gestoor word.
            </li>
            <li>
              <strong>Administratiewe rekords:</strong> ouditinskrywings van admin-aksies
              (wat e-posse kan bevat) en progressiefoto’s wat deur administrateurs
              opgelaai word.
            </li>
          </ul>
          <p>
            Die openbare kaart toon slegs of ’n blok verkoop is — nie die eienaar se naam,
            e-pos of telefoonnommer nie.
          </p>
        </section>

        <section>
          <h2>3. Waarom ons jou inligting gebruik</h2>
          <p>Ons verwerk persoonlike inligting om:</p>
          <ul>
            <li>jou rekening te skep en te bestuur;</li>
            <li>blokke te bespreek, te koop en aan jou rekening te koppel;</li>
            <li>betalings via PayFast of handmatige (telefoon) aankope te verwerk;</li>
            <li>jou blokke, sertifikate en transaksies aan jou te wys;</li>
            <li>
              die projek te administreer (statistieke, gebruikersbestuur, progressiefoto’s);
            </li>
            <li>die diens te beveilig en misbruik of foutiewe reserverings te voorkom.</li>
          </ul>
        </section>

        <section>
          <h2>4. Met wie ons inligting deel</h2>
          <p>Ons verkoop nie jou persoonlike inligting nie. Ons gebruik diensverskaffers wat
            nodig is om die webwerf te bedryf:</p>
          <ul>
            <li>
              <strong>PayFast</strong> — om betaling te verwerk (naam, e-pos en
              betalingsbesonderhede word aan PayFast gestuur).
            </li>
            <li>
              <strong>Azure</strong> — om die webwerf en databasis te huisves.
            </li>
            <li>
              <strong>Google Fonts</strong> — om lettertipes te laai (jou blaaier kontak Google
              se bedieners).
            </li>
            <li>
              <strong>OpenStreetMap</strong> — om kaartteëls te wys.
            </li>
          </ul>
          <p>
            Ons gebruik nie bemarkingsanalise-platforms of ’n aparte e-pos-/SMS-verskaffer
            vanuit hierdie toepassing nie.
          </p>
        </section>

        <section>
          <h2>5. Koekies en plaaslike berging</h2>
          <ul>
            <li>
              ’n <strong>HttpOnly-koekie</strong> stoor ’n verversingstoken sodat jy
              aangemeld kan bly.
            </li>
            <li>
              Jou blaaier se <strong>localStorage</strong> kan ’n JWT-toegangstoken en
              basiese profielbesonderhede (naam, e-pos, telefoon, Orania-status, rolle)
              bevat.
            </li>
            <li>
              Tydelike <strong>sessionStorage</strong> kan gekose blok-ID’s tydens die
              betaalproses stoor.
            </li>
          </ul>
          <p>
            Ons gebruik nie advertensie- of naspeurkoekies nie.
          </p>
        </section>

        <section>
          <h2>6. Hoe lank ons inligting bewaar</h2>
          <p>
            Rekening- en aankooprekords word bewaar solank jou rekening of die Diamant
            Laan-projek aktief is, of so lank as wat nodig is vir administratiewe,
            sekuriteits- of wetlike doeleindes. Uitstaande (nie-betaalde) reserverings word
            outomaties na ongeveer 30 minute vrygestel. Jy kan versoek dat jou data
            uitgevee of reggestel word via die kontakbesonderhede hieronder.
          </p>
        </section>

        <section>
          <h2>7. Sekuriteit</h2>
          <p>
            Wagwoorde word as hashes gestoor (nie in duidelike teks nie). Toegang tot die
            webwerf word oor HTTPS bedryf waar beskikbaar. Administratiewe funksies is
            beperk tot gemagtigde gebruikers. Geen stelsel is egter heeltemal risikovry nie;
            gebruik sterk wagwoorde en deel jou aanmeldingsbesonderhede nie.
          </p>
        </section>

        <section>
          <h2>8. Jou regte</h2>
          <p>
            Onder die Wet op die Beskerming van Persoonlike Inligting (POPIA) kan jy onder
            meer versoek om:
          </p>
          <ul>
            <li>toegang tot die persoonlike inligting wat ons oor jou hou;</li>
            <li>verkeerde inligting reg te stel;</li>
            <li>uitvee of beperking van verwerking aan te vra (waar toepaslik);</li>
            <li>te kla by die Inligtingsreguleerder indien jy van mening is dat jou regte
              geskend is.</li>
          </ul>
          <p>
            Stuur sulke versoeke na
            <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>.
          </p>
        </section>

        <section>
          <h2>9. Kontak</h2>
          <p>
            <strong>Orania Beweging</strong><br />
            E-pos:
            <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>
          </p>
        </section>

        <section>
          <h2>10. Wysigings</h2>
          <p>
            Ons kan hierdie beleid van tyd tot tyd bywerk. Die “laas bygewerk”-datum boaan
            die bladsy toon wanneer die nuutste weergawe in werking getree het. Voortgesette
            gebruik van die webwerf na ’n bywerking beteken dat jy die hersiene beleid
            kennis geneem het.
          </p>
        </section>
      </article>
    </div>
  `,
  styles: [`
    .privacy-page {
      padding: 2.5rem 1.5rem 4rem;
    }

    .privacy-content {
      max-width: 42rem;
      margin: 0 auto;
    }

    .privacy-back {
      margin: 0 0 1.5rem;
      font-size: 0.875rem;
    }

    .privacy-back a {
      color: var(--ob-orange);
      text-decoration: none;
      font-weight: 500;
    }

    .privacy-back a:hover {
      text-decoration: underline;
    }

    h1 {
      font-family: var(--font-heading);
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 700;
      color: var(--text-body);
      margin: 0 0 0.5rem;
    }

    .privacy-meta {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 0 0 1.75rem;
    }

    section {
      margin-bottom: 2rem;
    }

    h2 {
      font-family: var(--font-heading);
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-body);
      margin: 0 0 0.75rem;
    }

    p, li {
      font-family: var(--font-body);
      font-size: 1rem;
      line-height: 1.7;
      color: var(--text-body);
      margin: 0 0 0.75rem;
    }

    ul {
      margin: 0 0 0.75rem;
      padding-left: 1.25rem;
    }

    li {
      margin-bottom: 0.5rem;
    }

    a {
      color: var(--ob-orange);
    }

    a:focus-visible {
      outline: 2px solid var(--ob-orange);
      outline-offset: 2px;
    }
  `]
})
export class PrivacyComponent {}
