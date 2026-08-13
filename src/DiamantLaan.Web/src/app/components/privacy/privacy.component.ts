import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { LangService } from '../../i18n/lang.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="container privacy-page">
    <article class="privacy-content">
      <!-- A legal notice is translated as one document, not string by string,
           so each language gets its own block instead of a lookup per line. -->
      @if (lang.lang() === 'af') {
      <p class="privacy-back"><a routerLink="/">← Terug na tuisblad</a></p>

      <p class="eyebrow">Inligting</p>
      <h1 class="display page-title">Privaatheidsbeleid</h1>
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
            <strong>Mailchimp:</strong> om diens-e-posse af te lewer (jou e-posadres en die
            inhoud van die boodskap word aan Mailchimp gestuur).
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
          <strong>My profiel</strong>. Wagwoordherstel- en rekeningwelkom-e-posse is nodig
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
      } @else {
      <p class="privacy-back"><a routerLink="/">← Back to home</a></p>

      <p class="eyebrow">Information</p>
      <h1 class="display page-title">Privacy policy</h1>
      <p class="privacy-meta">Last updated: 9 July 2026</p>

      <p>
        This notice explains how the Diamant Laan website collects, uses and protects
        personal information. It is an informal, practical summary of our practices and is
        not formal legal advice.
      </p>

      <section>
        <h2>1. Who we are</h2>
        <p>
          The responsible party for this website and for the processing of personal
          information is the <strong>Orania Beweging</strong>.
        </p>
        <p>
          For privacy questions or requests about your data, contact us at
          <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>.
        </p>
      </section>

      <section>
        <h2>2. What personal information we collect</h2>
        <p>Depending on how you use the website, we may process the following information:</p>
        <ul>
          <li>
            <strong>Account details:</strong> first name, surname, email address, optional
            phone number, whether you are an Orania resident, your membership of the Orania
            Beweging, your email preference for block progress updates, and a hashed password.
          </li>
          <li>
            <strong>Password reset codes:</strong> hashed one-time codes with a short
            lifetime, created when you request a password reset.
          </li>
          <li>
            <strong>Purchases and blocks:</strong> purchase records (amount, status, date),
            which road blocks you own or have reserved, PayFast payment references, and
            where applicable proof-of-payment files (for example PDFs for telephone
            purchases).
          </li>
          <li>
            <strong>Login sessions:</strong> refresh tokens (in a secure cookie) and an
            access token plus profile details stored temporarily in your browser's local
            storage.
          </li>
          <li>
            <strong>Administrative records:</strong> audit entries of admin actions (which
            may contain email addresses) and progress photos uploaded by administrators.
          </li>
        </ul>
        <p>
          The public map shows only whether a block has been sold, never the owner's name,
          email address or phone number.
        </p>
      </section>

      <section>
        <h2>3. Why we use your information</h2>
        <p>We process personal information in order to:</p>
        <ul>
          <li>create and manage your account;</li>
          <li>reserve and sell blocks and link them to your account;</li>
          <li>process payments via PayFast or manual (telephone) purchases;</li>
          <li>show you your blocks, certificates and transactions;</li>
          <li>administer the project (statistics, user management, progress photos);</li>
          <li>secure the service and prevent abuse or faulty reservations;</li>
          <li>send password resets by email when you request one;</li>
          <li>send account welcome and login details by email after telephone purchases;</li>
          <li>
            send updates about the progress of your blocks by email (if you have enabled
            them).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Who we share information with</h2>
        <p>
          We do not sell your personal information. We use the service providers needed to
          run the website:
        </p>
        <ul>
          <li>
            <strong>PayFast:</strong> to process payments (name, email address and payment
            details are sent to PayFast).
          </li>
          <li>
            <strong>Mailchimp:</strong> to deliver service emails (your email address and the
            content of the message are sent to Mailchimp).
          </li>
          <li>
            <strong>Azure:</strong> to host the website and the database.
          </li>
          <li>
            <strong>Google Fonts:</strong> to load typefaces (your browser contacts Google's
            servers).
          </li>
          <li>
            <strong>OpenStreetMap:</strong> to show map tiles.
          </li>
        </ul>
        <p>
          We do not send marketing emails or SMS messages; emails are service related only
          (password reset, account welcome, block progress). We also do not use marketing
          analytics platforms.
        </p>
      </section>

      <section>
        <h2>5. Email communication</h2>
        <p>
          We send <strong>transactional</strong> emails only, no marketing and no
          newsletters. Depending on how you use the website, you may receive:
        </p>
        <ul>
          <li>
            <strong>Password reset:</strong> a one-time code when you have forgotten your
            password.
          </li>
          <li>
            <strong>Account welcome:</strong> login details when an administrator creates an
            account for you during a telephone purchase.
          </li>
          <li>
            <strong>Block progress:</strong> updates when the status of your blocks changes
            (for example from dirt road to tarred road).
          </li>
        </ul>
        <p>
          Block progress emails are optional. You can switch them off under
          <strong>My profile</strong>. Password reset and account welcome emails are needed
          to deliver the service and cannot be switched off.
        </p>
      </section>

      <section>
        <h2>6. Cookies and local storage</h2>
        <ul>
          <li>
            An <strong>HttpOnly cookie</strong> stores a refresh token so that you can stay
            logged in.
          </li>
          <li>
            Your browser's <strong>localStorage</strong> may hold a JWT access token and
            basic profile details (name, email, phone, Orania residency, Beweging
            membership, email preference and roles).
          </li>
          <li>
            Temporary <strong>sessionStorage</strong> may hold selected block IDs during the
            payment process.
          </li>
        </ul>
        <p>
          We do not use advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>7. How long we keep information</h2>
        <p>
          Account and purchase records are kept for as long as your account or the Diamant
          Laan project is active, or for as long as is needed for administrative, security
          or legal purposes. Outstanding (unpaid) reservations are released automatically
          after roughly 30 minutes. Password reset codes expire after roughly 15 minutes.
          You can request that your data be deleted or corrected via the contact details
          below.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          Passwords are stored in hashed form, never in plain text. Access to the website is
          over HTTPS where available. Administrative functions are limited to authorised
          users. No system is entirely free of risk, so use strong passwords and do not
          share your login details with anyone.
        </p>
      </section>

      <section>
        <h2>9. Your rights</h2>
        <p>
          Under the Protection of Personal Information Act (POPIA) you may, among other
          things, request to:
        </p>
        <ul>
          <li>access the personal information we hold about you;</li>
          <li>have incorrect information corrected;</li>
          <li>request deletion or restriction of processing (where applicable);</li>
          <li>complain to the Information Regulator if you believe your rights have been
            infringed.</li>
        </ul>
        <p>
          Send such requests to
          <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          <strong>Orania Beweging</strong><br />
          Email:
          <a href="mailto:inligting@orania.co.za">inligting&#64;orania.co.za</a>
        </p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>
          We may update this policy from time to time. The "last updated" date at the top of
          the page shows when the newest version took effect. Continued use of this website
          after an update means you have taken note of the revised policy.
        </p>
      </section>
      }
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
      font-size: var(--fs-base);
    }

    .privacy-back a {
      color: var(--action);
      text-decoration: none;
      font-weight: 500;
    }

    .privacy-back a:hover {
      text-decoration: underline;
    }

    h1.page-title {
      font-family: var(--font-display);
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      font-weight: 800;
      color: var(--text-body);
      margin: 0.35rem 0 0.5rem;
      line-height: 0.95;
    }

    .privacy-meta {
      color: var(--text-muted);
      font-size: var(--fs-sm);
      margin: 0 0 1.75rem;
    }

    section {
      margin-bottom: 2rem;
    }

    h2 {
      font-family: var(--font-heading);
      font-size: var(--fs-xl);
      font-weight: 700;
      color: var(--text-body);
      margin: 0 0 0.75rem;
    }

    p, li {
      font-family: var(--font-body);
      font-size: var(--fs-base);
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
      color: var(--action);
    }

    a:focus-visible {
      outline: 2px solid var(--action);
      outline-offset: 2px;
    }
  `]
})
export class PrivacyComponent {
  lang = inject(LangService);
}
