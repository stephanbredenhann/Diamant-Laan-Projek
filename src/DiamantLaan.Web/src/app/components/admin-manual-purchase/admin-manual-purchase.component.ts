import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminTransaction } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';
import { BlockPickerModalComponent } from '../shared/block-picker-modal/block-picker-modal.component';
import { PhoneInputComponent } from '../shared/phone-input/phone-input.component';
import { blokLabel } from '../../utils/afrikaans.util';
import { normalizePhoneLocal, validatePhone } from '../../utils/validation.util';

@Component({
  selector: 'app-admin-manual-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, BlockPickerModalComponent, PhoneInputComponent],
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
            <label>Foonnommer</label>
            <app-phone-input
              [(countryCode)]="phoneCountryCode"
              [(phoneNumber)]="phoneNumber"
            />
            @if (phoneError) {
              <p class="field-error">{{ phoneError }}</p>
            }
          </div>
          <div class="field checkbox">
            <label>
              <input type="checkbox" [(ngModel)]="isOraniaResident" name="isOraniaResident">
              Inwoner van Orania?
            </label>
          </div>
          <div class="field checkbox">
            <label>
              <input type="checkbox" [(ngModel)]="isOraniaBewegingMember" name="isOraniaBewegingMember">
              Lid van Orania Beweging?
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

      <div class="table-card">
        <div class="table-header">
          <h3>Bewyse van betaling</h3>
          <div class="table-actions">
            <input
              type="text"
              [(ngModel)]="proofSearch"
              name="proofSearch"
              placeholder="Soek koper, e-pos of aankoop #...">
          </div>
        </div>

        @if (proofsLoading) {
          <p class="muted">Laai bewyse...</p>
        } @else if (proofsLoadError) {
          <p class="error-msg">{{ proofsLoadError }}</p>
        } @else {
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Aankoop #</th>
                  <th>Koper</th>
                  <th>E-pos</th>
                  <th class="numeric">Blokke</th>
                  <th class="numeric">Totaal</th>
                  <th class="action-col">Bewys</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of filteredProofs; track tx.id) {
                  <tr>
                    <td>{{ tx.purchaseDate | date:'dd MMM yyyy HH:mm' }}</td>
                    <td>#{{ tx.id }}</td>
                    <td>{{ tx.userName }}</td>
                    <td>{{ tx.userEmail }}</td>
                    <td class="numeric">{{ tx.squareCount }} {{ blokLabel(tx.squareCount) }}</td>
                    <td class="numeric">R{{ tx.amount | number:'1.0-0' }}</td>
                    <td class="action-col">
                      @if (tx.hasProof) {
                        <div class="proof-actions">
                          <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            [disabled]="proofActionId === tx.id"
                            (click)="openProof(tx)">
                            {{ proofActionId === tx.id && proofAction === 'open' ? 'Besig...' : 'Maak oop' }}
                          </button>
                          <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            [disabled]="proofActionId === tx.id"
                            (click)="startProofUpload(tx.id)">
                            Vervang
                          </button>
                          <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            [disabled]="proofActionId === tx.id"
                            (click)="deleteProof(tx)">
                            {{ proofActionId === tx.id && proofAction === 'delete' ? 'Besig...' : 'Verwyder' }}
                          </button>
                        </div>
                      } @else {
                        <button
                          type="button"
                          class="btn btn-outline btn-sm"
                          [disabled]="proofActionId === tx.id"
                          (click)="startProofUpload(tx.id)">
                          {{ proofActionId === tx.id && proofAction === 'upload' ? 'Besig...' : 'Laai op' }}
                        </button>
                      }
                    </td>
                  </tr>
                }
                @if (filteredProofs.length === 0) {
                  <tr>
                    <td colspan="7" class="empty">Geen telefoniese aankope gevind nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (proofActionError) {
          <p class="error-msg">{{ proofActionError }}</p>
        }
      </div>

      <input
        #proofUploadInput
        type="file"
        accept="application/pdf"
        class="hidden-file"
        (change)="onProofUploadSelected($event)"
      />

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
    .admin-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1100px;
    }
    .form-card {
      max-width: 640px;
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
    .field-error {
      color: var(--color-error, #c0392b);
      font-size: 0.8125rem;
      margin-top: 0.375rem;
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
    .table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .table-header h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      color: var(--color-text);
      margin: 0;
    }
    .table-actions input {
      width: 260px;
      max-width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th, td {
      padding: 0.625rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    th {
      font-family: var(--font-heading);
      font-weight: 600;
      color: var(--color-muted);
      white-space: nowrap;
    }
    td { color: var(--color-muted); }
    .numeric { text-align: right; }
    .action-col { text-align: center; white-space: nowrap; }
    .proof-actions {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      justify-content: center;
    }
    .muted { color: var(--color-muted); }
    .error-msg {
      color: #b33;
      font-size: 0.8125rem;
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: #fdf0f0;
      border: 1px solid #f0c0c0;
      border-radius: var(--radius-sm);
    }
    .empty {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-muted);
    }
    .hidden-file {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminManualPurchaseComponent implements OnInit {
  @ViewChild('proofUploadInput') proofUploadInput?: ElementRef<HTMLInputElement>;

  private admin = inject(AdminService);

  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  phoneCountryCode = '+27';
  phoneError = '';
  isOraniaResident = false;
  isOraniaBewegingMember = false;
  selectedSquareIds: number[] = [];
  pickerOpen = false;
  proofFile: File | null = null;
  message = '';
  isError = false;
  loading = false;

  telephonePurchases: AdminTransaction[] = [];
  proofsLoading = true;
  proofsLoadError = '';
  proofSearch = '';
  proofActionId: number | null = null;
  proofAction: 'open' | 'upload' | 'delete' | null = null;
  proofActionError = '';
  uploadTargetId: number | null = null;

  readonly blokLabel = blokLabel;

  get totalAmount(): number {
    return this.selectedSquareIds.length * 500;
  }

  get filteredProofs(): AdminTransaction[] {
    const q = this.proofSearch.trim().toLowerCase();
    if (!q) return this.telephonePurchases;
    return this.telephonePurchases.filter(tx =>
      String(tx.id).includes(q) ||
      (tx.userName ?? '').toLowerCase().includes(q) ||
      (tx.userEmail ?? '').toLowerCase().includes(q)
    );
  }

  ngOnInit() {
    this.loadProofs();
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

  loadProofs() {
    this.proofsLoading = true;
    this.proofsLoadError = '';
    this.admin.getTransactions().subscribe({
      next: (rows) => {
        this.telephonePurchases = rows
          .filter(r => r.purchaseSource === 'TelefonieseAankoop')
          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        this.proofsLoading = false;
      },
      error: () => {
        this.proofsLoadError = 'Kon nie bewyse laai nie.';
        this.proofsLoading = false;
      }
    });
  }

  openProof(tx: AdminTransaction) {
    this.proofActionError = '';
    this.proofActionId = tx.id;
    this.proofAction = 'open';
    this.admin.getProofOfPayment(tx.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        this.proofActionId = null;
        this.proofAction = null;
      },
      error: () => {
        this.proofActionError = `Kon nie bewys vir aankoop #${tx.id} oopmaak nie.`;
        this.proofActionId = null;
        this.proofAction = null;
        this.loadProofs();
      }
    });
  }

  startProofUpload(purchaseId: number) {
    this.proofActionError = '';
    this.uploadTargetId = purchaseId;
    const input = this.proofUploadInput?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

  onProofUploadSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const purchaseId = this.uploadTargetId;
    this.uploadTargetId = null;
    input.value = '';
    if (!file || purchaseId == null) return;

    this.proofActionId = purchaseId;
    this.proofAction = 'upload';
    this.admin.uploadProofOfPayment(purchaseId, file).subscribe({
      next: () => {
        this.proofActionId = null;
        this.proofAction = null;
        this.loadProofs();
      },
      error: (err) => {
        this.proofActionError = err.error?.message || `Kon nie bewys vir aankoop #${purchaseId} oplaai nie.`;
        this.proofActionId = null;
        this.proofAction = null;
      }
    });
  }

  deleteProof(tx: AdminTransaction) {
    if (!confirm(`Verwyder bewys vir aankoop #${tx.id}?`)) return;

    this.proofActionError = '';
    this.proofActionId = tx.id;
    this.proofAction = 'delete';
    this.admin.deleteProofOfPayment(tx.id).subscribe({
      next: () => {
        this.proofActionId = null;
        this.proofAction = null;
        this.loadProofs();
      },
      error: (err) => {
        this.proofActionError = err.error?.message || `Kon nie bewys vir aankoop #${tx.id} verwyder nie.`;
        this.proofActionId = null;
        this.proofAction = null;
      }
    });
  }

  submit() {
    this.message = '';
    this.isError = false;
    this.phoneError = '';

    if (this.selectedSquareIds.length === 0) {
      this.message = 'Kies ten minste een blok op die kaart.';
      this.isError = true;
      return;
    }

    const phoneError = validatePhone(this.phoneNumber, this.phoneCountryCode);
    if (phoneError) {
      this.phoneError = phoneError;
      this.isError = true;
      return;
    }

    const formData = new FormData();
    formData.append('firstName', this.firstName.trim());
    formData.append('lastName', this.lastName.trim());
    formData.append('email', this.email.trim());
    formData.append('phoneNumber', normalizePhoneLocal(this.phoneNumber, this.phoneCountryCode));
    formData.append('phoneCountryCode', this.phoneCountryCode);
    formData.append('isOraniaResident', String(this.isOraniaResident));
    formData.append('isOraniaBewegingMember', String(this.isOraniaBewegingMember));
    this.selectedSquareIds.forEach(id => formData.append('squareIds', String(id)));
    if (this.proofFile) {
      formData.append('proofOfPayment', this.proofFile);
    }

    this.loading = true;
    this.admin.manualPurchase(formData).subscribe({
      next: (res) => {
        this.message = `Aankoop #${res.purchaseId} voltooi — ${res.squareCount} ${blokLabel(res.squareCount)} vir R${res.amount}.`;
        if (res.welcomeEmailSent === false) {
          this.message += ' Waarskuwing: die welkom-e-pos kon nie gestuur word nie. Kontroleer Resend-instellings of stuur die wagwoord handmatig.';
          this.isError = true;
        }
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.phoneNumber = '';
        this.phoneCountryCode = '+27';
        this.phoneError = '';
        this.isOraniaResident = false;
        this.isOraniaBewegingMember = false;
        this.selectedSquareIds = [];
        this.proofFile = null;
        this.loading = false;
        this.loadProofs();
      },
      error: (err) => {
        this.message = err.error?.message || (Array.isArray(err.error) ? err.error.join(', ') : 'Aankoop het misluk.');
        this.isError = true;
        this.loading = false;
      }
    });
  }
}
