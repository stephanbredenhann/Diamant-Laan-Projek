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
        <div class="auth-header">
          <h2>Registreer</h2>
          <p>Sluit aan by die gemeenskap en help teer Diamant Laan.</p>
        </div>
        <form (ngSubmit)="submit()">
          <div class="form-row">
            <div class="form-group">
              <label>Naam</label>
              <input type="text" [(ngModel)]="firstName" name="firstName" required placeholder="Jou naam">
            </div>
            <div class="form-group">
              <label>Van</label>
              <input type="text" [(ngModel)]="lastName" name="lastName" required placeholder="Jou van">
            </div>
          </div>
          <div class="form-group">
            <label>E-pos</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" placeholder="jou@epos.co.za">
          </div>
          <div class="form-group">
            <label>Wagwoord</label>
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="new-password" minlength="6" placeholder="Kies 'n wagwoord">
          </div>
          <div class="form-group">
            <label>Foon Nommer</label>
            <input type="tel" [(ngModel)]="phoneNumber" name="phoneNumber" placeholder="082 123 4567">
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" [(ngModel)]="isOraniaResident" name="isOraniaResident">
              Inwoner van Orania?
            </label>
          </div>
          @if (error) {
            <div class="error-alert">{{ error }}</div>
          }
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Besig...' : 'Registreer' }}
          </button>
        </form>
        <p class="auth-link">Reeds 'n rekening? <a routerLink="/meld-aan">Meld aan hier</a></p>
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
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row .form-group { flex: 1; }
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
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text);
      cursor: pointer;
    }
    .checkbox-group input { width: auto; }
    @media (max-width: 480px) {
      .auth-card { margin: 1.5rem auto 2rem; padding: 1.5rem 1.25rem; }
      .form-row { flex-direction: column; gap: 0; }
    }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  phoneNumber = '';
  isOraniaResident = false;
  error = '';
  loading = false;

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.register(this.firstName, this.lastName, this.email, this.password, this.phoneNumber, this.isOraniaResident).subscribe({
      next: () => this.router.navigate(['/kaart']),
      error: (err) => { this.error = err.error?.message || 'Registrasie het misluk.'; this.loading = false; }
    });
  }
}
