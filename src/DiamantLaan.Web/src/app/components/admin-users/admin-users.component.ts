import { ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';
import {
  CertificateCardComponent,
  CertificateSquare,
} from '../shared/certificate-card/certificate-card.component';

interface Buyer {
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  isOraniaResident?: boolean;
  squares: number;
  totalSpent: number;
  spendPerBlock: number;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, CertificateCardComponent],
  template: `
    <div class="admin-content">

      <!-- Certificate Download Table -->
      <div class="table-card">
        <div class="table-header">
          <h3>Sertifikate</h3>
          <div class="table-actions">
            <input
              type="text"
              [(ngModel)]="search"
              (input)="applyFilters()"
              placeholder="Soek naam of e-pos...">
          </div>
        </div>

        @if (loadingBuyers) {
          <p class="muted">Laai kopers...</p>
        } @else if (loadError) {
          <p class="error-msg">{{ loadError }}</p>
        } @else {
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th (click)="sortBy('name')" [class.sorted]="sortKey === 'name'">
                    Naam <span class="sort-icon">{{ sortIcon('name') }}</span>
                  </th>
                  <th (click)="sortBy('email')" [class.sorted]="sortKey === 'email'">
                    E-pos <span class="sort-icon">{{ sortIcon('email') }}</span>
                  </th>
                  <th (click)="sortBy('squares')" class="numeric" [class.sorted]="sortKey === 'squares'">
                    Blokke <span class="sort-icon">{{ sortIcon('squares') }}</span>
                  </th>
                  <th (click)="sortBy('totalSpent')" class="numeric" [class.sorted]="sortKey === 'totalSpent'">
                    Totaal bestee <span class="sort-icon">{{ sortIcon('totalSpent') }}</span>
                  </th>
                  <th class="cert-col">Sertifikaat</th>
                </tr>
              </thead>
              <tbody>
                @for (b of filteredBuyers; track b.userId) {
                  <tr>
                    <td>{{ b.name }}</td>
                    <td>{{ b.email }}</td>
                    <td class="numeric">{{ b.squares }}</td>
                    <td class="numeric">R{{ b.totalSpent | number:'1.0-0' }}</td>
                    <td class="cert-col">
                      <button
                        class="btn btn-outline btn-sm"
                        type="button"
                        [disabled]="downloadingUserId === b.userId"
                        (click)="downloadCertificate(b)">
                        {{ downloadingUserId === b.userId ? 'Besig...' : 'Laai af' }}
                      </button>
                    </td>
                  </tr>
                }
                @if (filteredBuyers.length === 0) {
                  <tr>
                    <td colspan="5" class="empty">Geen kopers gevind nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Make Admin Form -->
      <div class="form-card">
        <h3>Gebruikersbestuur</h3>
        <p class="hint">Maak ’n bestaande geregistreerde gebruiker ’n admin.</p>
        <form (ngSubmit)="submit()" class="admin-form">
          <div class="field">
            <label for="email-admin">E-pos</label>
            <input id="email-admin" type="email" [(ngModel)]="email" name="email" required placeholder="gebruiker@voorbeeld.co.za">
          </div>
          <app-alert [message]="message" [type]="isError ? 'error' : 'success'"></app-alert>
          <button type="submit" class="btn btn-primary" [disabled]="loading || !email.trim()">
            {{ loading ? 'Besig...' : 'Maak tot admin' }}
          </button>
        </form>
      </div>

    </div>

    <!-- Off-screen real summary certificate used only for PDF export -->
    <div class="cert-export-host" aria-hidden="true">
      <app-certificate-card
        #certCard
        [ownerName]="certOwnerName"
        [squares]="certSquares"
        [lockedMode]="'summary'"
        [viewOnly]="true" />
    </div>
  `,
  styles: [`
    .admin-content { display: flex; flex-direction: column; gap: 1.5rem; }
    .muted { color: var(--color-muted); }
    .error-msg {
      color: #b33;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0.75rem;
      background: #fdf0f0;
      border: 1px solid #f0c0c0;
      border-radius: var(--radius-sm);
    }

    /* Table card — same style as Statistieke */
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
    .table-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .table-actions input {
      width: 220px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }
    .table-scroll { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
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
    th.sorted { color: var(--color-text); }
    th:hover { color: var(--color-terracotta); }
    th.cert-col { cursor: default; }
    th.cert-col:hover { color: var(--color-muted); }
    .sort-icon {
      font-size: 0.625rem;
      margin-left: 0.125rem;
      opacity: 0.4;
    }
    th.sorted .sort-icon { opacity: 1; color: var(--color-terracotta); }
    td { color: var(--color-muted); }
    .numeric { text-align: right; }
    .cert-col { text-align: center; }
    .empty {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-muted);
    }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }

    /* Make Admin form */
    .form-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      max-width: 560px;
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

    .cert-export-host {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 820px;
      pointer-events: none;
    }

    @media (max-width: 992px) {
      .table-actions { width: 100%; }
      .table-actions input { flex: 1; }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('certCard') certCard!: CertificateCardComponent;

  private admin = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  buyers: Buyer[] = [];
  filteredBuyers: Buyer[] = [];
  search = '';
  sortKey: keyof Buyer = 'totalSpent';
  sortDesc = true;
  loadingBuyers = true;
  loadError = '';
  downloadingUserId: string | null = null;

  certOwnerName = '';
  certSquares: CertificateSquare[] = [];

  email = '';
  message = '';
  isError = false;
  loading = false;

  ngOnInit() {
    this.admin.getPurchases().subscribe({
      next: (data) => {
        this.buyers = data.map((b: Omit<Buyer, 'spendPerBlock'>) => ({
          ...b,
          spendPerBlock: b.squares > 0 ? b.totalSpent / b.squares : 0
        }));
        this.applyFilters();
        this.loadingBuyers = false;
      },
      error: () => {
        this.loadError = 'Kon nie kopers laai nie.';
        this.loadingBuyers = false;
      }
    });
  }

  applyFilters() {
    const term = this.search.trim().toLowerCase();
    let result = this.buyers.filter(b =>
      !term ||
      b.name.toLowerCase().includes(term) ||
      b.email.toLowerCase().includes(term)
    );

    result = result.sort((a, b) => {
      const va = a[this.sortKey];
      const vb = b[this.sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return this.sortDesc ? -1 : 1;
      if (vb == null) return this.sortDesc ? 1 : -1;
      if (typeof va === 'string' && typeof vb === 'string') {
        return this.sortDesc ? vb.localeCompare(va) : va.localeCompare(vb);
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return this.sortDesc ? vb - va : va - vb;
      }
      if (typeof va === 'boolean' && typeof vb === 'boolean') {
        return this.sortDesc ? (vb === va ? 0 : vb ? 1 : -1) : (va === vb ? 0 : va ? 1 : -1);
      }
      return 0;
    });

    this.filteredBuyers = result;
  }

  sortBy(key: keyof Buyer) {
    if (this.sortKey === key) {
      this.sortDesc = !this.sortDesc;
    } else {
      this.sortKey = key;
      this.sortDesc = true;
    }
    this.applyFilters();
  }

  sortIcon(key: keyof Buyer): string {
    if (this.sortKey !== key) return '⇅';
    return this.sortDesc ? '▼' : '▲';
  }

  async downloadCertificate(buyer: Buyer) {
    if (this.downloadingUserId) return;

    this.downloadingUserId = buyer.userId;

    try {
      const summary = await firstValueFrom(this.admin.getCertificateSummary(buyer.userId));
      this.certOwnerName = summary.ownerName;
      this.certSquares = (summary.squares ?? []).map(s => ({
        id: s.id,
        purchaseDate: s.purchaseDate ?? undefined,
      }));
      this.cdr.detectChanges();

      // Let the certificate card apply lockedMode / sheet layout before capture.
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      await this.certCard.downloadPdf();
    } catch {
      // Button re-enables in finally; certificate-card surfaces its own PDF errors when relevant.
    } finally {
      this.downloadingUserId = null;
      this.certSquares = [];
      this.certOwnerName = '';
    }
  }

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
