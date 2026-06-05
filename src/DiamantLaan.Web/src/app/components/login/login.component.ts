import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          <h2>Meld Aan</h2>
          <p>Welkom terug! Meld aan om jou blokke te bestuur.</p>
        </div>
        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" placeholder="jou@epos.co.za">
          </div>
          <div class="form-group">
            <label>Wagwoord</label>
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" placeholder="Jou wagwoord">
          </div>
          @if (error) {
            <div class="error-alert">{{ error }}</div>
          }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Besig...' : 'Meld Aan' }}
          </button>
        </form>
        <p class="auth-link">Nog nie 'n rekening? <a routerLink="/registreer">Registreer hier</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 460px;
      margin: 3rem auto 4rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 2.5rem 2rem;
      box-shadow: var(--shadow);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .auth-header h2 {
      font-size: 1.5rem;
      color: var(--color-text);
      margin-bottom: 0.375rem;
    }
    .auth-header p {
      font-size: 0.875rem;
      color: var(--color-muted);
    }
    .btn-block { width: 100%; margin-top: 0.5rem; }
    .auth-link {
      margin-top: 1.25rem;
      font-size: 0.875rem;
      text-align: center;
      color: var(--color-muted);
    }
    .auth-link a {
      color: var(--color-terracotta);
      font-weight: 600;
    }
    .error-alert {
      background: #FEF2F2;
      color: #DC2626;
      font-size: 0.8125rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
      border: 1px solid #FECACA;
    }
    @media (max-width: 480px) {
      .auth-card { margin: 1.5rem auto 2rem; padding: 1.5rem 1.25rem; }
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = '';
  password = '';
  error = '';
  loading = false;

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/kaart']),
      error: (err) => { this.error = err.error?.message || 'Aanmelding het misluk.'; this.loading = false; }
    });
  }
}
