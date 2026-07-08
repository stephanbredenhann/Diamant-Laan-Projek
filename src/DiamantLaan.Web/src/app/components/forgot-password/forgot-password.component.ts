import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Wagwoord vergeet</h2>
          <p>Voer jou e-pos in. As die rekening bestaan, stuur ons 'n 6-karakter kode.</p>
        </div>
        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" placeholder="jou@epos.co.za">
          </div>
          @if (error) {
            <div class="error-alert">{{ error }}</div>
          }
          @if (success) {
            <div class="success-alert">{{ success }}</div>
          }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading || !email.trim()">
            {{ loading ? 'Besig...' : 'Stuur herstelkode' }}
          </button>
        </form>
        <p class="auth-link"><a routerLink="/meld-aan">Terug na aanmeld</a></p>
      </div>
    </div>
  `,
  styles: [`
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
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  error = '';
  success = '';
  loading = false;

  submit() {
    this.error = '';
    this.success = '';
    this.loading = true;
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: (res) => {
        this.success = res.message;
        this.loading = false;
        this.router.navigate(['/wagwoord-herstel'], {
          queryParams: { email: this.email.trim() },
          state: { email: this.email.trim() }
        });
      },
      error: (err) => {
        this.error = err.error?.message || 'Kon nie herstelversoek stuur nie.';
        this.loading = false;
      }
    });
  }
}
