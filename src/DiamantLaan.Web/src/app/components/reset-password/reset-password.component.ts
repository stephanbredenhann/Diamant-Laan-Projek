import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getPasswordChecks, isPasswordValid, validatePassword } from '../../utils/validation.util';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          @if (step === 1) {
            <h2>Voer herstelkode in</h2>
            <p>Voer die 6-karakter kode in wat per e-pos gestuur is.</p>
          } @else {
            <h2>Kies nuwe wagwoord</h2>
            <p>Kies 'n nuwe wagwoord vir jou rekening.</p>
          }
        </div>

        <p class="email-display">Herstel vir: <strong>{{ email }}</strong></p>

        @if (step === 1) {
          <form (ngSubmit)="nextStep()">
            <div class="form-group">
              <label>Herstelkode</label>
              <input
                type="text"
                class="otp-input"
                [(ngModel)]="otp"
                name="otp"
                required
                maxlength="6"
                autocomplete="one-time-code"
                placeholder="ABC123"
                (input)="otp = otp.toUpperCase()">
            </div>
            @if (error) {
              <div class="error-alert">{{ error }}</div>
            }
            <button type="submit" class="btn btn-primary btn-block" [disabled]="otp.trim().length !== 6">
              Volgende
            </button>
          </form>
        } @else {
          <form (ngSubmit)="submit()">
            <div class="form-group">
              <label>Nuwe wagwoord</label>
              <input type="password" [(ngModel)]="newPassword" (ngModelChange)="passwordSig.set($event)" name="newPassword" required autocomplete="new-password" minlength="8">
              <ul class="pw-checklist">
                <li [class.ok]="checks().minLength">Minstens 8 karakters</li>
                <li [class.ok]="checks().hasNumber">'n Nommer</li>
                <li [class.ok]="checks().hasSpecial">'n Spesiale karakter</li>
                <li [class.ok]="checks().hasUpper">'n Hoofletter</li>
                <li [class.ok]="checks().hasLower">'n Kleinletter</li>
              </ul>
            </div>
            <div class="form-group">
              <label>Bevestig wagwoord</label>
              <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required autocomplete="new-password" minlength="8">
            </div>
            @if (error) {
              <div class="error-alert">{{ error }}</div>
            }
            @if (success) {
              <div class="success-alert">{{ success }}</div>
            }
            <div class="btn-row">
              <button type="button" class="btn btn-outline" (click)="step = 1; error = ''">Terug</button>
              <button type="submit" class="btn btn-primary" [disabled]="loading || !canSubmit()">
                {{ loading ? 'Besig...' : 'Stel nuwe wagwoord' }}
              </button>
            </div>
          </form>
        }

        <p class="auth-link"><a routerLink="/meld-aan">Terug na aanmeld</a></p>
      </div>
    </div>
  `,
  styles: [`
    .email-display {
      margin: 0 0 1.25rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      word-break: break-all;
    }
    .otp-input {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0.35rem;
      text-transform: uppercase;
      font-size: 1.25rem;
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
    .pw-checklist li::before { content: '○ '; }
    .pw-checklist li.ok { color: var(--color-olive); }
    .pw-checklist li.ok::before { content: '● '; }
    .btn-row {
      display: flex;
      gap: 0.75rem;
    }
    .btn-row .btn-primary { flex: 1; }
    .success-alert {
      background: #E8ECD8;
      color: #5A6A32;
      border: 1px solid #D4DFB8;
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    @media (max-width: 480px) {
      .auth-card { margin: 1.5rem auto 2rem; padding: 1.5rem 1.25rem; }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;
  step = 1;
  passwordSig = signal('');
  checks = computed(() => getPasswordChecks(this.passwordSig()));

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    const stateEmail = nav?.extras?.state?.['email'] as string | undefined;
    const q = this.route.snapshot.queryParamMap.get('email');
    this.email = (q || stateEmail || '').trim();
    if (!this.email) {
      this.router.navigate(['/wagwoord-vergeet']);
    }
  }

  nextStep() {
    this.error = '';
    if (this.otp.trim().length !== 6) {
      this.error = 'Voer die volledige 6-karakter kode in.';
      return;
    }
    this.step = 2;
  }

  canSubmit(): boolean {
    return isPasswordValid(this.newPassword) && this.newPassword === this.confirmPassword;
  }

  submit() {
    this.error = '';
    this.success = '';
    const pwError = validatePassword(this.newPassword);
    if (pwError) {
      this.error = pwError;
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Wagwoorde stem nie ooreen nie.';
      return;
    }
    this.loading = true;
    this.auth.resetPassword(this.email, this.otp.trim(), this.newPassword, this.confirmPassword).subscribe({
      next: (res) => {
        this.success = res.message;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/meld-aan']), 1200);
      },
      error: (err) => {
        this.error = err.error?.message || 'Kon nie wagwoord herstel nie.';
        this.loading = false;
      }
    });
  }
}
