import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService, GuestPurchase, GuestPurchaseRef } from '../../services/purchase.service';
import { BouStepBarComponent } from '../shared/bou-step-bar/bou-step-bar.component';
import { CertificateCardComponent, CertificateSquare } from '../shared/certificate-card/certificate-card.component';
import { randBedrag } from '../../utils/afrikaans.util';
import { TPipe } from '../../i18n/t.pipe';

type Step = 'loading' | 'prompt' | 'confirm' | 'name' | 'certificate' | 'error';

/**
 * What a guest sees after PayFast confirms their payment: an invitation to create an account,
 * a second chance to reconsider if they decline, and then a certificate in the name of their
 * choice before they are sent back to the landing page. Also the landing point for the follow-up
 * email, which carries a claim token in the URL.
 */
@Component({
  selector: 'app-payment-complete',
  standalone: true,
  imports: [FormsModule, BouStepBarComponent, CertificateCardComponent, TPipe],
  template: `
    <div class="container">
      <!-- Step 4 of the same rail the rest of the flow carries, locked: the money
           is paid, so every earlier step is history rather than somewhere to go. -->
      @if (step !== 'loading' && step !== 'error') {
        <app-bou-step-bar [active]="4" />
      }

      @switch (step) {
        @case ('loading') {
          <div class="card centered">
            <div class="spinner"></div>
            <p class="lead">{{ 'Besig om jou aankoop te laai...' | t }}</p>
          </div>
        }

        @case ('prompt') {
          <div class="card">
            <div class="success-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p class="eyebrow">{{ 'Betaling bevestig' | t }}</p>
            @if (fromEmail) {
              <h2 class="display auth-title">{{ 'Welkom terug' | t }}</h2>
            } @else {
              <h2 class="display auth-title">{{ 'Dankie, Stadsbouer!' | t }}</h2>
            }
            <p class="lead">
              {{ 'Jy het' | t }} <strong>{{ squareCount }} m²</strong> {{ 'van die nuwe pad in Orania geborg. Met jou bydrae van' | t }}
              <strong>{{ randBedrag(amount) }}</strong> {{ 'help jy ons om hierdie stukkie pad te teer. Dankie dat jy saam met ons bou!' | t }}
            </p>

            <div class="pros">
              <h3>{{ 'Skep jou rekening' | t }}</h3>
              <p class="pros-intro">{{ 'Ons beveel sterk aan dat jy ’n rekening skep. Met ’n rekening kan jy:' | t }}</p>
              <ul>
                <li>{{ 'Die vordering van jou m²-borgskap volg.' | t }}</li>
                <li>{{ 'Foto’s van die vordering op jou blokkies sien.' | t }}</li>
                <li>{{ 'Opdaterings oor die projek ontvang.' | t }}</li>
                <li>{{ 'Enige tyd toegang tot jou digitale sertifikaat kry.' | t }}</li>
                <li>{{ 'Kwitansies van jou borgskappe aflaai.' | t }}</li>
                <li>{{ 'Later weer ’n m² borg sonder om die hele proses te herhaal.' | t }}</li>
              </ul>
              <p class="pros-note">{{ 'Skep jou rekening binne 30 sekondes.' | t }}</p>
            </div>

            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="createAccount()">{{ 'Skep ’n rekening' | t }}</button>
              <button type="button" class="btn btn-outline" (click)="declineAccount()">{{ 'Nee dankie' | t }}</button>
            </div>
          </div>
        }

        @case ('confirm') {
          <div class="card">
            <h2>{{ 'Hou dit in gedagte!' | t }}</h2>
            <p class="lead">{{ 'Sonder ’n rekening kan ons nie jou blokkie aan jou verbind nie. Jy sal dus nie in kennis gestel kan word wanneer jou blokkie geteer word nie, en jy sal jou sertifikaat slegs een keer kan aflaai. Daarna sal dit nie meer beskikbaar wees nie.' | t }}</p>
            <p class="muted">{{ 'Jou bydrae bly natuurlik geldig en gaan nie verlore nie. ’n Rekening is bloot nodig om jou bydrae aan jou persoonlike m² te koppel en jou in staat te stel om die vordering daarvan te volg.' | t }}</p>
            <p class="muted">{{ 'Ons beveel sterk aan dat jy jou rekening skep!' | t }}</p>
            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="createAccount()">{{ 'Skep ’n rekening' | t }}</button>
              <button type="button" class="btn btn-outline" (click)="confirmDecline()">{{ 'Nee, gaan voort sonder ’n rekening' | t }}</button>
            </div>
          </div>
        }

        @case ('name') {
          <div class="card card--name">
            <h2>{{ (squareCount > 1 ? 'Hoe verkies jy jou Stadsbouer-sertifikate?' : 'Naam op jou sertifikaat') | t }}</h2>

            <!-- Same choice a signed-in buyer gets on the certificate page: one sheet in one
                 name, or a sheet per block for a spouse, a child, a friend. One block has
                 nothing to choose between, so it keeps the plain single-name form. -->
            @if (squareCount > 1) {
              <p class="paneel-lei">{{ 'Opsie een: een Stadsbouer-sertifikaat met jou naam. Al die blokkies sal daarop verskyn.' | t }}</p>
              <p class="paneel-lei">{{ 'Opsie twee: ‘n Individuele sertifikaat vir elke blokkie. Kies self ‘n naam vir elke blokkie, ideaal wanneer jy vir jou gade, kinders of vriende ‘n blokkie borg.' | t }}</p>

              <div class="keuse" role="group" [attr.aria-label]="'Hoe verkies jy jou Stadsbouer-sertifikate' | t">
                <button
                  type="button"
                  class="keuse-btn"
                  [class.is-active]="sameForAll"
                  [attr.aria-pressed]="sameForAll"
                  (click)="stelSelfde(true)"
                >{{ 'Een sertifikaat' | t }}<small>{{ 'Een naam, met al' | t }} {{ squareCount }} {{ 'blokkies' | t }}</small></button>
                <button
                  type="button"
                  class="keuse-btn"
                  [class.is-active]="!sameForAll"
                  [attr.aria-pressed]="!sameForAll"
                  (click)="stelSelfde(false)"
                >{{ 'Verskeie sertifikate' | t }}<small>{{ 'Elke blokkie pad vir ‘n ander persoon' | t }}</small></button>
              </div>
            } @else {
              <p class="lead">{{ 'Die naam wat jy hier invul, sal op jou sertifikaat verskyn. Maak asseblief seker dat dit korrek ingevul is.' | t }}</p>
            }

            @if (sameForAll) {
              <div class="form-group form-group--name">
                <label for="cert-name">{{ (squareCount > 1 ? 'Naam op alle sertifikate' : 'Naam vir sertifikaat') | t }}</label>
                <input
                  id="cert-name"
                  type="text"
                  name="certName"
                  maxlength="100"
                  [placeholder]="'Bv. Jan van der Merwe' | t"
                  autofocus
                  [(ngModel)]="certificateName"
                  (keyup.enter)="submitName()">
              </div>
            } @else {
              @for (blok of blocks; track blok.squareId) {
                <div class="form-group">
                  <label [attr.for]="'naam-' + blok.squareId">{{ 'Blok' | t }} {{ blok.squareId }}</label>
                  <input
                    [id]="'naam-' + blok.squareId"
                    type="text"
                    [name]="'naam' + blok.squareId"
                    maxlength="100"
                    [placeholder]="'Bv. Anna van der Merwe' | t"
                    [(ngModel)]="blok.name"
                    (keyup.enter)="submitName()">
                </div>
              }
            }

            @if (nameError) {
              <p class="field-error">{{ nameError | t }}</p>
            }

            <div class="actions">
              <button type="button" class="btn btn-primary btn-xl" (click)="submitName()" [disabled]="saving">
                {{ (saving ? 'Besig...' : (squareCount > 1 ? 'Stoor en wys my sertifikate' : 'Wys my sertifikaat')) | t }}
              </button>
              <button type="button" class="btn btn-outline" (click)="step = 'prompt'">{{ 'Terug' | t }}</button>
            </div>
          </div>
        }

        @case ('certificate') {
          <app-certificate-card
            [ownerName]="certificateName"
            [squares]="certificateSquares"
            [lockedMode]="vasteModus">
            <button type="button" class="btn btn-outline" (click)="finish()">{{ 'Terug na tuisblad' | t }}</button>
          </app-certificate-card>
          @if (hasEmail) {
            <p class="cert-note">{{ 'Laai jou sertifikaat gerus nou af. Ons het ook ’n e-pos gestuur met ’n skakel waarmee jy later ’n rekening kan skep en weer hier kan uitkom.' | t }}</p>
          } @else {
            <p class="cert-warning">{{ 'Belangrik: laai jou sertifikaat nou af, voor jy hierdie bladsy verlaat. Sonder ’n rekening of ’n e-posadres kan ons dit nie later vir jou stuur nie.' | t }}</p>
          }
        }

        @case ('error') {
          <div class="card centered">
            <h2>{{ 'Ons kon nie jou aankoop kry nie' | t }}</h2>
            <p class="lead">{{ error | t }}</p>
            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="finish()">{{ 'Terug na tuisblad' | t }}</button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; max-width: 800px; }
    .card {
      max-width: 560px;
      margin: 1rem auto;
      background: var(--surface);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius);
      padding: 2.5rem 2rem;
      box-shadow: var(--shadow);
    }
    .centered { text-align: center; }
    /* Marks the certificate-name step as the page's most important control: a visibly
       thicker, brand-coloured border rather than the same quiet card as every other step. */
    .card--name {
      border: 3px solid var(--action);
      box-shadow: 0 0 0 4px rgba(3, 78, 162, 0.08), var(--shadow);
    }
    .eyebrow { text-align: center; margin: 0 0 0.35rem; }
    h2 {
      font-family: var(--font-display);
      font-size: var(--fs-2xl);
      color: var(--color-text);
      margin-bottom: 0.75rem;
      text-align: center;
    }
    .auth-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      margin: 0.35rem 0 0.75rem;
      line-height: 0.95;
    }
    .lead {
      font-size: var(--fs-lg);
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 1.25rem;
    }
    .lead strong { color: var(--color-terracotta); }
    .muted {
      font-size: var(--fs-base);
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .success-icon {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #E8ECD8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .success-icon svg { stroke: var(--color-olive); }
    .pros {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-cream);
      padding: 1.5rem;
      margin-bottom: 1.75rem;
    }
    .pros h3 {
      font-family: var(--font-heading);
      font-size: var(--fs-xl);
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }
    .pros-intro {
      font-size: var(--fs-base);
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    .pros ul {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem;
    }
    .pros li {
      position: relative;
      padding-left: 1.75rem;
      font-size: var(--fs-base);
      color: var(--color-text);
      margin-bottom: 0.625rem;
    }
    .pros li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--color-olive);
      font-weight: 700;
    }
    .pros-note {
      font-size: var(--fs-base);
      color: var(--text-muted);
    }
    .paneel-lei {
      font-size: var(--fs-lg);
      color: var(--text-body);
      margin: 0 0 1.25rem;
    }
    /* Two big, unmissable choices rather than a switch: the audience reads words
       far more reliably than a toggle's on/off state. */
    .keuse {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .keuse-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: var(--tap-large);
      padding: 1.25rem 0.75rem;
      background: var(--surface);
      border: 3px solid var(--border-strong);
      color: var(--ink);
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 800;
      line-height: 1.15;
      cursor: pointer;
    }
    .keuse-btn small {
      font-family: var(--font-body, inherit);
      font-size: var(--fs-base);
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-muted);
    }
    .keuse-btn:hover { border-color: var(--action); }
    .keuse-btn.is-active {
      background: var(--action);
      border-color: var(--action);
      color: #fff;
    }
    .keuse-btn.is-active small { color: rgba(255, 255, 255, 0.85); }

    .form-group { margin-bottom: 1.5rem; }
    .form-group label {
      display: block;
      font-size: var(--fs-lg);
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: var(--color-text);
    }
    .form-group input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: var(--fs-lg);
      min-height: var(--tap-large);
      background: var(--color-surface);
      color: var(--color-text);
    }
    .field-error {
      font-size: var(--fs-base);
      color: #DC2626;
      margin-top: 0.5rem;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .actions .btn { flex: 1; min-width: 170px; }
    /* The name step's primary button is the single most important control on this page. */
    .actions .btn-xl { flex-basis: 100%; }
    .cert-warning, .cert-note {
      max-width: 560px;
      margin: 1.5rem auto 0;
      text-align: center;
      font-size: var(--fs-lg);
    }
    .cert-warning {
      color: #A61B1B;
      font-weight: 700;
      background: #FEF2F2;
      border: 2px solid #E5A0A0;
      border-radius: var(--radius-sm);
      padding: 1rem 1.25rem;
    }
    .cert-note { color: var(--text-muted); }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-terracotta);
      border-radius: 50%;
      margin: 0 auto 1.25rem;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 480px) {
      .card { padding: 1.5rem 1.25rem; }
      .keuse { grid-template-columns: 1fr; }
      .actions { flex-direction: column; }
      .actions .btn { width: 100%; }
    }
  `]
})
export class PaymentCompleteComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private purchase = inject(PurchaseService);
  private auth = inject(AuthService);

  step: Step = 'loading';
  fromEmail = false;
  hasEmail = false;
  error = '';
  nameError = '';
  saving = false;
  amount = 0;
  squareCount = 0;
  certificateName = '';
  certificateSquares: CertificateSquare[] = [];
  sameForAll = true;
  blocks: { squareId: number; name: string }[] = [];
  /** False once the naming window has closed. Never surfaced: the page just stops asking. */
  kanWysig = true;
  readonly randBedrag = randBedrag;

  private ref?: GuestPurchaseRef;

  /**
   * The shape they settled on, which the card then renders without offering a toggle of its own.
   * A single block has nothing to summarise, so it keeps the card's own default.
   */
  get vasteModus(): 'summary' | 'block' | null {
    if (this.squareCount <= 1) return null;
    return this.sameForAll ? 'summary' : 'block';
  }

  ngOnInit() {
    const ref = this.readEmailedLink() ?? this.purchase.guestPurchase;
    if (!ref) {
      this.router.navigate(['/']);
      return;
    }
    this.ref = ref;

    this.purchase.getGuestPurchase(ref).subscribe({
      next: (p) => this.onLoaded(p),
      error: () => {
        this.step = 'error';
        this.error = this.fromEmail
          ? 'Hierdie skakel het verval of is reeds gebruik. Kontak ons gerus as jy hulp nodig het.'
          : 'Die skakel na hierdie aankoop is nie meer geldig nie. Kontak ons gerus as jy hulp nodig het.';
      }
    });
  }

  createAccount() {
    // The token stays in session storage; the register page picks it up from there.
    this.router.navigate(['/registreer'], { queryParams: { gas: this.ref!.purchaseId } });
  }

  declineAccount() {
    this.step = 'confirm';
  }

  confirmDecline() {
    // A purchase whose window has closed keeps the name it was issued under, so there is nothing
    // left to ask; the certificate is what they came back for.
    this.step = this.kanWysig ? 'name' : 'certificate';
  }

  /**
   * Switching to a certificate per block starts every block on the shared name, so they correct
   * the one or two that differ instead of retyping all of them.
   */
  stelSelfde(same: boolean) {
    if (this.sameForAll === same) return;
    this.sameForAll = same;
    this.nameError = '';
    if (!same) {
      for (const blok of this.blocks) {
        if (blok.name.trim().length < 2) {
          blok.name = this.certificateName;
        }
      }
    }
  }

  submitName() {
    if (this.saving) return;

    // The summary name goes to the server either way: it is what a block without a name of its
    // own falls back to, here and on the certificate page after the purchase is claimed.
    let name = this.certificateName.trim();
    if (this.sameForAll) {
      if (name.length < 2) {
        this.nameError = 'Voer asseblief die naam in wat op die sertifikaat moet verskyn.';
        return;
      }
    } else {
      const leeg = this.blocks.find(b => b.name.trim().length < 2);
      if (leeg) {
        this.nameError = `Voer asseblief ’n naam vir blok ${leeg.squareId} in.`;
        return;
      }
      if (name.length < 2) {
        name = this.blocks[0].name.trim();
      }
    }

    const blocks = this.blocks.map(b => ({ squareId: b.squareId, name: b.name.trim() }));

    this.nameError = '';
    this.saving = true;

    this.purchase.setGuestCertificateName(this.ref!, name, this.sameForAll, blocks).subscribe({
      next: () => {
        this.certificateName = name;
        this.blocks = blocks;
        this.wysNaKaart();
        this.saving = false;
        this.step = 'certificate';
      },
      error: (err) => {
        this.saving = false;
        this.nameError = err.error?.message || 'Kon nie die naam stoor nie. Probeer asseblief weer.';
        // The window closed while they were typing. Show the certificate as it stands rather than
        // leaving them in an editor whose save can no longer succeed.
        if (err.status === 403) {
          this.kanWysig = false;
          this.step = 'certificate';
        }
      }
    });
  }

  /** Pushes the saved names onto the sheets. A new array so the card re-fits the name. */
  private wysNaKaart() {
    this.certificateSquares = this.certificateSquares.map(square => ({
      ...square,
      ownerName: this.sameForAll
        ? this.certificateName
        : this.blocks.find(b => b.squareId === square.id)?.name || this.certificateName,
    }));
  }

  finish() {
    this.purchase.clearBouVloei();
    this.router.navigate(['/']);
  }

  /**
   * Handles someone arriving from the follow-up email rather than straight from PayFast. The
   * claim token in the link works on the same endpoints, so storing it lets the rest of the flow
   * (including registration) carry on unchanged.
   */
  private readEmailedLink(): GuestPurchaseRef | null {
    const params = this.route.snapshot.queryParamMap;
    const purchaseId = Number(params.get('aankoop'));
    const token = params.get('sleutel');

    if (!purchaseId || !token) {
      return null;
    }

    const ref = { purchaseId, token };
    this.purchase.guestPurchase = ref;
    this.fromEmail = true;
    return ref;
  }

  private onLoaded(p: GuestPurchase) {
    if (p.paymentStatus !== 'Confirmed') {
      this.step = 'error';
      this.error = 'Hierdie betaling is nog nie bevestig nie.';
      return;
    }

    this.amount = p.amount;
    this.hasEmail = !!p.email;
    this.squareCount = p.squares.length;
    this.certificateSquares = p.squares.map(id => ({ id, purchaseDate: p.purchaseDate }));
    this.certificateName = p.certificateName ?? '';
    // Prefilled from the server so someone returning through the follow-up email sees the choice
    // they already made rather than an empty form.
    this.sameForAll = p.sameForAll ?? true;
    this.kanWysig = p.canEdit ?? true;
    this.blocks = (p.blocks ?? p.squares.map(id => ({ squareId: id, name: this.certificateName })))
      .map(b => ({ ...b }));
    this.wysNaKaart();

    // Someone who signed in on the way back can have the purchase attached to that account.
    if (this.auth.currentUser()) {
      this.claimForSignedInUser();
      return;
    }

    this.step = 'prompt';
  }

  private claimForSignedInUser() {
    this.purchase.claimGuestPurchase(this.ref!).subscribe({
      next: () => {
        this.purchase.clearBouVloei();
        this.router.navigate(['/my-blokke']);
      },
      error: () => {
        this.step = 'error';
        this.error = 'Hierdie aankoop is reeds aan ’n rekening gekoppel. Kyk gerus by My blokke.';
      }
    });
  }
}
