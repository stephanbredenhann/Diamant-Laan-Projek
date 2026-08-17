import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertComponent } from '../shared/alert/alert.component';
import { PasswordInputComponent } from '../shared/password-input/password-input.component';
import { PhoneInputComponent } from '../shared/phone-input/phone-input.component';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
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
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, AlertComponent, PhoneInputComponent, PasswordInputComponent],
  template: `
    <div class="container profile-page">
      <div class="page-header">
        <p class="eyebrow">My rekening</p>
        <h2 class="display page-title">My profiel</h2>
        <p class="summary">Jy kan binne die volgende 12 uur nog {{ changesRemaining }} wysigings aanbring.</p>
      </div>

      @if (loadError) {
        <app-alert type="error" [message]="loadError" />
      }

      @if (loaded) {
        <div class="cards">
          <section class="card">
            <h3>Persoonlike besonderhede</h3>
            <form (ngSubmit)="saveProfile()">
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">Voornaam</label>
                  <input id="firstName" type="text" [(ngModel)]="firstName" name="firstName" required>
                  @if (firstNameError) {
                    <p class="field-error">{{ firstNameError }}</p>
                  }
                </div>
                <div class="form-group">
                  <label for="lastName">Van</label>
                  <input id="lastName" type="text" [(ngModel)]="lastName" name="lastName" required>
                  @if (lastNameError) {
                    <p class="field-error">{{ lastNameError }}</p>
                  }
                </div>
              </div>
              <div class="form-group">
                <label for="phoneNumber">Foonnommer</label>
                <app-phone-input
                  [(countryCode)]="phoneCountryCode"
                  [(phoneNumber)]="phoneNumber"
                />
                @if (phoneError) {
                  <p class="field-error">{{ phoneError }}</p>
                }
              </div>
              <div class="form-group toggle-group">
                <label class="toggle">
                  <input id="receiveBlockProgressEmails" type="checkbox" [(ngModel)]="receiveBlockProgressEmails" name="receiveBlockProgressEmails">
                  <span class="toggle-ui" aria-hidden="true"></span>
                  <span class="toggle-label">Ontvang e-posse oor die vordering van my vierkante meter</span>
                </label>
              </div>
              @if (profileMessage) {
                <app-alert [type]="profileMessageType" [message]="profileMessage" />
              }
              <button type="submit" class="btn btn-primary" [disabled]="profileLoading || !changesAllowed">
                {{ profileLoading ? 'Besig...' : 'Stoor besonderhede' }}
              </button>
            </form>
          </section>

          <section class="card">
            <h3>E-posadres</h3>
            <form (ngSubmit)="saveEmail()">
              <div class="form-group">
                <label for="email">Nuwe e-pos</label>
                <input id="email" type="email" [(ngModel)]="email" name="email" required autocomplete="email">
                @if (emailError) {
                  <p class="field-error">{{ emailError }}</p>
                }
              </div>
              <div class="form-group">
                <label for="emailCurrentPassword">Huidige wagwoord</label>
                <app-password-input id="emailCurrentPassword" [(ngModel)]="emailCurrentPassword" name="emailCurrentPassword" required autocomplete="current-password" />
              </div>
              @if (emailMessage) {
                <app-alert [type]="emailMessageType" [message]="emailMessage" />
              }
              <button type="submit" class="btn btn-primary" [disabled]="emailLoading || !changesAllowed">
                {{ emailLoading ? 'Besig...' : 'Verander e-pos' }}
              </button>
            </form>
          </section>

          <section class="card">
            <h3>Wagwoord</h3>
            <form (ngSubmit)="savePassword()">
              <div class="form-group">
                <label for="currentPassword">Huidige wagwoord</label>
                <app-password-input id="currentPassword" [(ngModel)]="currentPassword" name="currentPassword" required autocomplete="current-password" />
              </div>
              <div class="form-group">
                <label for="newPassword">Nuwe wagwoord</label>
                <app-password-input id="newPassword" [(ngModel)]="newPassword" (ngModelChange)="passwordSig.set($event)" name="newPassword" required autocomplete="new-password" minlength="8" />
                <ul class="pw-checklist">
                  <li [class.ok]="checks().minLength">Minstens 8 karakters</li>
                  <li [class.ok]="checks().hasNumber">’n Nommer</li>
                  <li [class.ok]="checks().hasUpper">’n Hoofletter</li>
                  <li [class.ok]="checks().hasLower">’n Kleinletter</li>
                </ul>
              </div>
              <div class="form-group">
                <label for="confirmPassword">Bevestig nuwe wagwoord</label>
                <app-password-input id="confirmPassword" [(ngModel)]="confirmPassword" name="confirmPassword" required autocomplete="new-password" minlength="8" />
              </div>
              @if (passwordMessage) {
                <app-alert [type]="passwordMessageType" [message]="passwordMessage" />
              }
              <button type="submit" class="btn btn-primary" [disabled]="passwordLoading || !changesAllowed || !isPasswordValid(newPassword)">
                {{ passwordLoading ? 'Besig...' : 'Verander wagwoord' }}
              </button>
            </form>
          </section>

          <section class="card danger-card">
            <h3>Sluit rekening</h3>
            <p class="danger-copy">
              Jou blokkie m² bly aan jou naam gekoppel en bly vir ander onbeskikbaar, maar jou
              rekening sal as ’n &ldquo;Geslote rekening&rdquo; aangedui word. Jy sal nie weer met
              hierdie rekening kan aanmeld nie.
            </p>
            <button type="button" class="btn btn-outline danger" (click)="openDeleteModal()">
              Sluit rekening
            </button>
          </section>
        </div>
      }
    </div>

    @if (showDeleteModal) {
      <div class="prompt-backdrop" (click)="closeDeleteModal()">
        <div
          class="prompt-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          (click)="$event.stopPropagation()"
        >
          <h3 id="delete-account-title">Sluit rekening?</h3>
          <p>
            Tik jou wagwoord om te bevestig. Jou blokkie m² bly aan jou naam gekoppel en verskyn as
            &ldquo;Geslote rekening&rdquo;.
          </p>
          <div class="form-group">
            <label for="deletePassword">Huidige wagwoord</label>
            <app-password-input
              id="deletePassword"
              [(ngModel)]="deletePassword"
              [ngModelOptions]="{ standalone: true }"
              name="deletePassword"
              required
              autocomplete="current-password"
              [disabled]="deleteLoading"
            />
          </div>
          @if (deleteError) {
            <app-alert type="error" [message]="deleteError" />
          }
          <div class="prompt-actions">
            <button type="button" class="btn btn-outline" [disabled]="deleteLoading" (click)="closeDeleteModal()">
              Kanselleer
            </button>
            <button
              type="button"
              class="btn btn-outline danger"
              [disabled]="deleteLoading || !deletePassword"
              (click)="confirmDeleteAccount()"
            >
              {{ deleteLoading ? 'Besig...' : 'Sluit rekening' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    .page-header { margin: 1.5rem 0 1.25rem; }
    .page-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      margin: 0.35rem 0 0.5rem;
    }
    .summary { color: var(--text-muted); font-size: var(--fs-base); }
    .cards {
      display: grid;
      gap: 1.25rem;
      margin-bottom: 2.5rem;
      min-width: 0;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 2rem 2.5rem;
      box-shadow: var(--shadow-sm);
      min-width: 0;
      max-width: 100%;
    }
    .card h3 {
      font-family: var(--font-heading);
      font-size: var(--fs-lg);
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 1rem;
    }
    .card :is(input, select, textarea, button, app-phone-input, app-password-input) {
      max-width: 100%;
    }
    .form-row {
      display: flex;
      gap: 1rem;
      min-width: 0;
    }
    .form-row .form-group {
      flex: 1;
      min-width: 0;
    }
    .field-error {
      margin-top: 0.35rem;
      font-size: var(--fs-base);
      color: #DC2626;
    }
    .toggle-group { margin-top: 0.25rem; }
    .toggle {
      display: flex;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.75rem;
      cursor: pointer;
      text-transform: none;
      letter-spacing: normal;
      font-size: var(--fs-lg);
      color: var(--color-text);
    }
    .toggle input {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
    }
    .toggle-ui {
      width: 2.5rem;
      height: 1.4rem;
      border-radius: 999px;
      background: #D1D5DB;
      position: relative;
      flex-shrink: 0;
      transition: background 0.2s;
      margin-top: 0.1rem;
    }
    .toggle-ui::after {
      content: '';
      position: absolute;
      top: 0.15rem;
      left: 0.15rem;
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 50%;
      background: white;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .toggle input:checked + .toggle-ui {
      background: var(--ob-blue);
    }
    .toggle input:checked + .toggle-ui::after {
      transform: translateX(1.1rem);
    }
    .toggle input:focus-visible + .toggle-ui {
      outline: 2px solid var(--ob-blue);
      outline-offset: 2px;
    }
    .toggle-label {
      flex: 1 1 12rem;
      min-width: 0;
      line-height: 1.4;
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
    .pw-checklist li::before { content: '○ '; }
    .pw-checklist li.ok { color: var(--color-olive); }
    .pw-checklist li.ok::before { content: '● '; }
    .danger-card h3 { color: #B91C1C; }
    .danger-copy {
      color: var(--text-muted);
      font-size: var(--fs-base);
      margin-bottom: 1rem;
      line-height: 1.5;
    }
    .btn.danger {
      color: #DC2626;
      border-color: #FECACA;
    }
    .btn.danger:hover:not(:disabled) {
      background: #FEF2F2;
    }
    .prompt-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(61, 43, 31, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 1000;
    }
    .prompt-dialog {
      width: min(100%, 480px);
      max-width: 100%;
      background: var(--color-surface);
      border-radius: var(--radius);
      padding: 1.75rem;
      box-shadow: var(--shadow-lg);
      box-sizing: border-box;
    }
    .prompt-dialog h3 {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      color: var(--color-text);
    }
    .prompt-dialog p {
      color: var(--color-muted);
      font-size: var(--fs-base);
      margin-bottom: 0.75rem;
    }
    .prompt-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1.25rem;
    }
    @media (max-width: 640px) {
      .form-row { flex-direction: column; gap: 0; }
      .card { padding: 1.25rem 1rem; }
      .prompt-backdrop { padding: 1rem; }
      .prompt-dialog { padding: 1.25rem; }
      .prompt-actions { flex-direction: column; }
      .prompt-actions .btn { width: 100%; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loaded = false;
  loadError = '';
  changesRemaining = 3;
  changesAllowed = true;
  maxChanges = 3;
  isPasswordValid = isPasswordValid;

  firstName = '';
  lastName = '';
  phoneNumber = '';
  phoneCountryCode = '+27';
  phoneError = '';
  firstNameError = '';
  lastNameError = '';
  receiveBlockProgressEmails = true;
  profileLoading = false;
  profileMessage = '';
  profileMessageType: 'success' | 'error' | 'info' = 'info';

  email = '';
  emailError = '';
  emailCurrentPassword = '';
  emailLoading = false;
  emailMessage = '';
  emailMessageType: 'success' | 'error' | 'info' = 'info';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordLoading = false;
  passwordMessage = '';
  passwordMessageType: 'success' | 'error' | 'info' = 'info';
  passwordSig = signal('');
  checks = computed(() => getPasswordChecks(this.passwordSig()));

  showDeleteModal = false;
  deletePassword = '';
  deleteLoading = false;
  deleteError = '';

  ngOnInit() {
    this.profileService.get().subscribe({
      next: (p) => {
        this.applyProfile(p);
        this.loaded = true;
      },
      error: () => {
        this.loadError = 'Kon nie jou profiel laai nie.';
      }
    });
  }

  saveProfile() {
    this.profileMessage = '';
    this.phoneError = '';
    this.firstNameError = '';
    this.lastNameError = '';

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
    const phoneError = validatePhone(this.phoneNumber, this.phoneCountryCode);
    if (phoneError) {
      this.phoneError = phoneError;
      return;
    }
    this.profileLoading = true;
    this.profileService.update({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phoneNumber: normalizePhoneLocal(this.phoneNumber, this.phoneCountryCode),
      phoneCountryCode: this.phoneCountryCode,
      receiveBlockProgressEmails: this.receiveBlockProgressEmails
    }).subscribe({
      next: (p) => {
        this.applyProfile(p);
        this.auth.updateSessionUser({
          firstName: p.firstName,
          lastName: p.lastName,
          phoneNumber: p.phoneNumber,
          phoneCountryCode: p.phoneCountryCode,
          receiveBlockProgressEmails: p.receiveBlockProgressEmails
        });
        this.profileMessage = 'Profiel is gestoor.';
        this.profileMessageType = 'success';
        this.profileLoading = false;
      },
      error: (err) => {
        this.profileMessage = err.error?.message || 'Kon nie profiel stoor nie.';
        this.profileMessageType = 'error';
        this.profileLoading = false;
        if (err.status === 429) this.changesAllowed = false;
      }
    });
  }

  saveEmail() {
    this.emailMessage = '';
    this.emailError = '';
    const emailError = validateEmail(this.email);
    if (emailError) {
      this.emailError = emailError;
      return;
    }
    this.emailLoading = true;
    this.profileService.updateEmail(this.email, this.emailCurrentPassword).subscribe({
      next: (res) => {
        this.emailMessage = res.message;
        this.emailMessageType = 'success';
        this.emailLoading = false;
        this.auth.logout(false);
        this.router.navigate(['/meld-aan']);
      },
      error: (err) => {
        this.emailMessage = err.error?.message || 'Kon nie e-pos verander nie.';
        this.emailMessageType = 'error';
        this.emailLoading = false;
        if (err.status === 429) this.changesAllowed = false;
      }
    });
  }

  savePassword() {
    this.passwordMessage = '';
    const pwError = validatePassword(this.newPassword);
    if (pwError) {
      this.passwordMessage = pwError;
      this.passwordMessageType = 'error';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordMessage = 'Wagwoorde stem nie ooreen nie.';
      this.passwordMessageType = 'error';
      return;
    }
    this.passwordLoading = true;
    this.profileService.updatePassword(this.currentPassword, this.newPassword, this.confirmPassword).subscribe({
      next: (res) => {
        this.passwordMessage = res.message;
        this.passwordMessageType = 'success';
        this.passwordLoading = false;
        this.auth.logout(false);
        this.router.navigate(['/meld-aan']);
      },
      error: (err) => {
        this.passwordMessage = err.error?.message || 'Kon nie wagwoord verander nie.';
        this.passwordMessageType = 'error';
        this.passwordLoading = false;
        if (err.status === 429) this.changesAllowed = false;
      }
    });
  }

  openDeleteModal() {
    this.deletePassword = '';
    this.deleteError = '';
    this.deleteLoading = false;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    if (this.deleteLoading) return;
    this.showDeleteModal = false;
    this.deletePassword = '';
    this.deleteError = '';
  }

  confirmDeleteAccount() {
    this.deleteError = '';
    if (!this.deletePassword) {
      this.deleteError = 'Tik jou wagwoord om te bevestig.';
      return;
    }
    this.deleteLoading = true;
    this.profileService.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.auth.logout(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Kon nie rekening verwyder nie.';
        this.deleteLoading = false;
      }
    });
  }

  private applyProfile(p: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    phoneCountryCode?: string;
    receiveBlockProgressEmails: boolean;
    changesRemaining: number;
    changesAllowed: boolean;
    maxChanges: number;
  }) {
    this.email = p.email;
    this.firstName = p.firstName;
    this.lastName = p.lastName;
    this.phoneNumber = p.phoneNumber || '';
    this.phoneCountryCode = p.phoneCountryCode || '+27';
    this.receiveBlockProgressEmails = p.receiveBlockProgressEmails;
    this.changesRemaining = p.changesRemaining;
    this.changesAllowed = p.changesAllowed;
    this.maxChanges = p.maxChanges;
  }
}
