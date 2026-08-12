import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService, GuestPurchaseRef } from '../../services/purchase.service';
import { PhoneInputComponent } from '../shared/phone-input/phone-input.component';
import {
  getPasswordChecks,
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
          <p class="eyebrow">Opsioneel</p>
          <h2 class="display auth-title">Registreer</h2>
          <p>’n Rekening is heeltemal opsioneel. Dit help net om vorige bydraes, sertifikate en opdaterings later te bestuur.</p>
        </div>
        @if (guestRef) {
          <div class="guest-banner">
            <strong>Jou aankoop word aan hierdie rekening gekoppel.</strong>
            <span>Sodra jy registreer, sien jy jou vierkante meter onder ‘My blokke’.</span>
          </div>
        }
        <form (ngSubmit)="submit()">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">Voornaam</label>
              <input id="firstName" type="text" [(ngModel)]="firstName" name="firstName" required placeholder="Jou naam"
                     [class.invalid]="firstNameError" (blur)="checkFirstName()">
              @if (firstNameError) {
                <p class="field-error">{{ firstNameError }}</p>
              }
            </div>
            <div class="form-group">
              <label for="lastName">Van</label>
              <input id="lastName" type="text" [(ngModel)]="lastName" name="lastName" required placeholder="Jou van"
                     [class.invalid]="lastNameError" (blur)="checkLastName()">
              @if (lastNameError) {
                <p class="field-error">{{ lastNameError }}</p>
              }
            </div>
          </div>
          <div class="form-group">
            <label for="email">E-pos</label>
            <input id="email" type="email" [(ngModel)]="email" name="email" required autocomplete="email" placeholder="jou@epos.co.za"
                   [class.invalid]="emailError" (blur)="checkEmail()">
            @if (emailError) {
              <p class="field-error">{{ emailError }}</p>
            }
          </div>
          <div class="form-group">
            <label for="password">Wagwoord</label>
            <input id="password" type="password" [(ngModel)]="password" (ngModelChange)="onPasswordChange($event)" name="password" required autocomplete="new-password" minlength="8" placeholder="Kies ’n wagwoord"
                   [class.invalid]="passwordError" (blur)="checkPassword()">
            <ul class="pw-checklist" aria-live="polite">
              <li [class.ok]="checks().minLength">Minstens 8 karakters</li>
              <li [class.ok]="checks().hasNumber">’n Nommer</li>
              <li [class.ok]="checks().hasSpecial">’n Spesiale karakter</li>
              <li [class.ok]="checks().hasUpper">’n Hoofletter</li>
              <li [class.ok]="checks().hasLower">’n Kleinletter</li>
            </ul>
            @if (passwordError) {
              <p class="field-error">{{ passwordError }}</p>
            }
          </div>
          <div class="form-group">
            <label for="confirmPassword">Bevestig wagwoord</label>
            <input id="confirmPassword" type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required autocomplete="new-password" minlength="8" placeholder="Tik wagwoord weer"
                   [class.invalid]="confirmPasswordError" (blur)="checkConfirmPassword()">
            @if (confirmPasswordError) {
              <p class="field-error">{{ confirmPasswordError }}</p>
            }
          </div>
          <div class="form-group">
            <label for="phoneNumber">Foonnommer</label>
            <!-- Expanded from the two-way form so the error can clear as they correct it. -->
            <app-phone-input
              [countryCode]="phoneCountryCode"
              (countryCodeChange)="onCountryCodeChange($event)"
              [phoneNumber]="phoneNumber"
              (phoneNumberChange)="onPhoneNumberChange($event)"
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
            <p class="auth-link"><a [routerLink]="'/meld-aan'">Meld aan met daardie e-posadres</a> om jou vierkante meter te koppel.</p>
          }
          <!-- Deliberately always clickable: a disabled button cannot explain what is wrong,
               and browser autofill regularly leaves one field the form does not accept. -->
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Besig...' : 'Registreer' }}
          </button>
        </form>
        <p class="auth-link">Reeds ’n rekening? <a routerLink="/meld-aan">Meld hier aan</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      margin: 0.5rem 0 0.75rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row .form-group { flex: 1; }
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--fs-lg);
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
      font-size: var(--fs-base);
      color: var(--text-muted);
    }
    .guest-banner strong { color: var(--color-text); }
    .field-error {
      margin-top: 0.35rem;
      font-size: var(--fs-base);
      color: #DC2626;
    }
    input.invalid {
      border-color: #DC2626;
    }
    input.invalid:focus {
      outline-color: #DC2626;
    }
    .pw-checklist {
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
      display: grid;
      gap: 0.2rem;
      font-size: var(--fs-sm);
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
  passwordError = '';
  confirmPasswordError = '';
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

  onPasswordChange(value: string) {
    this.passwordSig.set(value);

    // Once a mismatch has been pointed out, keep it honest as they fix either field.
    if (this.confirmPasswordError && value === this.confirmPassword) {
      this.confirmPasswordError = '';
    }
  }

  checkFirstName() {
    this.firstNameError = validateName(this.firstName, 'Voornaam') ?? '';
  }

  checkLastName() {
    this.lastNameError = validateName(this.lastName, 'Van') ?? '';
  }

  checkEmail() {
    this.emailError = validateEmail(this.email) ?? '';
  }

  checkPassword() {
    this.passwordError = validatePassword(this.password) ?? '';
    if (this.confirmPassword) {
      this.checkConfirmPassword();
    }
  }

  checkConfirmPassword() {
    if (!this.confirmPassword) {
      this.confirmPasswordError = 'Bevestig asseblief jou wagwoord.';
      return;
    }
    this.confirmPasswordError = this.password === this.confirmPassword
      ? ''
      : 'Wagwoorde stem nie ooreen nie.';
  }

  checkPhone() {
    this.phoneError = validatePhone(this.phoneNumber, this.phoneCountryCode) ?? '';
  }

  onPhoneNumberChange(value: string) {
    this.phoneNumber = value;
    if (this.phoneError) {
      this.checkPhone();
    }
  }

  onCountryCodeChange(value: string) {
    this.phoneCountryCode = value;
    if (this.phoneError) {
      this.checkPhone();
    }
  }

  /**
   * Validates every field at once and reports all of them, rather than stopping at the first
   * problem. Autofill often leaves more than one field in a state the form will not accept.
   */
  private validateAll(): boolean {
    this.checkFirstName();
    this.checkLastName();
    this.checkEmail();
    this.checkPassword();
    this.checkConfirmPassword();
    this.checkPhone();

    return !this.firstNameError
      && !this.lastNameError
      && !this.emailError
      && !this.passwordError
      && !this.confirmPasswordError
      && !this.phoneError;
  }

  submit() {
    this.error = '';
    this.requiresLogin = false;

    if (!this.validateAll()) {
      this.error = 'Kontroleer asseblief die velde wat hierbo gemerk is.';
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
          this.purchase.clearBouVloei();
          this.router.navigate(['/my-blokke']);
          return;
        }
        // No purchase attached yet, so send them to step 1 of the build flow
        // rather than the raw map, which is the optional advanced route.
        this.router.navigate(['/bou']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Registrasie het misluk.';
        this.requiresLogin = err.status === 409 && !!err.error?.requiresLogin;
        this.loading = false;
      }
    });
  }
}
