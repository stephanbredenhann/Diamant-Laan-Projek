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
          <h2>Meld aan</h2>
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
            {{ loading ? 'Besig...' : 'Meld aan' }}
          </button>
        </form>
        <p class="auth-link"><a routerLink="/wagwoord-vergeet">Wagwoord vergeet?</a></p>

        <div class="auth-register-promo">
          <p class="auth-register-promo__title">Nog nie 'n rekening nie?</p>
          <p class="auth-register-promo__text">Sluit aan en begin bou.</p>
          <a routerLink="/registreer" class="btn btn-outline btn-block">Registreer</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-register-promo {
      margin-top: 1.5rem;
      padding: 1.25rem 1rem;
      background: var(--bg-warm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      text-align: center;
    }

    .auth-register-promo__title {
      font-family: var(--font-heading);
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 0.35rem;
    }

    .auth-register-promo__text {
      font-size: 0.875rem;
      color: var(--color-muted);
      margin: 0 0 1rem;
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
      next: (res) => {
        if (res.mustChangePassword) {
          this.router.navigate(['/wagwoord-wysig-verplig']);
        } else {
          this.router.navigate(['/kaart']);
        }
      },
      error: (err) => { this.error = err.error?.message || 'Aanmelding het misluk.'; this.loading = false; }
    });
  }
}
