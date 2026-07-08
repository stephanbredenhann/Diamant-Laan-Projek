import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getPasswordChecks, isPasswordValid, validatePassword } from '../../utils/validation.util';

@Component({
  selector: 'app-required-password-change',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Verander jou wagwoord</h2>
          <p>Om veiligheidsredes moet jy 'n nuwe wagwoord kies voordat jy voortgaan.</p>
        </div>
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
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || !canSubmit()">
            {{ loading ? 'Besig...' : 'Stoor nuwe wagwoord' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
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
    @media (max-width: 480px) {
      .auth-card { margin: 1.5rem auto 2rem; padding: 1.5rem 1.25rem; }
    }
  `]
})
export class RequiredPasswordChangeComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  newPassword = '';
  confirmPassword = '';
  error = '';
  loading = false;
  passwordSig = signal('');
  checks = computed(() => getPasswordChecks(this.passwordSig()));

  canSubmit(): boolean {
    return isPasswordValid(this.newPassword) && this.newPassword === this.confirmPassword;
  }

  submit() {
    this.error = '';
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
    this.auth.completeRequiredPasswordChange(this.newPassword, this.confirmPassword).subscribe({
      next: () => this.router.navigate(['/kaart']),
      error: (err) => {
        this.error = err.error?.message || 'Kon nie wagwoord verander nie.';
        this.loading = false;
      }
    });
  }
}
