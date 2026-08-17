import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getPasswordChecks, isPasswordValid, validatePassword } from '../../utils/validation.util';
import { PasswordInputComponent } from '../shared/password-input/password-input.component';

@Component({
  selector: 'app-required-password-change',
  standalone: true,
  imports: [FormsModule, PasswordInputComponent],
  template: `
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          <p class="eyebrow">Rekening</p>
          <h2 class="display auth-title">Verander jou wagwoord</h2>
          <p>Om veiligheidsredes moet jy ’n nuwe wagwoord kies voordat jy voortgaan.</p>
        </div>
        <form (ngSubmit)="submit()">
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
            <label for="confirmPassword">Bevestig wagwoord</label>
            <app-password-input id="confirmPassword" [(ngModel)]="confirmPassword" name="confirmPassword" required autocomplete="new-password" minlength="8" />
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
    .auth-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      margin: 0.5rem 0 0.75rem;
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
      next: () => this.router.navigate(['/my-blokke']),
      error: (err) => {
        this.error = err.error?.message || 'Kon nie wagwoord verander nie.';
        this.loading = false;
      }
    });
  }
}
