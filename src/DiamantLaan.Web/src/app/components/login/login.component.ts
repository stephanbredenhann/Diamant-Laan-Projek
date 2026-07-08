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
        <p class="auth-link">Nog nie 'n rekening? <a routerLink="/registreer">Registreer hier</a></p>
      </div>
    </div>
  `,
  styles: [`
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
