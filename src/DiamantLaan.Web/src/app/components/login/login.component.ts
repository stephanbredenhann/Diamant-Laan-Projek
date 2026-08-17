import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService } from '../../services/purchase.service';
import { PasswordInputComponent } from '../shared/password-input/password-input.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, PasswordInputComponent],
  template: `
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          <p class="eyebrow">Vir terugkerende ondersteuners</p>
          <h2 class="display auth-title">Meld aan</h2>
          <p>Jy hoef nie aan te meld om ’n vierkante meter te finansier nie. ’n Rekening help net om vorige bydraes, sertifikate en opdaterings later te bestuur.</p>
        </div>
        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label for="email">E-pos</label>
            <input id="email" type="email" [(ngModel)]="email" name="email" required autocomplete="email" placeholder="jou@epos.co.za">
          </div>
          <div class="form-group">
            <label for="password">Wagwoord</label>
            <app-password-input id="password" [(ngModel)]="password" name="password" required autocomplete="current-password" placeholder="Jou wagwoord" />
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
          <p class="auth-register-promo__title">Nog nie ’n rekening nie?</p>
          <p class="auth-register-promo__text">Sluit aan en begin bou.</p>
          <a routerLink="/registreer" class="btn btn-outline btn-block">Registreer</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      margin: 0.5rem 0 0.75rem;
    }
    .auth-register-promo {
      margin-top: 1.5rem;
      padding: 1.25rem 1rem;
      background: var(--bg-chalk);
      border: 1px solid var(--color-border);
      text-align: center;
    }

    .auth-register-promo__title {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 0.35rem;
    }

    .auth-register-promo__text {
      font-size: var(--fs-base);
      color: var(--text-muted);
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
  private purchase = inject(PurchaseService);
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
        } else if (this.purchase.guestPurchase) {
          // They paid as a guest and signed in afterwards, so go back and attach that purchase.
          this.router.navigate(['/betalings/klaar']);
        } else {
          this.router.navigate(['/my-blokke']);
        }
      },
      error: (err) => { this.error = err.error?.message || 'Aanmelding het misluk.'; this.loading = false; }
    });
  }
}
