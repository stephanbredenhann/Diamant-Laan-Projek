import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, AlertComponent],
  template: `
    <div class="admin-content">
      <div class="form-card">
        <h3>Gebruikers Bestuur</h3>
        <p class="hint">Maak 'n bestaande geregistreerde gebruiker 'n admin.</p>
        <form (ngSubmit)="submit()" class="admin-form">
          <div class="field">
            <label for="email">E-pos</label>
            <input id="email" type="email" [(ngModel)]="email" name="email" required placeholder="gebruiker@voorbeeld.co.za">
          </div>
          <app-alert [message]="message" [type]="isError ? 'error' : 'success'"></app-alert>
          <button type="submit" class="btn btn-primary" [disabled]="loading || !email.trim()">
            {{ loading ? 'Besig...' : 'Maak tot admin' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .admin-content { max-width: 560px; }
    .form-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }
    .form-card h3 {
      font-family: var(--font-heading);
      font-size: 1rem;
      margin-bottom: 0.375rem;
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin-bottom: 1.25rem;
    }
    .field { margin-bottom: 1rem; }
    .field label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }
    .field input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }
    .msg {
      font-size: 0.8125rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-sm);
      background: #E8ECD8;
      color: #5A6A32;
      margin-bottom: 1rem;
    }
    .msg.error {
      background: #FEF2F2;
      color: #DC2626;
    }
  `]
})
export class AdminUsersComponent {
  private admin = inject(AdminService);

  email = '';
  message = '';
  isError = false;
  loading = false;

  submit() {
    this.message = '';
    this.isError = false;
    this.loading = true;

    this.admin.makeAdmin(this.email.trim()).subscribe({
      next: (res) => {
        this.message = res.message || 'Gebruiker is nou admin.';
        this.email = '';
        this.loading = false;
      },
      error: (err) => {
        this.message = err.error?.message || (Array.isArray(err.error) ? err.error.join(', ') : 'Kon nie admin maak nie.');
        this.isError = true;
        this.loading = false;
      }
    });
  }
}
