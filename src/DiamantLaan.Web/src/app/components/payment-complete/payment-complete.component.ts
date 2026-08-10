import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService, GuestPurchase, GuestPurchaseRef } from '../../services/purchase.service';
import { CertificateCardComponent, CertificateSquare } from '../shared/certificate-card/certificate-card.component';
import { blokLabel } from '../../utils/afrikaans.util';

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
  imports: [FormsModule, DecimalPipe, CertificateCardComponent],
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
            @if (fromEmail) {
              <h2>Welkom terug</h2>
            } @else {
              <h2>Dankie! Jou betaling is bevestig.</h2>
            }
            <p class="lead">
              Jy het <strong>{{ squareCount }} {{ blokLabel(squareCount) }}</strong> op Diamant Laan geborg,
              <strong>R{{ amount | number:'1.0-0' }}</strong> in totaal.
            </p>

            <div class="pros">
              <h3>Wil jy 'n rekening skep?</h3>
              <p class="pros-intro">Met 'n rekening kan jy:</p>
              <ul>
                <li>Die vordering van elke blok volg, van <em>nog nie begin nie</em> tot <em>klaar geteer</em></li>
                <li>Foto's sien van die werk op jóú blokke</li>
                <li>E-posopdaterings kry sodra jou blokke vorder</li>
                <li>Jou sertifikaat enige tyd weer aflaai</li>
                <li>Al jou aankope en kwitansies op een plek hou</li>
                <li>Later meer blokke koop sonder om jou besonderhede weer in te tik</li>
              </ul>
              <p class="pros-note">Dit neem 'n minuut, en jou blokke word dadelik aan die rekening gekoppel.</p>
            </div>

            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="createAccount()">Skep 'n rekening</button>
              <button type="button" class="btn btn-outline" (click)="declineAccount()">Nee dankie</button>
            </div>
          </div>
        }

        @case ('confirm') {
          <div class="card">
            <h2>Is jy seker?</h2>
            <p class="lead">
              Sonder 'n rekening kan ons nie jou blokke aan jou koppel nie. Jy sal nie kan sien
              wanneer hulle geteer word nie, en jou sertifikaat kan net nóú afgelaai word.
            </p>
            <p class="muted">Jou bydrae bly natuurlik staan, dit gaan nie verlore nie.</p>
            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="createAccount()">Skep tog 'n rekening</button>
              <button type="button" class="btn btn-outline" (click)="confirmDecline()">Nee, gaan voort sonder rekening</button>
            </div>
          </div>
        }

        @case ('name') {
          <div class="card">
            <h2>Naam op jou sertifikaat</h2>
            <p class="lead">Watter naam moet op die sertifikaat verskyn?</p>
            <div class="form-group">
              <label for="cert-name">Naam</label>
              <input
                id="cert-name"
                type="text"
                name="certName"
                maxlength="100"
                placeholder="Bv. Jan van der Merwe"
                [(ngModel)]="certificateName"
                (keyup.enter)="submitName()">
              @if (nameError) {
                <p class="field-error">{{ nameError }}</p>
              }
            </div>
            <div class="actions">
              <button type="button" class="btn btn-primary" (click)="submitName()" [disabled]="saving">
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
              Laai jou sertifikaat gerus nou af. Ons het ook 'n e-pos gestuur met 'n skakel waarmee
              jy later 'n rekening kan skep en weer hier kan uitkom.
            </p>
          } @else {
            <p class="cert-warning">
              Laai jou sertifikaat af voor jy hierdie bladsy verlaat. Sonder 'n rekening of 'n
              e-posadres kan ons jou nie later daarby uitbring nie.
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
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 2.5rem 2rem;
      box-shadow: var(--shadow);
    }
    .centered { text-align: center; }
    h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
      margin-bottom: 0.75rem;
      text-align: center;
    }
    .lead {
      font-size: 0.9375rem;
      color: var(--color-muted);
      text-align: center;
      margin-bottom: 1.25rem;
    }
    .lead strong { color: var(--color-terracotta); }
    .muted {
      font-size: 0.8125rem;
      color: var(--color-muted-light);
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
      font-size: 1.125rem;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }
    .pros-intro {
      font-size: 0.875rem;
      color: var(--color-muted);
      margin-bottom: 0.75rem;
    }
    .pros ul {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem;
    }
    .pros li {
      position: relative;
      padding-left: 1.5rem;
      font-size: 0.875rem;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }
    .pros li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--color-olive);
      font-weight: 700;
    }
    .pros-note {
      font-size: 0.8125rem;
      color: var(--color-muted-light);
    }
    .form-group { margin-bottom: 1.5rem; }
    .form-group label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
      color: var(--color-text);
    }
    .form-group input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 0.9375rem;
      background: var(--color-surface);
      color: var(--color-text);
    }
    .field-error {
      font-size: 0.75rem;
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
    .cert-warning, .cert-note {
      max-width: 560px;
      margin: 1.5rem auto 0;
      text-align: center;
      font-size: 0.8125rem;
    }
    .cert-warning { color: var(--color-warning); }
    .cert-note { color: var(--color-muted); }
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
  readonly blokLabel = blokLabel;

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
    this.purchase.guestPurchase = null;
    this.purchase.pendingSquareIds = [];
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
        this.purchase.guestPurchase = null;
        this.purchase.pendingSquareIds = [];
        this.router.navigate(['/my-blokke']);
      },
      error: () => {
        this.step = 'error';
        this.error = 'Hierdie aankoop is reeds aan \'n rekening gekoppel. Kyk gerus by My Blokke.';
      }
    });
  }
}
