import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';
import { blokLabel } from '../../utils/afrikaans.util';

@Component({
  selector: 'app-admin-manual-purchase',
  standalone: true,
  imports: [FormsModule, AlertComponent],
  template: `
    <div class="admin-content">
      <div class="form-card">
        <h3>Telefoniese Aankoop</h3>
        <p class="hint">Voltooi 'n aankoop namens iemand (bv. telefoniese bestelling).</p>

        <form (ngSubmit)="submit()" class="admin-form">
          <div class="grid">
            <div class="field">
              <label for="firstName">Voornaam</label>
              <input id="firstName" [(ngModel)]="firstName" name="firstName" required>
            </div>
            <div class="field">
              <label for="lastName">Van</label>
              <input id="lastName" [(ngModel)]="lastName" name="lastName" required>
            </div>
          </div>
          <div class="field">
            <label for="email">E-pos</label>
            <input id="email" type="email" [(ngModel)]="email" name="email" required>
          </div>
          <div class="field">
            <label for="phone">Foonnommer</label>
            <input id="phone" [(ngModel)]="phoneNumber" name="phoneNumber">
          </div>
          <div class="field checkbox">
            <label>
              <input type="checkbox" [(ngModel)]="isOraniaResident" name="isOraniaResident">
              Inwoner van Orania?
            </label>
          </div>
          <div class="field">
            <label for="squareIds">Blok ID's (komma-geskei)</label>
            <input id="squareIds" [(ngModel)]="squareIdsText" name="squareIds" required placeholder="101, 102, 103">
          </div>
          @if (parseSquareIds().length > 0) {
            <div class="field total-summary">
              <span class="total-label">Totaal</span>
              <span class="total-amount">R{{ totalAmount }}</span>
              <span class="total-hint">R500 per blok</span>
            </div>
          }
          <div class="field">
            <label for="proof">Bewys van Betaling (PDF, opsioneel)</label>
            <input id="proof" type="file" accept="application/pdf" (change)="onFileSelected($event)">
          </div>

          <app-alert [message]="message" [type]="isError ? 'error' : 'success'"></app-alert>

          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Besig...' : 'Voltooi Aankoop' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .admin-content { max-width: 640px; }
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
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .field { margin-bottom: 1rem; }
    .field label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }
    .field.checkbox label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }
    .field.checkbox input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
      padding: 0;
      margin: 0;
      border: none;
      box-shadow: none;
      flex: none;
      accent-color: var(--color-terracotta);
    }
    .field.checkbox input[type="checkbox"]:focus {
      box-shadow: none;
      outline: 2px solid var(--color-terracotta);
      outline-offset: 2px;
    }
    .field input[type="text"],
    .field input[type="email"] {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }
    .total-summary {
      background: var(--color-cream);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      text-align: center;
    }
    .total-label {
      display: block;
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }
    .total-amount {
      display: block;
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .total-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--color-muted);
      margin-top: 0.25rem;
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
    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminManualPurchaseComponent {
  private admin = inject(AdminService);

  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  isOraniaResident = false;
  squareIdsText = '';
  proofFile: File | null = null;
  message = '';
  isError = false;
  loading = false;

  get totalAmount(): number {
    return this.parseSquareIds().length * 500;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.proofFile = input.files?.[0] ?? null;
  }

  parseSquareIds(): number[] {
    return this.squareIdsText
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
  }

  submit() {
    this.message = '';
    this.isError = false;

    const squareIds = this.parseSquareIds();
    if (squareIds.length === 0) {
      this.message = 'Voer ten minste een geldige blok ID in.';
      this.isError = true;
      return;
    }

    const formData = new FormData();
    formData.append('firstName', this.firstName.trim());
    formData.append('lastName', this.lastName.trim());
    formData.append('email', this.email.trim());
    formData.append('phoneNumber', this.phoneNumber.trim());
    formData.append('isOraniaResident', String(this.isOraniaResident));
    squareIds.forEach(id => formData.append('squareIds', String(id)));
    if (this.proofFile) {
      formData.append('proofOfPayment', this.proofFile);
    }

    this.loading = true;
    this.admin.manualPurchase(formData).subscribe({
      next: (res) => {
        this.message = `Aankoop #${res.purchaseId} voltooi — ${res.squareCount} ${blokLabel(res.squareCount)} vir R${res.amount}.`;
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.phoneNumber = '';
        this.isOraniaResident = false;
        this.squareIdsText = '';
        this.proofFile = null;
        this.loading = false;
      },
      error: (err) => {
        this.message = err.error?.message || (Array.isArray(err.error) ? err.error.join(', ') : 'Aankoop het misluk.');
        this.isError = true;
        this.loading = false;
      }
    });
  }
}
