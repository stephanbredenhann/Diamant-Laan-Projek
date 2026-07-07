import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PurchaseService, PurchaseTransaction } from '../../services/purchase.service';
import { ReceiptCardComponent, ReceiptData } from '../shared/receipt-card/receipt-card.component';
import { downloadElementAsPdf } from '../../utils/pdf-export.util';
import { blokLabel } from '../../utils/afrikaans.util';

type SortKey = 'purchaseDate' | 'id' | 'squareCount' | 'amountPerBlock' | 'amount';

@Component({
  selector: 'app-my-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReceiptCardComponent],
  template: `
    <div class="container">
      <div class="page-header">
        <h2>My Transaksies</h2>
        <p class="hint">Jou bevestigde aankope en kwitansies.</p>
      </div>

      <div class="table-card">
        @if (loading) {
          <p class="muted">Laai transaksies...</p>
        } @else if (loadError) {
          <p class="error-msg">{{ loadError }}</p>
        } @else if (transactions.length === 0) {
          <div class="empty-state">
            <h3>Nog geen transaksies nie</h3>
            <p>Bevestigde aankope sal hier verskyn.</p>
          </div>
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
    .container { padding: 2rem 1.5rem 4rem; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      margin: 0 0 0.25rem;
    }
    .hint { color: var(--color-muted); margin: 0; font-size: 0.875rem; }
    .table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem;
      box-shadow: var(--shadow-sm);
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
    .ids { max-width: 180px; word-break: break-word; }
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
    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--color-muted);
    }
    .empty-state h3 {
      font-family: var(--font-heading);
      color: var(--color-text);
      margin: 0 0 0.5rem;
    }
    .receipt-export {
      position: fixed;
      left: -9999px;
      top: 0;
      pointer-events: none;
    }
  `]
})
export class MyTransactionsComponent implements OnInit {
  private purchase = inject(PurchaseService);
  private auth = inject(AuthService);

  @ViewChild('receiptExport') receiptExport?: ElementRef<HTMLElement>;

  transactions: PurchaseTransaction[] = [];
  loading = true;
  loadError = '';
  downloadError = '';
  downloadingId: number | null = null;
  receiptData: ReceiptData | null = null;

  sortKey: SortKey = 'purchaseDate';
  sortDir: 'asc' | 'desc' = 'desc';

  readonly blokLabel = blokLabel;

  ngOnInit() {
    this.purchase.getMyTransactions().subscribe({
      next: (rows) => {
        this.transactions = rows;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Kon nie transaksies laai nie.';
        this.loading = false;
      }
    });
  }

  get sortedTransactions(): PurchaseTransaction[] {
    const sorted = [...this.transactions].sort((a, b) => {
      const key = this.sortKey;
      const av = a[key];
      const bv = b[key];
      if (key === 'purchaseDate') {
        const cmp = new Date(av as string).getTime() - new Date(bv as string).getTime();
        return this.sortDir === 'asc' ? cmp : -cmp;
      }
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

  async downloadReceipt(tx: PurchaseTransaction) {
    if (this.downloadingId !== null) return;

    const user = this.auth.currentUser();
    const buyerName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Koper';

    this.receiptData = {
      purchaseId: tx.id,
      purchaseDate: tx.purchaseDate,
      buyerName,
      squareCount: tx.squareCount,
      squareIds: tx.squareIds,
      amountPerBlock: tx.amountPerBlock,
      amount: tx.amount
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
