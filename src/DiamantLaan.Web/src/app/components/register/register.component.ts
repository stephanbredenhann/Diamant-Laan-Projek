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
          <p>Sluit aan by die gemeenskap en help om die Diamant Laan te teer.</p>
        </div>
        <form (ngSubmit)="submit()">
          <div class="form-row">
            <div class="form-group">
              <label>Voornaam</label>
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
            <label>Foonnommer</label>
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
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row .form-group { flex: 1; }
    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text);
      cursor: pointer;
      text-transform: none;
      letter-spacing: normal;
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
