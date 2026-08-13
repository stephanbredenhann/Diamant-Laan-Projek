import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PurchaseService, PayFastForm, GuestPurchaseRef } from '../../services/purchase.service';
import { AuthService } from '../../services/auth.service';
import { meterFrase, randBedrag } from '../../utils/afrikaans.util';
import { validateEmail } from '../../utils/validation.util';
import { BouStepBarComponent } from '../shared/bou-step-bar/bou-step-bar.component';

/**
 * Step 3 — Erkenning / betalingsvoorskou. PayFast handoff unchanged.
 */
@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [RouterLink, FormsModule, BouStepBarComponent],
  template: `
    <div class="container-wide bou-shell">
      <div class="header-row">
        <div>
          <p class="eyebrow page-eyebrow">Stap 3 van 4 · Betalingsvoorskou</p>
          <div class="visually-hidden" aria-live="polite">{{ stepAnnouncement }}</div>
          <h1 class="page-title">Bevestig jou bourekord.</h1>
          <p class="page-lead">
            @if (isGuest) {
              Jy gaan as ’n gas voort. Ná betaling kan jy ’n rekening skep om sertifikate en vordering te bestuur.
            } @else {
              Bevestig jou bydrae. Jy word na PayFast gestuur om veilig te betaal.
            }
          </p>
        </div>
        <span class="work-stamp stamp">STADSBOUER-TOEKENNING</span>
      </div>

      <app-bou-step-bar [active]="3" />

      <div class="betaal-layout">
      <form class="checkout-card ledger-paper surface-card" (ngSubmit)="submitPayment()">
        @if (isGuest) {
          <div class="guest-box">
            <p class="guest-note">
              Jou e-pos word gebruik vir bevestiging, jou sertifikaat en die opsionele rekening-skakel.
            </p>
            <div class="form-group">
              <label for="guest-email">E-pos <span class="required-mark" aria-hidden="true">*</span></label>
              <input
                id="guest-email"
                type="email"
                name="guestEmail"
                autocomplete="email"
                required
                placeholder="jou@epos.co.za"
                [class.invalid]="emailError"
                (blur)="checkEmail()"
                [(ngModel)]="guestEmail">
              @if (emailError) {
                <p class="error-alert">{{ emailError }}</p>
              }
            </div>
          </div>
        }

        <div class="redirect-notice">
          <p>
            Wanneer jy op <strong>Betaal veilig</strong> druk, gaan jy na PayFast se webwerf.
            Daarna kom jy terug na hierdie projek.
          </p>
        </div>

        @if (error) {
          <div class="error-alert">{{ error }}</div>
        }

        <button type="submit" class="btn btn-primary btn-xl btn-full" [disabled]="loading">
          @if (loading) {
            <span class="btn-spinner"></span>
            Besig...
          } @else {
            Betaal veilig
          }
        </button>
        <a routerLink="/bou/kies" class="btn btn-outline btn-xl btn-full terug-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Gaan terug
        </a>
      </form>

      <!-- The same black panel as the picker, but read-only: this is the last
           look at the numbers before the money moves, not another chance to
           change them. Changing anything means going back a step. -->
      <aside class="keuse-kaart">
        <p class="eyebrow">Jou keuse</p>
        <p class="teller">{{ squareIds.length }} <span>m²</span></p>
        <p class="teller-etiket">{{ meterFrase(squareIds.length) }} pad</p>
        <p class="totaal">{{ randBedrag(totalAmount) }}</p>
        <p class="totaal-nota">R500 per blokkie</p>

        <p class="blokke-kop">Jou bloknommers</p>
        <ul class="gekose-blokke">
          @for (id of squareIds; track id) {
            <li class="gekose-blok">{{ id }}</li>
          }
        </ul>
        <p class="kontroleer">
          Kontroleer die nommers. Druk op <strong>Gaan terug</strong> om iets te verander.
        </p>
      </aside>
      </div>
    </div>
  `,
  styles: [`
    .header-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }
    .stamp {
      align-self: flex-start;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    .betaal-layout {
      display: grid;
      grid-template-columns: minmax(0, 44rem) 340px;
      gap: 2rem;
      align-items: start;
      margin-top: 1.5rem;
    }
    .checkout-card {
      max-width: 44rem;
      padding: 2rem;
    }

    /* Lifted from the picker's sidebar so the two pages read as one flow. */
    .keuse-kaart {
      background: var(--tar);
      color: #fff;
      padding: 1.75rem;
      position: sticky;
      top: 5.5rem;
    }
    .keuse-kaart .eyebrow { color: rgba(255,255,255,0.55); }
    .teller {
      font-family: var(--font-display);
      font-size: 4rem;
      font-weight: 800;
      line-height: 1;
      margin: 0.75rem 0 0;
      font-variant-numeric: tabular-nums;
    }
    .teller span { font-size: 2rem; opacity: 0.6; }
    .teller-etiket { color: rgba(255,255,255,0.65); font-size: var(--fs-base); }
    .totaal {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--action);
      margin-top: 0.75rem;
    }
    .totaal-nota { color: rgba(255,255,255,0.6); font-size: var(--fs-sm); }
    .blokke-kop {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--fs-base);
      margin: 1.5rem 0 0;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    /* Same green tiles as on the map, minus the remove button: nothing here is
       clickable, so they are list items rather than controls. */
    .gekose-blokke {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
      margin: 0.75rem 0 1rem;
      padding: 0;
    }
    .gekose-blok {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 5rem;
      min-height: 3rem;
      padding: 0.5rem 0.6rem;
      background: var(--blok-gekies);
      border: 2px solid #FFFFFF;
      color: #FFFFFF;
      font-family: var(--font-display);
      font-size: var(--fs-xl);
      font-weight: 800;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .kontroleer {
      color: rgba(255,255,255,0.75);
      font-size: var(--fs-base);
      margin: 0;
    }

    .guest-box { margin-bottom: 1.5rem; }
    .guest-note {
      font-size: var(--fs-base);
      color: var(--text-body);
      margin-bottom: 1rem;
    }
    .required-mark { color: var(--action); }
    input.invalid { border-color: #A61B1B; }
    .redirect-notice {
      background: color-mix(in srgb, var(--route-blue) 6%, white);
      border: 1px solid color-mix(in srgb, var(--route-blue) 18%, transparent);
      padding: 1.1rem 1.25rem;
      margin-bottom: 1.5rem;
    }
    .terug-btn {
      margin-top: 0.75rem;
      text-align: center;
    }
    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 3px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
      display: inline-block;
      margin-right: 0.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 1000px) {
      /* One column, and the summary goes first: check the numbers, then fill in
         the email and pay. The panel unsticks so it does not follow you down. */
      .betaal-layout { grid-template-columns: 1fr; }
      .keuse-kaart { position: static; order: -1; }
      .checkout-card { max-width: none; }
    }

    @media (max-width: 600px) {
      .checkout-card { padding: 1.25rem; }
      .keuse-kaart { padding: 1.25rem; }
      .teller { font-size: 2.75rem; }
      .teller span { font-size: 1.5rem; }
      .totaal { font-size: 2rem; }
      .stamp { font-size: 0.7rem; padding: 0.35rem 0.5rem; margin-top: 0; }
      .redirect-notice { padding: 0.875rem 1rem; margin-bottom: 1.25rem; }
      .redirect-notice p { font-size: 1rem; }
    }
  `]
})
export class PaymentComponent implements OnInit {
  private router = inject(Router);
  private purchase = inject(PurchaseService);
  private auth = inject(AuthService);

  squareIds: number[] = [];
  totalAmount = 0;
  loading = false;
  error = '';
  guestEmail = '';
  emailError = '';
  isGuest = false;
  private createdPurchaseId?: number;
  private guestRef?: GuestPurchaseRef;
  readonly meterFrase = meterFrase;
  readonly randBedrag = randBedrag;
  stepAnnouncement = 'Stap 3 van 4: Bevestig jou bourekord';

  ngOnInit() {
    this.isGuest = !this.auth.currentUser();

    const ids = this.purchase.pendingSquareIds;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      this.squareIds = ids;
      this.totalAmount = this.squareIds.length * 500;
    } else {
      this.router.navigate(['/bou']);
    }
  }

  submitPayment() {
    if (this.loading || this.squareIds.length === 0) return;
    this.error = '';
    this.emailError = '';

    if (this.isGuest) {
      this.submitGuestPayment();
      return;
    }

    this.loading = true;

    if (this.createdPurchaseId) {
      this.requestPayFastForm(this.createdPurchaseId);
      return;
    }

    this.purchase.createPurchase(this.squareIds).subscribe({
      next: (res) => {
        this.createdPurchaseId = res.purchaseId;
        this.requestPayFastForm(res.purchaseId);
      },
      error: (err) => {
        this.error = err.error?.message || 'Aankoop het misluk.';
        this.loading = false;
      }
    });
  }

  checkEmail() {
    this.emailError = this.isGuest ? validateEmail(this.guestEmail) ?? '' : '';
  }

  private submitGuestPayment() {
    const email = this.guestEmail.trim();
    const invalid = validateEmail(email);
    if (invalid) {
      this.emailError = invalid;
      return;
    }

    this.loading = true;

    if (this.guestRef) {
      this.requestGuestPayFastForm(this.guestRef);
      return;
    }

    this.purchase.createGuestPurchase(this.squareIds, email).subscribe({
      next: (res) => {
        this.guestRef = { purchaseId: res.purchaseId, token: res.token };
        this.purchase.guestPurchase = this.guestRef;
        this.requestGuestPayFastForm(this.guestRef);
      },
      error: (err) => {
        this.error = err.error?.message || 'Aankoop het misluk.';
        this.loading = false;
      }
    });
  }

  private requestPayFastForm(purchaseId: number) {
    this.purchase.getPayFastForm(purchaseId).subscribe({
      next: (form) => this.postToPayFast(form),
      error: (err) => {
        this.error = err.error?.message || 'Kon nie PayFast betaling voorberei nie.';
        this.loading = false;
      }
    });
  }

  private requestGuestPayFastForm(ref: GuestPurchaseRef) {
    this.purchase.getGuestPayFastForm(ref).subscribe({
      next: (form: PayFastForm) => this.postToPayFast(form),
      error: (err) => {
        this.error = err.error?.message || 'Kon nie PayFast betaling voorberei nie.';
        this.loading = false;
      }
    });
  }

  private postToPayFast(form: { actionUrl: string; fields: Record<string, string> }) {
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = form.actionUrl;
    f.style.display = 'none';

    for (const [key, value] of Object.entries(form.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      f.appendChild(input);
    }

    document.body.appendChild(f);
    f.submit();
    document.body.removeChild(f);
  }
}
