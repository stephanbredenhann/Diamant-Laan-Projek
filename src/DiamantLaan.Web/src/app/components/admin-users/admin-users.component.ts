const SHORT_VERSION_THRESHOLD = 10;

import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';

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
  imports: [CommonModule, FormsModule, AlertComponent],
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
                    Totaal Bestee <span class="sort-icon">{{ sortIcon('totalSpent') }}</span>
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
        <h3>Gebruikers Bestuur</h3>
        <p class="hint">Maak 'n bestaande geregistreerde gebruiker 'n admin.</p>
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

    <!-- Hidden off-screen certificate card (short/summary version) -->
    <div #certCard class="cert-card-export" aria-hidden="true">
      <div class="demo-watermark">DEMO</div>
      <h1 class="cert-title">Eiendomssertifikaat</h1>
      <p class="cert-subtitle">Diamant Laan Teerprojek</p>
      <p class="cert-owner">Hierby word bevestig dat</p>
      <p class="cert-owner-name">{{ certName }}</p>
      <p class="cert-owner">die volgende bydrae op Diamant Laan gelewer het:</p>
      <dl class="cert-summary">
        <div>
          <dt>Totaal bestee</dt>
          <dd>R{{ certTotalSpent | number:'1.0-0' }}</dd>
        </div>
        <div>
          <dt>Blokke geborg</dt>
          <dd>{{ certBlocks | number:'1.0-0' }}</dd>
        </div>
      </dl>
      <p class="cert-disclaimer">Hierdie is 'n demonstrasiesertifikaat. Die finale ontwerp volg later.</p>
    </div>

    <!-- Hidden off-screen certificate card (full version — same layout, more context text) -->
    <div #certCardFull class="cert-card-export" aria-hidden="true">
      <div class="demo-watermark">DEMO</div>
      <h1 class="cert-title">Eiendomssertifikaat</h1>
      <p class="cert-subtitle">Diamant Laan Teerprojek</p>
      <p class="cert-owner">Hierby word bevestig dat</p>
      <p class="cert-owner-name">{{ certName }}</p>
      <p class="cert-owner">die volgende bydrae op Diamant Laan gelewer het:</p>
      <dl class="cert-summary">
        <div>
          <dt>Totaal bestee</dt>
          <dd>R{{ certTotalSpent | number:'1.0-0' }}</dd>
        </div>
        <div>
          <dt>Blokke geborg</dt>
          <dd>{{ certBlocks | number:'1.0-0' }}</dd>
        </div>
      </dl>
      <p class="cert-disclaimer">Hierdie is 'n demonstrasiesertifikaat. Die finale ontwerp volg later.</p>
    </div>

    <!-- Version prompt dialog -->
    @if (showVersionPrompt) {
      <div class="prompt-backdrop" (click)="closeVersionPrompt()">
        <div class="prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="version-prompt-title" (click)="$event.stopPropagation()">
          <h3 id="version-prompt-title">Korter sertifikaat?</h3>
          <p>
            Dit lyk of hierdie gebruiker se sertifikaat baie lank gaan wees. Sal jy 'n korter weergawe verkies?
          </p>
          <p class="prompt-hint">
            Die korter weergawe wys net die totaal bestee en aantal blokke — nie elke blok afsonderlik nie.
          </p>
          <div class="prompt-actions">
            <button type="button" class="btn btn-primary" [disabled]="!!downloadingUserId" (click)="downloadPdf('short')">Ja, korter weergawe</button>
            <button type="button" class="btn btn-outline" [disabled]="!!downloadingUserId" (click)="downloadPdf('full')">Nee, volledige sertifikaat</button>
          </div>
        </div>
      </div>
    }
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

    /* Off-screen certificate card */
    .cert-card-export {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 800px;
      background: #fff;
      border: 3px double #ccc;
      border-radius: 8px;
      padding: 3rem 2.5rem;
      text-align: center;
      font-family: Georgia, serif;
    }
    .demo-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 5rem;
      font-weight: 700;
      color: rgba(198, 123, 92, 0.12);
      pointer-events: none;
      user-select: none;
    }
    .cert-title {
      font-size: 1.75rem;
      color: #3D2B1F;
      margin-bottom: 0.25rem;
    }
    .cert-subtitle {
      color: #888;
      font-size: 0.9375rem;
      margin-bottom: 2rem;
    }
    .cert-owner { color: #888; font-size: 0.9375rem; }
    .cert-owner-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #C67B5C;
      margin: 0.5rem 0 1.5rem;
    }
    .cert-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      max-width: 420px;
      margin: 0 auto 1.5rem;
      text-align: center;
    }
    .cert-summary div {
      padding: 1.25rem 1rem;
      border: 1px solid #e2d9ce;
      border-radius: 4px;
      background: #F5F0E8;
    }
    .cert-summary dt {
      font-size: 0.8125rem;
      color: #888;
      margin-bottom: 0.35rem;
    }
    .cert-summary dd {
      font-size: 1.375rem;
      font-weight: 700;
      color: #C67B5C;
    }
    .cert-disclaimer {
      font-size: 0.75rem;
      color: #aaa;
      font-style: italic;
    }

    .prompt-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(61, 43, 31, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 1000;
    }
    .prompt-dialog {
      width: min(100%, 480px);
      background: var(--color-surface);
      border-radius: var(--radius);
      padding: 1.75rem;
      box-shadow: var(--shadow-lg);
    }
    .prompt-dialog h3 {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
    }
    .prompt-dialog p {
      color: var(--color-muted);
      font-size: 0.9375rem;
      margin-bottom: 0.75rem;
    }
    .prompt-hint {
      font-size: 0.8125rem !important;
      color: var(--color-muted-light) !important;
    }
    .prompt-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1.25rem;
    }

    @media (max-width: 992px) {
      .table-actions { width: 100%; }
      .table-actions input { flex: 1; }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('certCard') certCard!: ElementRef<HTMLElement>;
  @ViewChild('certCardFull') certCardFull!: ElementRef<HTMLElement>;

  private admin = inject(AdminService);

  buyers: Buyer[] = [];
  filteredBuyers: Buyer[] = [];
  search = '';
  sortKey: keyof Buyer = 'totalSpent';
  sortDesc = true;
  loadingBuyers = true;
  loadError = '';
  downloadingUserId: string | null = null;
  showVersionPrompt = false;
  private pendingBuyer: Buyer | null = null;

  certName = '';
  certTotalSpent = 0;
  certBlocks = 0;

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

  downloadCertificate(buyer: Buyer) {
    if (this.downloadingUserId) return;

    this.certName = buyer.name;
    this.certTotalSpent = buyer.totalSpent;
    this.certBlocks = buyer.squares;
    this.pendingBuyer = buyer;

    if (buyer.squares > SHORT_VERSION_THRESHOLD) {
      this.showVersionPrompt = true;
      return;
    }

    void this.downloadPdf('full');
  }

  closeVersionPrompt() {
    if (!this.downloadingUserId) {
      this.showVersionPrompt = false;
      this.pendingBuyer = null;
    }
  }

  async downloadPdf(version: 'full' | 'short') {
    const buyer = this.pendingBuyer;
    if (!buyer || this.downloadingUserId) return;

    this.showVersionPrompt = false;
    this.downloadingUserId = buyer.userId;

    try {
      await document.fonts.ready;

      // Give Angular one tick to render the updated cert card values
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const element = version === 'short'
        ? this.certCard.nativeElement
        : this.certCardFull.nativeElement;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
      const imgH = (canvas.height * pageW) / canvas.width;
      const drawH = Math.min(imgH, pageH);
      const drawW = (canvas.width * drawH) / canvas.height;
      const x = margin + (pageW - drawW) / 2;
      const y = margin + (pageH - drawH) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, drawW, drawH);
      const suffix = version === 'short' ? '-kort' : '';
      pdf.save(`sertifikaat-${this.sanitizeFilename(buyer.name)}${suffix}.pdf`);
    } catch {
      // silently ignore — the button re-enables on finally
    } finally {
      this.downloadingUserId = null;
      this.pendingBuyer = null;
    }
  }

  private sanitizeFilename(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'sertifikaat';
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
