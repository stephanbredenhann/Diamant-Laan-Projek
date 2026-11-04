import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  DonationPreview,
  DonationResult,
  PAYMENT_METHOD_LABELS,
  PROOF_METHODS,
  PaymentMethod
} from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';
import { PhoneInputComponent } from '../shared/phone-input/phone-input.component';
import { MAX_BLOK_ID } from '../bou/kaart/blok-reekse';
import { ontleedBlokNommers } from '../../utils/blok-nommers';
import { bevestigingPas, blokkeVirBedrag, formatRand, nuweSleutel } from '../../utils/groot-skenking';
import { normalizePhoneLocal, validateEmail, validateName, validatePhone } from '../../utils/validation.util';

type Stap = 'vorm' | 'voorskou' | 'klaar';
type KiesMetode = 'next' | 'ranges';

/**
 * "Groot skenking": one donation covering hundreds or thousands of blocks, such as R700 000 for
 * 1 400. Three screens: the form, a server-computed preview the admin has to confirm by typing the
 * block count, and the result. The preview's exact block list is what gets sold, so nothing the
 * admin did not see can slip in between.
 */
@Component({
  selector: 'app-admin-groot-skenking',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, PhoneInputComponent],
  template: `
    <div class="admin-content">
      @switch (stap) {
        @case ('vorm') {
          <div class="form-card">
            <h3>Groot skenking</h3>
            <p class="hint">
              Teken ’n groot skenking aan en ken die regte aantal blokke in een keer toe.
              Jy sien eers ’n voorskou; niks word gestoor voordat jy dit bevestig nie.
            </p>

            <form (ngSubmit)="voorskou()" class="admin-form">
              <div class="grid">
                <div class="field">
                  <label for="firstName">Voornaam</label>
                  <input id="firstName" [(ngModel)]="firstName" name="firstName" maxlength="100" required>
                </div>
                <div class="field">
                  <label for="lastName">Van</label>
                  <input id="lastName" [(ngModel)]="lastName" name="lastName" maxlength="100" required>
                </div>
              </div>
              <div class="field">
                <label for="email">E-pos</label>
                <input id="email" type="email" [(ngModel)]="email" name="email" maxlength="256" required>
              </div>
              <div class="field">
                <label for="phoneNumber">Foonnommer</label>
                <app-phone-input
                  [(countryCode)]="phoneCountryCode"
                  [(phoneNumber)]="phoneNumber"
                />
                @if (phoneError) {
                  <p class="field-error">{{ phoneError }}</p>
                }
              </div>
              <div class="field checkbox">
                <label>
                  <input type="checkbox" [(ngModel)]="isOraniaResident" name="isOraniaResident">
                  Inwoner van Orania?
                </label>
              </div>
              <div class="field checkbox">
                <label>
                  <input type="checkbox" [(ngModel)]="isOraniaBewegingMember" name="isOraniaBewegingMember">
                  Lid van Orania Beweging?
                </label>
              </div>

              <div class="field amount-block">
                <label for="bedrag">Bedrag (rand)</label>
                <div class="amount-row">
                  <span class="amount-prefix">R</span>
                  <input
                    id="bedrag"
                    type="text"
                    inputmode="numeric"
                    [(ngModel)]="bedragTeks"
                    name="bedrag"
                    placeholder="700 000"
                    autocomplete="off">
                </div>
                @if (bedragTeks.trim()) {
                  @if (bedragUitslag.fout) {
                    <p class="field-error">{{ bedragUitslag.fout }}</p>
                  } @else {
                    <p class="amount-blocks">= {{ bedragUitslag.blokke }} {{ bedragUitslag.blokke === 1 ? 'blok' : 'blokke' }}</p>
                  }
                }
              </div>

              <fieldset class="field mode-block">
                <legend>Watter blokke?</legend>
                <label class="radio">
                  <input type="radio" name="metode" value="next" [(ngModel)]="metode">
                  Volgende beskikbare blokke
                </label>
                @if (metode === 'next') {
                  <div class="sub-option checkbox">
                    <label>
                      <input type="checkbox" [(ngModel)]="includeReserved" name="includeReserved">
                      Sluit gereserveerde blokke in
                    </label>
                  </div>
                  <p class="sub-hint">Die laagste bloknommers wat nog te koop is, word gebruik.</p>
                }
                <label class="radio">
                  <input type="radio" name="metode" value="ranges" [(ngModel)]="metode">
                  Spesifieke reekse
                </label>
                @if (metode === 'ranges') {
                  <textarea
                    id="reekse"
                    rows="3"
                    [(ngModel)]="reekseTeks"
                    name="reekse"
                    placeholder="Byvoorbeeld: 1001-2400"></textarea>
                  <p class="sub-hint">
                    Skei met kommas. Gebruik ’n koppelteken vir ’n reeks. Gereserveerde blokke mag hier gekies word.
                  </p>
                  @if (reekseTeks.trim()) {
                    @if (reekseUitslag.fout) {
                      <p class="field-error">{{ reekseUitslag.fout }}</p>
                    } @else if (!bedragUitslag.fout && reekseUitslag.ids.length !== bedragUitslag.blokke) {
                      <p class="field-error">
                        Die reekse bevat {{ reekseUitslag.ids.length }} blokke, maar die bedrag koop {{ bedragUitslag.blokke }}.
                      </p>
                    } @else {
                      <p class="amount-blocks">{{ reekseUitslag.ids.length }} blokke in die reekse</p>
                    }
                  }
                }
              </fieldset>

              <div class="field">
                <label for="certificateName">Naam op sertifikaat</label>
                <input
                  id="certificateName"
                  [(ngModel)]="certificateName"
                  name="certificateName"
                  maxlength="100"
                  [placeholder]="donorNaam || 'Skenker se naam'">
                <p class="sub-hint">Een opsommingsertifikaat vir al die blokke. Los leeg om die skenker se eie naam te gebruik.</p>
              </div>

              <div class="field">
                <label for="paymentMethod">Betaalmetode</label>
                <select id="paymentMethod" [(ngModel)]="paymentMethod" name="paymentMethod" (ngModelChange)="onMethodChange()">
                  <option value="EFT">EFT</option>
                  <option value="Cash">Kontant</option>
                  <option value="Card">Kaart</option>
                  <option value="Bitcoin">Bitcoin</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>
              @if (allowsProof(paymentMethod)) {
                <div class="field">
                  <label for="proof">Bewys van betaling (PDF, opsioneel)</label>
                  <input id="proof" type="file" accept="application/pdf" (change)="onFileSelected($event)">
                </div>
              }

              <app-alert [message]="message" type="error"></app-alert>

              <button type="submit" class="btn btn-primary" [disabled]="loading">
                {{ loading ? 'Besig...' : 'Wys voorskou' }}
              </button>
            </form>
          </div>
        }

        @case ('voorskou') {
          @if (preview; as p) {
            <div class="form-card summary-card">
              <h3>Kontroleer die skenking</h3>
              <p class="hint">Niks is nog gestoor nie. Lees dit deur voordat jy bevestig.</p>

              <div class="headline">
                <div>
                  <span class="headline-label">Bedrag</span>
                  <span class="headline-value">{{ rand(p.amount) }}</span>
                </div>
                <div>
                  <span class="headline-label">Blokke</span>
                  <span class="headline-value">{{ p.squareCount }}</span>
                </div>
              </div>

              <dl class="details">
                <dt>Skenker</dt>
                <dd>
                  {{ donorNaam }} &lt;{{ email.trim() }}&gt;
                  <span class="badge" [class.badge-new]="!p.existingDonor">
                    {{ p.existingDonor ? 'Bestaande rekening' : 'Nuwe rekening' }}
                  </span>
                </dd>
                <dt>Blokke</dt>
                <dd><div class="ranges">{{ p.ranges }}</div></dd>
                <dt>Sertifikaat</dt>
                <dd>Een opsommingsertifikaat op naam van <strong>{{ certificateName.trim() || donorNaam }}</strong></dd>
                <dt>Betaalmetode</dt>
                <dd>{{ methodLabel(paymentMethod) }}{{ proofFile ? ' · bewys: ' + proofFile.name : '' }}</dd>
                <dt>Beskikbaar</dt>
                <dd>
                  {{ p.availableCount }} blokke is tans te koop{{ p.includeReserved ? ' (gereserveerdes ingesluit)' : '' }};
                  na hierdie skenking bly {{ p.availableCount - p.squareCount }} oor.
                </dd>
              </dl>

              <p class="email-note">
                @if (p.existingDonor) {
                  Die skenker kry een bevestigings-e-pos.
                } @else {
                  ’n Rekening word geskep en die skenker kry een welkom-e-pos met ’n tydelike wagwoord.
                }
              </p>

              <div class="field confirm-field">
                <label for="bevestig">Tik <strong>{{ p.squareCount }}</strong> om te bevestig</label>
                <input
                  id="bevestig"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  [(ngModel)]="bevestigTeks"
                  name="bevestig"
                  [disabled]="loading">
              </div>

              <app-alert [message]="message" type="error"></app-alert>

              <div class="actions">
                <button type="button" class="btn btn-outline" [disabled]="loading" (click)="terug()">
                  Terug na vorm
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="loading || !kanBevestig"
                  (click)="bevestig()">
                  {{ loading ? 'Besig...' : 'Bevestig skenking van ' + rand(p.amount) }}
                </button>
              </div>
            </div>
          }
        }

        @case ('klaar') {
          @if (result; as r) {
            <div class="form-card summary-card">
              <h3>Skenking aangeteken</h3>
              @if (r.replayed) {
                <app-alert
                  message="Hierdie skenking was reeds aangeteken. Hier is die oorspronklike aankoop; niks is twee keer verkoop of gestuur nie."
                  type="info"></app-alert>
              }
              <div class="headline">
                <div>
                  <span class="headline-label">Aankoop</span>
                  <span class="headline-value">#{{ r.purchaseId }}</span>
                </div>
                <div>
                  <span class="headline-label">Bedrag</span>
                  <span class="headline-value">{{ rand(r.amount) }}</span>
                </div>
                <div>
                  <span class="headline-label">Blokke</span>
                  <span class="headline-value">{{ r.squareCount }}</span>
                </div>
              </div>
              <dl class="details">
                <dt>Blokke</dt>
                <dd><div class="ranges">{{ r.ranges }}</div></dd>
                <dt>E-pos</dt>
                <dd>
                  @if (r.replayed) {
                    Geen nuwe e-pos nie; die eerste versoek het dit reeds gestuur.
                  } @else if (r.emailSent) {
                    Gestuur{{ r.newDonor ? ' (welkom-e-pos met tydelike wagwoord)' : ' (bevestiging)' }}.
                  } @else if (r.emailQueued) {
                    In die tou: dit kon nie dadelik gestuur word nie en word outomaties weer probeer.
                  } @else {
                    Nie gestuur nie: die rekening het geen e-posadres nie.
                  }
                </dd>
                @if (r.hasProof) {
                  <dt>Bewys</dt>
                  <dd>Bewys van betaling gestoor.</dd>
                }
              </dl>
              <button type="button" class="btn btn-primary" (click)="begin()">Nuwe skenking</button>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .admin-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1100px;
    }
    .form-card {
      max-width: 640px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }
    .form-card h3 {
      font-family: var(--font-heading);
      font-size: 1rem;
      margin-bottom: 0.375rem;
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin-bottom: 1.25rem;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .field { margin-bottom: 1rem; }
    .field label, .field legend {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }
    .field.checkbox label, .sub-option label, .radio {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      font-size: 0.8125rem;
    }
    input[type="checkbox"], input[type="radio"] {
      width: 1rem;
      height: 1rem;
      padding: 0;
      margin: 0;
      border: none;
      box-shadow: none;
      flex: none;
      accent-color: var(--color-terracotta);
    }
    .field input[type="text"],
    .field input[type="email"],
    .field select,
    .field textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }
    .field textarea { font-family: inherit; resize: vertical; margin-top: 0.5rem; }
    .field-error {
      color: var(--color-error, #c0392b);
      font-size: 0.8125rem;
      margin-top: 0.375rem;
    }
    .sub-hint {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin: 0.375rem 0 0.75rem;
    }
    .amount-block, .mode-block {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 1rem;
    }
    .mode-block { min-width: 0; }
    .mode-block .radio { margin: 0.5rem 0; }
    .sub-option { margin: 0.25rem 0 0 1.5rem; }
    .mode-block .sub-hint { margin-left: 1.5rem; }
    .amount-row { display: flex; align-items: center; gap: 0.5rem; }
    .amount-prefix {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 1.125rem;
    }
    .amount-row input { font-size: 1.125rem !important; font-weight: 600; }
    .amount-blocks {
      margin-top: 0.5rem;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 1rem;
      color: var(--color-text);
    }
    .headline {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .headline > div {
      background: var(--color-cream);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      text-align: center;
    }
    .headline-label {
      display: block;
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }
    .headline-value {
      display: block;
      font-family: var(--font-heading);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .details {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.5rem 1rem;
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }
    .details dt { font-weight: 600; color: var(--color-muted); }
    .details dd { margin: 0; min-width: 0; }
    .ranges {
      max-height: 8rem;
      overflow-y: auto;
      overflow-wrap: anywhere;
      font-variant-numeric: tabular-nums;
    }
    .badge {
      display: inline-block;
      margin-left: 0.375rem;
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 600;
      background: #E8ECD8;
      color: #5A6A32;
    }
    .badge-new { background: #FDF3E7; color: #9A5B13; }
    .email-note { font-size: 0.8125rem; color: var(--color-muted); margin-bottom: 1rem; }
    .confirm-field input { max-width: 12rem; font-size: 1.125rem !important; font-weight: 600; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
      .details { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminGrootSkenkingComponent {
  private admin = inject(AdminService);

  stap: Stap = 'vorm';

  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  phoneCountryCode = '+27';
  phoneError = '';
  isOraniaResident = false;
  isOraniaBewegingMember = false;
  bedragTeks = '';
  metode: KiesMetode = 'next';
  includeReserved = false;
  reekseTeks = '';
  certificateName = '';
  paymentMethod: PaymentMethod = 'EFT';
  proofFile: File | null = null;

  preview: DonationPreview | null = null;
  result: DonationResult | null = null;
  bevestigTeks = '';
  /** One per preview, so a retried or double-sent confirmation is recognised by the server. */
  private sleutel = '';

  message = '';
  loading = false;

  readonly rand = formatRand;

  get bedragUitslag() {
    return blokkeVirBedrag(this.bedragTeks, MAX_BLOK_ID);
  }

  /** Cached on the text: the template reads it several times a pass and it can be 4 000 ids. */
  get reekseUitslag() {
    if (this.reekseCache?.teks !== this.reekseTeks) {
      this.reekseCache = {
        teks: this.reekseTeks,
        uitslag: ontleedBlokNommers(this.reekseTeks, MAX_BLOK_ID, MAX_BLOK_ID)
      };
    }
    return this.reekseCache.uitslag;
  }
  private reekseCache: { teks: string; uitslag: ReturnType<typeof ontleedBlokNommers> } | null = null;

  get donorNaam(): string {
    return `${this.firstName.trim()} ${this.lastName.trim()}`.trim();
  }

  get kanBevestig(): boolean {
    return this.preview != null && bevestigingPas(this.bevestigTeks, this.preview.squareCount);
  }

  methodLabel(method?: string | null): string {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? '';
  }

  allowsProof(method?: string | null): boolean {
    return PROOF_METHODS.includes(method as PaymentMethod);
  }

  onMethodChange() {
    if (!this.allowsProof(this.paymentMethod)) this.proofFile = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.proofFile = input.files?.[0] ?? null;
  }

  voorskou() {
    if (this.loading) return;
    this.message = '';
    this.phoneError = '';

    const fout = this.kontroleerVorm();
    if (fout) {
      this.message = fout;
      return;
    }

    const bedrag = this.bedragUitslag;
    this.loading = true;
    this.admin.previewDonation({
      email: this.email.trim(),
      amount: bedrag.bedrag,
      mode: this.metode,
      includeReserved: this.includeReserved,
      squareIds: this.metode === 'ranges' ? this.reekseUitslag.ids : undefined
    }).subscribe({
      next: (p) => {
        this.preview = p;
        this.sleutel = nuweSleutel();
        this.bevestigTeks = '';
        this.stap = 'voorskou';
        this.loading = false;
      },
      error: (err) => {
        this.message = foutBoodskap(err, 'Kon nie die voorskou laai nie.');
        this.loading = false;
      }
    });
  }

  bevestig() {
    const p = this.preview;
    if (!p || this.loading || !this.kanBevestig) return;
    this.message = '';

    const formData = new FormData();
    formData.append('firstName', this.firstName.trim());
    formData.append('lastName', this.lastName.trim());
    formData.append('email', this.email.trim());
    formData.append('phoneNumber', normalizePhoneLocal(this.phoneNumber, this.phoneCountryCode));
    formData.append('phoneCountryCode', this.phoneCountryCode);
    formData.append('isOraniaResident', String(this.isOraniaResident));
    formData.append('isOraniaBewegingMember', String(this.isOraniaBewegingMember));
    formData.append('paymentMethod', this.paymentMethod);
    formData.append('certificateName', this.certificateName.trim());
    formData.append('amount', String(p.amount));
    // One field, not one per block: a form stops binding at 1 024 values.
    formData.append('squareIds', p.squareIds.join(','));
    formData.append('idempotencyKey', this.sleutel);
    if (this.allowsProof(this.paymentMethod) && this.proofFile) {
      formData.append('proofOfPayment', this.proofFile);
    }

    this.loading = true;
    this.admin.commitDonation(formData).subscribe({
      next: (r) => {
        this.result = r;
        this.stap = 'klaar';
        this.loading = false;
      },
      error: (err) => {
        // Stays on the summary with the same key, so trying again can never sell twice. A block
        // sold in the meantime needs a fresh preview, which "Terug na vorm" gives.
        this.message = foutBoodskap(err, 'Die skenking kon nie aangeteken word nie. Probeer weer.');
        this.loading = false;
      }
    });
  }

  terug() {
    this.preview = null;
    this.bevestigTeks = '';
    this.message = '';
    this.stap = 'vorm';
  }

  begin() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.phoneNumber = '';
    this.phoneCountryCode = '+27';
    this.phoneError = '';
    this.isOraniaResident = false;
    this.isOraniaBewegingMember = false;
    this.bedragTeks = '';
    this.metode = 'next';
    this.includeReserved = false;
    this.reekseTeks = '';
    this.certificateName = '';
    this.paymentMethod = 'EFT';
    this.proofFile = null;
    this.preview = null;
    this.result = null;
    this.bevestigTeks = '';
    this.sleutel = '';
    this.message = '';
    this.stap = 'vorm';
  }

  private kontroleerVorm(): string | null {
    const naamFout = validateName(this.firstName, 'Voornaam') ?? validateName(this.lastName, 'Van');
    if (naamFout) return naamFout;

    const emailFout = validateEmail(this.email);
    if (emailFout) return emailFout;

    const phoneError = validatePhone(this.phoneNumber, this.phoneCountryCode);
    if (phoneError) {
      this.phoneError = phoneError;
      return phoneError;
    }

    const bedrag = this.bedragUitslag;
    if (bedrag.fout) return bedrag.fout;

    if (this.metode === 'ranges') {
      const reekse = this.reekseUitslag;
      if (reekse.fout) return reekse.fout;
      if (reekse.ids.length !== bedrag.blokke) {
        return `Die reekse bevat ${reekse.ids.length} blokke, maar die bedrag koop ${bedrag.blokke}.`;
      }
    }

    return null;
  }
}

function foutBoodskap(err: any, terugval: string): string {
  if (typeof err?.error?.message === 'string') return err.error.message;
  // [ApiController] validation errors arrive as { errors: { Field: ["..."] } }.
  const errors = err?.error?.errors;
  if (errors && typeof errors === 'object') {
    const eerste = Object.values(errors).flat()[0];
    if (typeof eerste === 'string') return eerste;
  }
  return terugval;
}
