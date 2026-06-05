import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="auth-card">
        <h2>Registreer</h2>
        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>Naam</label>
            <input type="text" [(ngModel)]="firstName" name="firstName" required>
          </div>
          <div class="form-group">
            <label>Van</label>
            <input type="text" [(ngModel)]="lastName" name="lastName" required>
          </div>
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email">
          </div>
          <div class="form-group">
            <label>Wagwoord</label>
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="new-password" minlength="6">
          </div>
          @if (error) {
            <p class="error">{{ error }}</p>
          }
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Besig...' : 'Registreer' }}
          </button>
        </form>
        <p class="auth-link">Reeds 'n rekening? <a routerLink="/meld-aan">Meld aan hier</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 400px;
      margin: 3rem auto;
      padding: 2rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }
    .auth-card h2 { margin-bottom: 1.5rem; }
    .auth-link { margin-top: 1rem; font-size: 0.875rem; text-align: center; }
    .error { color: #ef4444; font-size: 0.8125rem; margin-bottom: 0.75rem; }
    button { width: 100%; margin-top: 0.5rem; }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.register(this.firstName, this.lastName, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/kaart']),
      error: (err) => { this.error = err.error?.message || 'Registrasie het misluk.'; this.loading = false; }
    });
  }
}
