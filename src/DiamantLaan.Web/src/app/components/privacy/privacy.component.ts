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
      <p class="privacy-meta">Laas bygewerk: 9 Julie 2026</p>

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
            telefoonnommer, jou status as Orania-inwoner, jou lidmaatskap van die Orania
            Beweging, jou e-posvoorkeur vir blokvorderingsopdaterings, en ’n gehashte wagwoord.
          </li>
          <li>
            <strong>Wagwoordherstelkodes:</strong> gehashte eenmalige kodes met ’n kort
            lewensduur wanneer jy wagwoordherstel aanvra.
          </li>
          <li>
            <strong>Aankope en blokke:</strong> aankooprekords (bedrag, status, datum),
            watter padblokke jy besit of gereserveer het, PayFast-betalingsverwysings, en
            waar toepaslik bewys-van-betalinglêers (byvoorbeeld PDF’s vir
            telefoonaankope).
          </li>
          <li>
            <strong>Aanmeldingsessies:</strong> refresh tokens (in ’n beveiligde
            koekie) en ’n toegangstoken plus profielbesonderhede wat tydelik in jou
            blaaier se plaaslike berging gestoor word.
          </li>
          <li>
            <strong>Administratiewe rekords:</strong> ouditinskrywings van adminaksies
            (wat e-posse kan bevat) en progressiefoto’s wat deur administrateurs
            opgelaai word.
          </li>
        </ul>
        <p>
          Die openbare kaart toon slegs of ’n blok verkoop is, nie die eienaar se naam,
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
          <li>die diens te beveilig en misbruik of foutiewe besprekings te voorkom;</li>
          <li>wagwoordherstel per e-pos te stuur wanneer jy dit aanvra;</li>
          <li>
            rekeningwelkom en aanmeldingsbesonderhede per e-pos te stuur ná telefoonaankope;
          </li>
          <li>
            opdaterings oor die vordering van jou blokke per e-pos te stuur (indien jy dit
            geaktiveer het).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Met wie ons inligting deel</h2>
        <p>
          Ons verkoop nie jou persoonlike inligting nie. Ons maak gebruik van
          diensverskaffers wat nodig is om die webwerf te bedryf:
        </p>
        <ul>
          <li>
            <strong>PayFast:</strong> om betalings te verwerk (naam, e-pos en
            betalingsbesonderhede word aan PayFast gestuur).
          </li>
          <li>
            <strong>Resend:</strong> om diens-e-posse af te lewer (jou e-posadres en die
            inhoud van die boodskap word aan Resend gestuur).
          </li>
          <li>
            <strong>Azure:</strong> om die webwerf en databasis te huisves.
          </li>
          <li>
            <strong>Google Fonts:</strong> om lettertipes te laai (jou blaaier kontak Google
            se bedieners).
          </li>
          <li>
            <strong>OpenStreetMap:</strong> om kaartteëls te wys.
          </li>
        </ul>
        <p>
          Ons stuur nie bemarking-e-posse of SMS-boodskappe nie; e-posse is slegs
          diensgerelateerd (wagwoordherstel, rekeningwelkom, blokvordering). Ons gebruik
          ook nie bemarkingsanaliseplatforms nie.
        </p>
      </section>

      <section>
        <h2>5. E-poskommunikasie</h2>
        <p>
          Ons stuur slegs <strong>transaksionele</strong> e-posse; geen bemarking of
          nuusbriewe nie. Afhangende van hoe jy die webwerf gebruik, kan jy die volgende
          ontvang:
        </p>
        <ul>
          <li>
            <strong>Wagwoordherstel:</strong> ’n eenmalige kode wanneer jy jou wagwoord
            vergeet het.
          </li>
          <li>
            <strong>Rekeningwelkom:</strong> aanmeldingsbesonderhede wanneer ’n administrateur
            ’n rekening vir jou skep tydens ’n telefoonaankoop.
          </li>
          <li>
            <strong>Blokvordering:</strong> opdaterings wanneer die status van jou blokke
            verander (byvoorbeeld van grondpad na teerpad).
          </li>
        </ul>
        <p>
          E-posse oor blokvordering is opsioneel. Jy kan hulle afskakel onder
          <strong>My Profiel</strong>. Wagwoordherstel- en rekeningwelkom-e-posse is nodig
          om die diens te lewer en kan nie afgeskakel word nie.
        </p>
      </section>

      <section>
        <h2>6. Koekies en plaaslike berging</h2>
        <ul>
          <li>
            ’n <strong>HttpOnly-koekie</strong> stoor ’n refresh token sodat jy
            aangemeld kan bly.
          </li>
          <li>
            Jou blaaier se <strong>localStorage</strong> kan ’n JWT-toegangstoken en
            basiese profielbesonderhede (naam, e-pos, telefoon, Orania-inwonerskap,
            Beweging-lidmaatskap, e-posvoorkeur en rolle) bevat.
          </li>
          <li>
            Tydelike <strong>sessionStorage</strong> kan gekose blok-ID’s tydens die
            betaalproses stoor.
          </li>
        </ul>
        <p>
          Ons gebruik nie advertensiekoekies of naspeurkoekies nie.
        </p>
      </section>

      <section>
        <h2>7. Hoe lank ons inligting bewaar</h2>
        <p>
          Rekening- en aankooprekords word bewaar solank jou rekening of die Diamant
          Laan-projek aktief is, of so lank as wat nodig is vir administratiewe,
          sekuriteits- of wetlike doeleindes. Uitstaande (onbetaalde) reserverings word
          outomaties ná ongeveer 30 minute vrygestel. Wagwoordherstelkodes verval ná
          ongeveer 15 minute. Jy kan versoek dat jou data uitgevee of reggestel word via
          die kontakbesonderhede hieronder.
        </p>
      </section>

      <section>
        <h2>8. Sekuriteit</h2>
        <p>
          Wagwoorde word in gehashte vorm gestoor (nie in duidelike teks nie). Toegang tot die
          webwerf geskied oor HTTPS waar beskikbaar. Administratiewe funksies is
          beperk tot gemagtigde gebruikers. Geen stelsel is egter heeltemal risikovry nie;
          gebruik sterk wagwoorde en deel nie jou aanmeldingsbesonderhede met ander nie.
        </p>
      </section>

      <section>
        <h2>9. Jou regte</h2>
        <p>
          Onder die Wet op die Beskerming van Persoonlike Inligting (POPIA) kan jy onder
          meer versoek om:
        </p>
        <ul>
          <li>toegang te verkry tot die persoonlike inligting wat ons oor jou hou;</li>
          <li>verkeerde inligting reg te stel;</li>
          <li>uitwissing of beperking van verwerking aan te vra (waar toepaslik);</li>
          <li>te kla by die Inligtingsreguleerder indien jy van mening is dat jou regte
            geskend is.</li>
        </ul>
        <p>
          Stuur sulke versoeke na
          <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>.
        </p>
      </section>

      <section>
        <h2>10. Kontak</h2>
        <p>
          <strong>Orania Beweging</strong><br />
          E-pos:
          <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>
        </p>
      </section>

      <section>
        <h2>11. Wysigings</h2>
        <p>
          Ons kan hierdie beleid van tyd tot tyd bywerk. Die “laas bygewerk”-datum boaan
          die bladsy toon wanneer die nuutste weergawe in werking getree het. Voortgesette
          gebruik van hierdie webwerf ná ’n bywerking beteken dat jy kennis geneem het van
          die hersiene beleid.
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
