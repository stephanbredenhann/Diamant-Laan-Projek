import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService, GuestPurchaseRef } from '../../services/purchase.service';
import { PhoneInputComponent } from '../shared/phone-input/phone-input.component';
import {
  getPasswordChecks,
  isPasswordValid,
  normalizePhoneLocal,
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
} from '../../utils/validation.util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, PhoneInputComponent],
  template: `
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Registreer</h2>
          <p>Sluit aan by die gemeenskap en help om Diamant Laan te teer.</p>
        </div>
        @if (guestRef) {
          <div class="guest-banner">
            <strong>Jou aankoop word aan hierdie rekening gekoppel.</strong>
            <span>Sodra jy registreer, verskyn jou blokke onder My Blokke.</span>
          </div>
        }
        <form (ngSubmit)="submit()">
          <div class="form-row">
            <div class="form-group">
              <label>Voornaam</label>
              <input type="text" [(ngModel)]="firstName" name="firstName" required placeholder="Jou naam">
              @if (firstNameError) {
                <p class="field-error">{{ firstNameError }}</p>
              }
            </div>
            <div class="form-group">
              <label>Van</label>
              <input type="text" [(ngModel)]="lastName" name="lastName" required placeholder="Jou van">
              @if (lastNameError) {
                <p class="field-error">{{ lastNameError }}</p>
              }
            </div>
          </div>
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" placeholder="jou@epos.co.za">
            @if (emailError) {
              <p class="field-error">{{ emailError }}</p>
            }
          </div>
          <div class="form-group">
            <label>Wagwoord</label>
            <input type="password" [(ngModel)]="password" (ngModelChange)="passwordSig.set($event)" name="password" required autocomplete="new-password" minlength="8" placeholder="Kies 'n wagwoord">
            <ul class="pw-checklist" aria-live="polite">
              <li [class.ok]="checks().minLength">Minstens 8 karakters</li>
              <li [class.ok]="checks().hasNumber">'n Nommer</li>
              <li [class.ok]="checks().hasSpecial">'n Spesiale karakter</li>
              <li [class.ok]="checks().hasUpper">'n Hoofletter</li>
              <li [class.ok]="checks().hasLower">'n Kleinletter</li>
            </ul>
          </div>
          <div class="form-group">
            <label>Bevestig wagwoord</label>
            <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required autocomplete="new-password" minlength="8" placeholder="Tik wagwoord weer">
          </div>
          <div class="form-group">
            <label>Foonnommer</label>
            <app-phone-input
              [(countryCode)]="phoneCountryCode"
              [(phoneNumber)]="phoneNumber"
            />
            @if (phoneError) {
              <p class="field-error">{{ phoneError }}</p>
            }
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="isOraniaResident" name="isOraniaResident">
              Inwoner van Orania?
            </label>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="isOraniaBewegingMember" name="isOraniaBewegingMember">
              Lid van Orania Beweging?
            </label>
          </div>
          @if (error) {
            <div class="error-alert">{{ error }}</div>
          }
          @if (requiresLogin) {
            <p class="auth-link"><a [routerLink]="'/meld-aan'">Meld aan met daardie e-posadres</a> om jou blokke te koppel.</p>
          }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || !canSubmit()">
            {{ loading ? 'Besig...' : 'Registreer' }}
          </button>
        </form>
        <p class="auth-link">Reeds 'n rekening? <a routerLink="/meld-aan">Meld hier aan</a></p>
      </div>
    </div>
  `,
  styles: [`
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row .form-group { flex: 1; }
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text);
      cursor: pointer;
      text-transform: none;
      letter-spacing: normal;
    }
    .checkbox-group input { width: auto; }
    .guest-banner {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      border: 1px solid var(--color-border);
      border-left: 3px solid var(--color-olive);
      border-radius: var(--radius-sm);
      background: var(--color-cream);
      padding: 0.875rem 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.8125rem;
      color: var(--color-muted);
    }
    .guest-banner strong { color: var(--color-text); }
    .field-error {
      margin-top: 0.35rem;
      font-size: 0.8125rem;
      color: #DC2626;
    }
    .pw-checklist {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
      display: grid;
      gap: 0.2rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .pw-checklist li::before {
      content: '○ ';
    }
    .pw-checklist li.ok {
      color: var(--color-olive);
    }
    .pw-checklist li.ok::before {
      content: '● ';
    }
    @media (max-width: 480px) {
      .auth-card { margin: 1.5rem auto 2rem; padding: 1.5rem 1.25rem; }
      .form-row { flex-direction: column; gap: 0; }
    }
  `]
})
export class RegisterComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private purchase = inject(PurchaseService);
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  phoneNumber = '';
  phoneCountryCode = '+27';
  isOraniaResident = false;
  isOraniaBewegingMember = false;
  error = '';
  emailError = '';
  firstNameError = '';
  lastNameError = '';
  phoneError = '';
  loading = false;
  requiresLogin = false;
  guestRef: GuestPurchaseRef | null = null;
  passwordSig = signal('');
  checks = computed(() => getPasswordChecks(this.passwordSig()));

  ngOnInit() {
    // Arriving from a guest checkout: the purchase id is in the URL, the token in session storage.
    const guestPurchaseId = Number(this.route.snapshot.queryParamMap.get('gas'));
    const stored = this.purchase.guestPurchase;
    if (guestPurchaseId && stored && stored.purchaseId === guestPurchaseId) {
      this.guestRef = stored;
    }
  }

  canSubmit(): boolean {
    return !validateName(this.firstName, 'Voornaam')
      && !validateName(this.lastName, 'Van')
      && !validateEmail(this.email)
      && isPasswordValid(this.password)
      && this.password === this.confirmPassword
      && !validatePhone(this.phoneNumber, this.phoneCountryCode);
  }

  submit() {
    this.error = '';
    this.emailError = '';
    this.firstNameError = '';
    this.lastNameError = '';
    this.phoneError = '';

    const firstNameError = validateName(this.firstName, 'Voornaam');
    if (firstNameError) {
      this.firstNameError = firstNameError;
      return;
    }
    const lastNameError = validateName(this.lastName, 'Van');
    if (lastNameError) {
      this.lastNameError = lastNameError;
      return;
    }
    const emailError = validateEmail(this.email);
    if (emailError) {
      this.emailError = emailError;
      return;
    }
    const pwError = validatePassword(this.password);
    if (pwError) {
      this.error = pwError;
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Wagwoorde stem nie ooreen nie.';
      return;
    }
    const phoneError = validatePhone(this.phoneNumber, this.phoneCountryCode);
    if (phoneError) {
      this.phoneError = phoneError;
      return;
    }

    this.loading = true;
    this.requiresLogin = false;
    this.auth.register(
      this.firstName.trim(),
      this.lastName.trim(),
      this.email,
      this.password,
      this.confirmPassword,
      normalizePhoneLocal(this.phoneNumber, this.phoneCountryCode),
      this.phoneCountryCode,
      this.isOraniaResident,
      this.isOraniaBewegingMember,
      this.guestRef
    ).subscribe({
      next: () => {
        if (this.guestRef) {
          // The guest purchase now belongs to this account outright.
          this.purchase.guestPurchase = null;
          this.purchase.pendingSquareIds = [];
          this.router.navigate(['/my-blokke']);
          return;
        }
        this.router.navigate(['/kaart']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Registrasie het misluk.';
        this.requiresLogin = err.status === 409 && !!err.error?.requiresLogin;
        this.loading = false;
      }
    });
  }
}
