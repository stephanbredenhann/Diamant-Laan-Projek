import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService, GuestPurchase, GuestPurchaseRef } from '../../services/purchase.service';
import { CertificateCardComponent, CertificateSquare } from '../shared/certificate-card/certificate-card.component';
import { meterFrase, randBedrag } from '../../utils/afrikaans.util';

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
  imports: [FormsModule, CertificateCardComponent],
  template: `
    <div class="container">
      @switch (step) {
        @case ('loading') {
          <div class="card centered">
            <div class="spinner"></div>
            <p class="lead">Besig om jou aankoop te laai...</p>
          </div>
        }

        @case ('prompt') {
          <div class="card">
            <div class="success-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p class="eyebrow">Betaling bevestig</p>
            @if (fromEmail) {
              <h2 class="display auth-title">Welkom terug</h2>
            } @else {
              <h2 class="display auth-title">Dankie, Stadsbouer.</h2>
            }
            <p class="lead">
              Jy het <strong>{{ meterFrase(squareCount) }}</strong> pad in Orania geborg,
              <strong>{{ randBedrag(amount) }}</strong> in totaal. Hierdie stuk pad word nou vir jou opgeteken.
            </p>

            <div class="pros">
              <h3>Wil jy ’n rekening skep?</h3>
              <p class="pros-intro">Met ’n rekening kan jy:</p>
              <ul>
                <li>Die vordering van jou vierkante meter volg, van <em>nog nie begin nie</em> tot <em>klaar geteer</em></li>
                <li>Foto’s sien van die werk op jóú stuk pad</li>
                <li>E-posopdaterings kry sodra die werk vorder</li>
                <li>Jou sertifikaat enige tyd weer aflaai</li>
                <li>Al jou aankope en kwitansies op een plek hou</li>
                <li>Later weer koop sonder om jou besonderhede weer in te tik</li>
              </ul>
              <p class="pros-note">Dit neem net ’n minuut, en jou vierkante meter word dadelik aan die rekening gekoppel.</p>
            </div>

            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="createAccount()">Skep ’n rekening</button>
              <button type="button" class="btn btn-outline" (click)="declineAccount()">Nee dankie</button>
            </div>
          </div>
        }

        @case ('confirm') {
          <div class="card">
            <h2>Is jy seker?</h2>
            <p class="lead">
              Sonder ’n rekening kan ons nie jou vierkante meter aan jou koppel nie. Jy sal nie kan sien
              wanneer dit geteer word nie, en jou sertifikaat kan net nóú afgelaai word — daarna nie weer nie.
            </p>
            <p class="muted">Jou bydrae bly natuurlik staan, dit gaan nie verlore nie.</p>
            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="createAccount()">Skep tog ’n rekening</button>
              <button type="button" class="btn btn-outline" (click)="confirmDecline()">Nee, gaan voort sonder rekening</button>
            </div>
          </div>
        }

        @case ('name') {
          <div class="card card--name">
            <h2>Naam op jou sertifikaat</h2>
            <p class="lead">
              Dit is die belangrikste stap: watter naam moet op jou sertifikaat verskyn?
              Dit is die naam wat gedruk word, so maak seker dit is reg.
            </p>
            <div class="form-group form-group--name">
              <label for="cert-name">Naam vir sertifikaat</label>
              <input
                id="cert-name"
                type="text"
                name="certName"
                maxlength="100"
                placeholder="Bv. Jan van der Merwe"
                autofocus
                [(ngModel)]="certificateName"
                (keyup.enter)="submitName()">
              @if (nameError) {
                <p class="field-error">{{ nameError }}</p>
              }
            </div>
            <div class="actions">
              <button type="button" class="btn btn-primary btn-xl" (click)="submitName()" [disabled]="saving">
                {{ saving ? 'Besig...' : 'Wys my sertifikaat' }}
              </button>
              <button type="button" class="btn btn-outline" (click)="step = 'prompt'">Terug</button>
            </div>
          </div>
        }

        @case ('certificate') {
          <app-certificate-card
            [ownerName]="certificateName"
            [squares]="certificateSquares">
            <button type="button" class="btn btn-outline" (click)="finish()">Terug na tuisblad</button>
          </app-certificate-card>
          @if (hasEmail) {
            <p class="cert-note">
              Laai jou sertifikaat gerus nou af. Ons het ook ’n e-pos gestuur met ’n skakel waarmee
              jy later ’n rekening kan skep en weer hier kan uitkom.
            </p>
          } @else {
            <p class="cert-warning">
              Belangrik: laai jou sertifikaat nou af, voor jy hierdie bladsy verlaat. Sonder ’n
              rekening of ’n e-posadres kan ons dit nie later vir jou stuur nie.
            </p>
          }
        }

        @case ('error') {
          <div class="card centered">
            <h2>Ons kon nie jou aankoop kry nie</h2>
            <p class="lead">{{ error }}</p>
            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="finish()">Terug na tuisblad</button>
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
  readonly meterFrase = meterFrase;
  readonly randBedrag = randBedrag;

  private ref?: GuestPurchaseRef;

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
    this.step = 'name';
  }

  submitName() {
    if (this.saving) return;

    const name = this.certificateName.trim();
    if (name.length < 2) {
      this.nameError = 'Voer asseblief die naam in wat op die sertifikaat moet verskyn.';
      return;
    }

    this.nameError = '';
    this.saving = true;

    this.purchase.setGuestCertificateName(this.ref!, name).subscribe({
      next: () => {
        this.certificateName = name;
        this.saving = false;
        this.step = 'certificate';
      },
      error: (err) => {
        this.saving = false;
        this.nameError = err.error?.message || 'Kon nie die naam stoor nie. Probeer asseblief weer.';
      }
    });
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
