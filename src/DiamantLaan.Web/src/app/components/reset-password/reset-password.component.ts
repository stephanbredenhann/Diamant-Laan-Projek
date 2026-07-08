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
          <h2>Herstel wagwoord</h2>
          <p>Voer die 6-karakter kode in wat per e-pos gestuur is, en kies 'n nuwe wagwoord.</p>
        </div>
        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email">
          </div>
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
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || !canSubmit()">
            {{ loading ? 'Besig...' : 'Stel nuwe wagwoord' }}
          </button>
        </form>
        <p class="auth-link"><a routerLink="/meld-aan">Terug na aanmeld</a></p>
      </div>
    </div>
  `,
  styles: [`
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
  passwordSig = signal('');
  checks = computed(() => getPasswordChecks(this.passwordSig()));

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap.get('email');
    if (q) this.email = q;
  }

  canSubmit(): boolean {
    return !!this.email.trim()
      && this.otp.trim().length === 6
      && isPasswordValid(this.newPassword)
      && this.newPassword === this.confirmPassword;
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
    this.auth.resetPassword(this.email.trim(), this.otp.trim(), this.newPassword, this.confirmPassword).subscribe({
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
