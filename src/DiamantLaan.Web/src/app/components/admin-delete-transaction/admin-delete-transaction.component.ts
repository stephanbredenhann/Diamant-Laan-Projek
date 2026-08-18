import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminTransaction } from '../../services/admin.service';
import { blokLabel } from '../../utils/afrikaans.util';

@Component({
  selector: 'app-admin-delete-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-content">
      <div class="warning-card">
        <strong>Let wel:</strong> hierdie bladsy verwyder 'n transaksie permanent — ook 'n bevestigde
        telefoniese aankoop. Die blokke word weer beskikbaar vir verkoop en die vorderingsyfers word
        aangepas. Daar is geen ongedaan-knoppie nie, daarom moet jy jou eie wagwoord intik.
      </div>

      <div class="table-card">
        <div class="table-header">
          <h3>Verwyder transaksie</h3>
          <div class="table-actions">
            <input
              type="text"
              [(ngModel)]="search"
              placeholder="Soek naam, e-pos of aankoop #...">
          </div>
        </div>

        @if (loading) {
          <p class="muted">Laai transaksies...</p>
        } @else if (loadError) {
          <p class="error-msg">{{ loadError }}</p>
        } @else {
          @if (successMessage) {
            <p class="success-msg">{{ successMessage }}</p>
          }

          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Aankoop #</th>
                  <th>Koper</th>
                  <th>E-pos</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th class="numeric">Aantal</th>
                  <th class="numeric">Totaal</th>
                  <th>Blok-ID’s</th>
                  <th class="action-col">Aksie</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of filteredTransactions; track tx.id) {
                  <tr>
                    <td>{{ tx.purchaseDate | date:'dd MMM yyyy HH:mm' }}</td>
                    <td>#{{ tx.id }}</td>
                    <td>{{ tx.userName }}</td>
                    <td>{{ tx.userEmail }}</td>
                    <td>{{ purchaseSourceLabel(tx.purchaseSource) }}</td>
                    <td>
                      <span
                        class="status-badge"
                        [class.status-confirmed]="tx.paymentStatus === 'Confirmed'"
                        [class.status-pending]="tx.paymentStatus === 'Pending'"
                        [class.status-cancelled]="tx.paymentStatus === 'Cancelled'"
                        [class.status-failed]="tx.paymentStatus === 'Failed'">
                        {{ paymentStatusLabel(tx.paymentStatus) }}
                      </span>
                    </td>
                    <td class="numeric">{{ tx.squareCount }} {{ blokLabel(tx.squareCount) }}</td>
                    <td class="numeric">R{{ tx.amount | number:'1.0-0' }}</td>
                    <td class="ids">{{ tx.squareIds.join(', ') }}</td>
                    <td class="action-col">
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        [disabled]="deletingId !== null"
                        (click)="startDelete(tx)">
                        Verwyder
                      </button>
                    </td>
                  </tr>

                  @if (confirmingId === tx.id) {
                    <tr class="confirm-row">
                      <td colspan="10">
                        <div class="confirm-panel">
                          <p>
                            Verwyder aankoop <strong>#{{ tx.id }}</strong> van
                            <strong>{{ tx.userName }}</strong> —
                            {{ tx.squareCount }} {{ blokLabel(tx.squareCount) }}
                            (R{{ tx.amount | number:'1.0-0' }}, {{ paymentStatusLabel(tx.paymentStatus) }}).
                            Die blokke {{ tx.squareIds.join(', ') }} word weer beskikbaar.
                          </p>
                          <div class="confirm-actions">
                            <input
                              type="password"
                              autocomplete="current-password"
                              placeholder="Jou admin-wagwoord"
                              [(ngModel)]="password"
                              (keyup.enter)="confirmDelete(tx)">
                            <button
                              type="button"
                              class="btn btn-danger btn-sm"
                              [disabled]="deletingId !== null || !password"
                              (click)="confirmDelete(tx)">
                              {{ deletingId === tx.id ? 'Besig...' : 'Verwyder permanent' }}
                            </button>
                            <button
                              type="button"
                              class="btn btn-outline btn-sm"
                              [disabled]="deletingId !== null"
                              (click)="cancelDelete()">
                              Kanselleer
                            </button>
                          </div>
                          @if (deleteError) {
                            <p class="error-msg">{{ deleteError }}</p>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
                @if (filteredTransactions.length === 0) {
                  <tr>
                    <td colspan="10" class="empty">Geen transaksies gevind nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-content { display: flex; flex-direction: column; gap: 1.5rem; }
    .warning-card {
      background: #fdf0f0;
      border: 1px solid #f0c0c0;
      border-radius: var(--radius);
      padding: 0.875rem 1rem;
      font-size: 0.8125rem;
      color: #721c24;
      line-height: 1.5;
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
    .ids { max-width: 160px; word-break: break-word; }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .status-confirmed { background: #d4edda; color: #155724; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    .status-failed { background: #e2e3e5; color: #383d41; }
    .btn-danger {
      background: #c62828;
      color: #fff;
      border: 1px solid #c62828;
    }
    .btn-danger:hover { background: #b71c1c; border-color: #b71c1c; }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    .confirm-row td { background: #fdf7f7; }
    .confirm-panel p { margin: 0 0 0.625rem; color: var(--color-text); line-height: 1.5; }
    .confirm-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .confirm-actions input {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      width: 220px;
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
    .success-msg {
      color: #155724;
      font-size: 0.8125rem;
      margin: 0 0 0.75rem;
      padding: 0.5rem 0.75rem;
      background: #d4edda;
      border: 1px solid #b7dfc2;
      border-radius: var(--radius-sm);
    }
    .empty {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-muted);
    }
  `]
})
export class AdminDeleteTransactionComponent implements OnInit {
  private admin = inject(AdminService);

  transactions: AdminTransaction[] = [];
  loading = true;
  loadError = '';
  search = '';

  confirmingId: number | null = null;
  deletingId: number | null = null;
  password = '';
  deleteError = '';
  successMessage = '';

  readonly blokLabel = blokLabel;

  ngOnInit() {
    this.admin.getTransactions().subscribe({
      next: (rows) => {
        this.transactions = rows;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loadError = err.status === 401 || err.status === 403
          ? 'Geen toegang nie. Meld asseblief weer as admin aan.'
          : 'Kon nie transaksies laai nie.';
        this.loading = false;
      }
    });
  }

  get filteredTransactions(): AdminTransaction[] {
    const q = this.search.trim().toLowerCase();
    const rows = !q
      ? this.transactions
      : this.transactions.filter(tx =>
          tx.userName?.toLowerCase().includes(q) ||
          tx.userEmail?.toLowerCase().includes(q) ||
          String(tx.id).includes(q));
    return [...rows].sort((a, b) =>
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }

  purchaseSourceLabel(source: string): string {
    return source === 'TelefonieseAankoop' ? 'Telefoniese aankoop' : 'PayFast';
  }

  paymentStatusLabel(status: string): string {
    switch (status) {
      case 'Confirmed': return 'Bevestig';
      case 'Pending': return 'Hangend';
      case 'Cancelled': return 'Gekanselleer';
      case 'Failed': return 'Misluk';
      default: return status;
    }
  }

  startDelete(tx: AdminTransaction) {
    this.confirmingId = tx.id;
    this.password = '';
    this.deleteError = '';
    this.successMessage = '';
  }

  cancelDelete() {
    this.confirmingId = null;
    this.password = '';
    this.deleteError = '';
  }

  confirmDelete(tx: AdminTransaction) {
    if (this.deletingId !== null || !this.password) return;

    this.deletingId = tx.id;
    this.deleteError = '';

    this.admin.deleteTransaction(tx.id, this.password).subscribe({
      next: () => {
        this.transactions = this.transactions.filter(t => t.id !== tx.id);
        this.successMessage =
          `Aankoop #${tx.id} is verwyder. ${tx.squareCount} ${blokLabel(tx.squareCount)} is weer beskikbaar.`;
        this.deletingId = null;
        this.confirmingId = null;
        this.password = '';
      },
      error: (err: HttpErrorResponse) => {
        this.deleteError = err.status === 403
          ? (err.error?.message ?? 'Wagwoord is verkeerd.')
          : (err.error?.message ?? 'Kon nie transaksie verwyder nie.');
        this.deletingId = null;
      }
    });
  }
}
