import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminTransaction } from '../../services/admin.service';
import { ReceiptCardComponent, ReceiptData } from '../shared/receipt-card/receipt-card.component';
import { downloadElementAsPdf } from '../../utils/pdf-export.util';
import { blokLabel } from '../../utils/afrikaans.util';

type SortKey = 'purchaseDate' | 'id' | 'userName' | 'squareCount' | 'amountPerBlock' | 'amount';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReceiptCardComponent],
  template: `
    <div class="admin-content">
      <div class="table-card">
        <div class="table-header">
          <h3>Transaksies</h3>
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
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th (click)="sortBy('purchaseDate')" [class.sorted]="sortKey === 'purchaseDate'">
                    Datum <span class="sort-icon">{{ sortIcon('purchaseDate') }}</span>
                  </th>
                  <th (click)="sortBy('id')" [class.sorted]="sortKey === 'id'">
                    Aankoop # <span class="sort-icon">{{ sortIcon('id') }}</span>
                  </th>
                  <th (click)="sortBy('userName')" [class.sorted]="sortKey === 'userName'">
                    Koper <span class="sort-icon">{{ sortIcon('userName') }}</span>
                  </th>
                  <th>E-pos</th>
                  <th>Metode</th>
                  <th (click)="sortBy('squareCount')" class="numeric" [class.sorted]="sortKey === 'squareCount'">
                    Aantal <span class="sort-icon">{{ sortIcon('squareCount') }}</span>
                  </th>
                  <th (click)="sortBy('amountPerBlock')" class="numeric" [class.sorted]="sortKey === 'amountPerBlock'">
                    Bedrag per blok <span class="sort-icon">{{ sortIcon('amountPerBlock') }}</span>
                  </th>
                  <th (click)="sortBy('amount')" class="numeric" [class.sorted]="sortKey === 'amount'">
                    Totaal <span class="sort-icon">{{ sortIcon('amount') }}</span>
                  </th>
                  <th>Blok ID's</th>
                  <th class="action-col">Kwitansie</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of sortedTransactions; track tx.id) {
                  <tr>
                    <td>{{ tx.purchaseDate | date:'dd MMM yyyy HH:mm' }}</td>
                    <td>#{{ tx.id }}</td>
                    <td>{{ tx.userName }}</td>
                    <td>{{ tx.userEmail }}</td>
                    <td>{{ purchaseSourceLabel(tx.purchaseSource) }}</td>
                    <td class="numeric">{{ tx.squareCount }} {{ blokLabel(tx.squareCount) }}</td>
                    <td class="numeric">R{{ tx.amountPerBlock | number:'1.0-0' }}</td>
                    <td class="numeric">R{{ tx.amount | number:'1.0-0' }}</td>
                    <td class="ids">{{ tx.squareIds.join(', ') }}</td>
                    <td class="action-col">
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        [disabled]="downloadingId === tx.id"
                        (click)="downloadReceipt(tx)">
                        {{ downloadingId === tx.id ? 'Besig...' : 'Laai Kwitansie' }}
                      </button>
                    </td>
                  </tr>
                }
                @if (sortedTransactions.length === 0) {
                  <tr>
                    <td colspan="10" class="empty">Geen transaksies gevind nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (downloadError) {
          <p class="error-msg">{{ downloadError }}</p>
        }
      </div>
    </div>

    @if (receiptData) {
      <div #receiptExport class="receipt-export" aria-hidden="true">
        <app-receipt-card [data]="receiptData" />
      </div>
    }
  `,
  styles: [`
    .admin-content { display: flex; flex-direction: column; gap: 1.5rem; }
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
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
    }
    th.action-col { cursor: default; }
    th.action-col:hover { color: var(--color-muted); }
    th.sorted { color: var(--color-text); }
    th:hover:not(.action-col) { color: var(--color-terracotta); }
    .sort-icon { font-size: 0.625rem; margin-left: 0.125rem; opacity: 0.4; }
    th.sorted .sort-icon { opacity: 1; color: var(--color-terracotta); }
    td { color: var(--color-muted); }
    .numeric { text-align: right; }
    .action-col { text-align: center; white-space: nowrap; }
    .ids { max-width: 160px; word-break: break-word; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
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
    .receipt-export {
      position: fixed;
      left: -9999px;
      top: 0;
      pointer-events: none;
    }
  `]
})
export class AdminTransactionsComponent implements OnInit {
  private admin = inject(AdminService);

  @ViewChild('receiptExport') receiptExport?: ElementRef<HTMLElement>;

  transactions: AdminTransaction[] = [];
  loading = true;
  loadError = '';
  downloadError = '';
  downloadingId: number | null = null;
  receiptData: ReceiptData | null = null;
  search = '';

  sortKey: SortKey = 'purchaseDate';
  sortDir: 'asc' | 'desc' = 'desc';

  readonly blokLabel = blokLabel;

  purchaseSourceLabel(source: string): string {
    return source === 'TelefonieseAankoop' ? 'Telefoniese Aankoop' : 'PayFast';
  }

  ngOnInit() {
    this.admin.getTransactions().subscribe({
      next: (rows) => {
        this.transactions = rows;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403) {
          this.loadError = 'Geen toegang nie. Meld asseblief weer as admin aan.';
        } else {
          this.loadError = 'Kon nie transaksies laai nie.';
        }
        this.loading = false;
      }
    });
  }

  get filteredTransactions(): AdminTransaction[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.transactions;
    return this.transactions.filter(tx =>
      tx.userName?.toLowerCase().includes(q) ||
      tx.userEmail?.toLowerCase().includes(q) ||
      String(tx.id).includes(q)
    );
  }

  get sortedTransactions(): AdminTransaction[] {
    const sorted = [...this.filteredTransactions].sort((a, b) => {
      const key = this.sortKey;
      if (key === 'purchaseDate') {
        const cmp = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        return this.sortDir === 'asc' ? cmp : -cmp;
      }
      if (key === 'userName') {
        const cmp = (a.userName ?? '').localeCompare(b.userName ?? '');
        return this.sortDir === 'asc' ? cmp : -cmp;
      }
      const av = a[key as keyof AdminTransaction];
      const bv = b[key as keyof AdminTransaction];
      const cmp = Number(av) - Number(bv);
      return this.sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }

  sortBy(key: SortKey) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'purchaseDate' ? 'desc' : 'asc';
    }
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  async downloadReceipt(tx: AdminTransaction) {
    if (this.downloadingId !== null) return;

    this.receiptData = {
      purchaseId: tx.id,
      purchaseDate: tx.purchaseDate,
      buyerName: tx.userName ?? 'Koper',
      squareCount: tx.squareCount,
      squareIds: tx.squareIds,
      amountPerBlock: tx.amountPerBlock,
      amount: tx.amount,
      payFastPaymentId: tx.payFastPaymentId
    };

    this.downloadingId = tx.id;
    this.downloadError = '';

    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const element = this.receiptExport?.nativeElement;
      if (!element) throw new Error('missing element');
      await downloadElementAsPdf(element, `kwitansie-aankoop-${tx.id}.pdf`);
    } catch {
      this.downloadError = 'Kon nie kwitansie genereer nie. Probeer asseblief weer.';
    } finally {
      this.downloadingId = null;
    }
  }
}
