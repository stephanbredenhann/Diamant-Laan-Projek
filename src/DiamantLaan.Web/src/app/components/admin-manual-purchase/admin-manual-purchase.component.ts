import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';
import { BlockPickerModalComponent } from '../shared/block-picker-modal/block-picker-modal.component';
import { blokLabel } from '../../utils/afrikaans.util';

@Component({
  selector: 'app-admin-manual-purchase',
  standalone: true,
  imports: [FormsModule, AlertComponent, BlockPickerModalComponent],
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
            <label>Blokke</label>
            <button type="button" class="btn btn-outline btn-sm" (click)="openPicker()">
              Kies blokke op kaart
            </button>
            @if (selectedSquareIds.length > 0) {
              <div class="pills">
                @for (id of selectedSquareIds; track id) {
                  <span class="block-pill">
                    #{{ id }}
                    <button
                      type="button"
                      class="block-pill-remove"
                      (click)="removeSquare(id)"
                      [attr.aria-label]="'Verwyder blok ' + id"
                    >&times;</button>
                  </span>
                }
              </div>
            } @else {
              <p class="empty-blocks">Geen blokke gekies nie.</p>
            }
          </div>
          @if (selectedSquareIds.length > 0) {
            <div class="field total-summary">
              <span class="total-label">Totaal</span>
              <span class="total-amount">R{{ totalAmount }}</span>
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

      @if (pickerOpen) {
        <app-block-picker-modal
          [initialIds]="selectedSquareIds"
          (confirmed)="onPickerConfirmed($event)"
          (cancelled)="pickerOpen = false"
        />
      }
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
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.75rem;
    }
    .empty-blocks {
      margin-top: 0.5rem;
      font-size: 0.8125rem;
      color: var(--color-muted);
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
  selectedSquareIds: number[] = [];
  pickerOpen = false;
  proofFile: File | null = null;
  message = '';
  isError = false;
  loading = false;

  get totalAmount(): number {
    return this.selectedSquareIds.length * 500;
  }

  openPicker() {
    this.pickerOpen = true;
  }

  onPickerConfirmed(ids: number[]) {
    this.selectedSquareIds = ids;
    this.pickerOpen = false;
  }

  removeSquare(id: number) {
    this.selectedSquareIds = this.selectedSquareIds.filter(x => x !== id);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.proofFile = input.files?.[0] ?? null;
  }

  submit() {
    this.message = '';
    this.isError = false;

    if (this.selectedSquareIds.length === 0) {
      this.message = 'Kies ten minste een blok op die kaart.';
      this.isError = true;
      return;
    }

    const formData = new FormData();
    formData.append('firstName', this.firstName.trim());
    formData.append('lastName', this.lastName.trim());
    formData.append('email', this.email.trim());
    formData.append('phoneNumber', this.phoneNumber.trim());
    formData.append('isOraniaResident', String(this.isOraniaResident));
    this.selectedSquareIds.forEach(id => formData.append('squareIds', String(id)));
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
        this.selectedSquareIds = [];
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
