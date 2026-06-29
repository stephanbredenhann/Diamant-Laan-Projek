import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';
import { AdminService } from '../../services/admin.service';

Chart.register(...registerables);
import { STATUS_LABELS, SquareStatus } from '../../models/square';

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

interface NonPurchaser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  isOraniaResident?: boolean;
}

interface DailySale {
  date: string;
  amount: number;
  squares: number;
}

interface StatusCount {
  status: number;
  count: number;
}

interface Stats {
  totalSquares: number;
  soldSquares: number;
  progress: number;
  totalRaised: number;
  sponsorBaseline: number;
  averageSpendPerBlock: number;
  perStatus: StatusCount[];
  dailySales: DailySale[];
  overMinimumSquares: number;
  exactMinimumSquares: number;
  oraniaSpend: number;
  outsiderSpend: number;
}

const STATUS_COLORS: Record<number, string> = {
  [SquareStatus.NogNieBeginNie]: '#D4C4A8',
  [SquareStatus.Voorberei]: '#B5651D',
  [SquareStatus.BesigOmTeTeer]: '#8B7355',
  [SquareStatus.KlaarGeteer]: '#6B7B3C',
};

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, RouterLink, RouterLinkActive],
  template: `
    <div class="container">
      <div class="page-header">
        <h2>Admin Paneel</h2>
      </div>
      <div class="admin-tabs">
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Kaart</a>
        <a routerLink="/admin/stats" routerLinkActive="active">Statistieke</a>
        <a routerLink="/admin/gebruikers" routerLinkActive="active">Gebruikers</a>
        <a routerLink="/admin/telefoon-aankoop" routerLinkActive="active">Telefoniese Aankoop</a>
      </div>

      @if (loading) {
        <p class="muted">Laai statistieke...</p>
      } @else {
        <div class="stats-grid">
          <div class="stat-card wide">
            <div class="stat-label">Inkomste Vordering</div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="revenuePercent"></div>
            </div>
            <div class="progress-values">
              <span>R{{ stats.totalRaised | number:'1.0-0' }}</span>
              <span>van R{{ stats.sponsorBaseline | number:'1.0-0' }} ({{ revenuePercent | number:'1.0-1' }}%)</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.soldSquares | number:'1.0-0' }}</div>
            <div class="stat-label">Blokke Verkoop</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.progress }}<small>%</small></div>
            <div class="stat-label">Gefinansier</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">R{{ stats.averageSpendPerBlock | number:'1.0-0' }}</div>
            <div class="stat-label">Gemiddelde Donasie per Blok</div>
          </div>
        </div>

        <div class="charts-row">
          <div class="chart-card">
            <h3>Daglikse Verkope</h3>
            <canvas baseChart
              [data]="dailyChartData"
              [options]="lineChartOptions"
              [type]="'line'">
            </canvas>
          </div>
          <div class="chart-card">
            <h3>Status Verdeling</h3>
            <canvas baseChart
              [data]="statusChartData"
              [options]="donutChartOptions"
              [type]="'doughnut'">
            </canvas>
          </div>
          <div class="chart-card">
            <h3>Blokke: Bo Minimum vs R500 Presies</h3>
            <canvas baseChart
              [data]="overMinimumChartData"
              [options]="donutChartOptions"
              [type]="'pie'">
            </canvas>
          </div>
          <div class="chart-card">
            <h3>Donasies vanaf Inwoners/Uitwoners</h3>
            <canvas baseChart
              [data]="oraniaChartData"
              [options]="donutChartOptions"
              [type]="'pie'">
            </canvas>
          </div>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h3>Kopers</h3>
            <div class="table-actions">
              <input type="text" [(ngModel)]="search" (input)="applyFilters()" placeholder="Soek naam of e-pos...">
              <button class="btn btn-outline btn-sm" (click)="downloadCsv()">Laai Af as CSV</button>
            </div>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th (click)="sortBy('name')">Naam</th>
                  <th (click)="sortBy('email')">E-pos</th>
                  <th (click)="sortBy('phoneNumber')">Foon Nommer</th>
                  <th (click)="sortBy('isOraniaResident')">Inwoner</th>
                  <th (click)="sortBy('squares')" class="numeric">Blokke</th>
                  <th (click)="sortBy('totalSpent')" class="numeric">Totaal Bestee</th>
                  <th (click)="sortBy('spendPerBlock')" class="numeric">Bestee per Blok</th>
                </tr>
              </thead>
              <tbody>
                @for (b of filteredBuyers; track b.userId) {
                  <tr>
                    <td>{{ b.name }}</td>
                    <td>{{ b.email }}</td>
                    <td>{{ b.phoneNumber || '-' }}</td>
                    <td>{{ b.isOraniaResident ? 'Ja' : 'Nee' }}</td>
                    <td class="numeric">{{ b.squares }}</td>
                    <td class="numeric">R{{ b.totalSpent | number:'1.0-0' }}</td>
                    <td class="numeric">R{{ b.spendPerBlock | number:'1.0-0' }}</td>
                  </tr>
                }
                @if (filteredBuyers.length === 0) {
                  <tr>
                    <td colspan="7" class="empty">Geen kopers gevind nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h3>Geregistreer Sonder Aankoop</h3>
            <div class="table-actions">
              <input type="text" [(ngModel)]="nonPurchaserSearch" (input)="applyNonPurchaserFilters()" placeholder="Soek naam of e-pos...">
              <button class="btn btn-outline btn-sm" (click)="downloadNonPurchaserCsv()">Voer uit as CSV</button>
            </div>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>E-pos</th>
                  <th>Foon Nommer</th>
                  <th>Inwoner</th>
                </tr>
              </thead>
              <tbody>
                @for (u of filteredNonPurchasers; track u.id) {
                  <tr>
                    <td>{{ u.name }}</td>
                    <td>{{ u.email }}</td>
                    <td>{{ u.phoneNumber || '-' }}</td>
                    <td>{{ u.isOraniaResident ? 'Ja' : 'Nee' }}</td>
                  </tr>
                }
                @if (filteredNonPurchasers.length === 0) {
                  <tr>
                    <td colspan="4" class="empty">Geen geregistreerde gebruikers sonder aankoop nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; }
    .page-header { margin-bottom: 0.75rem; }
    .page-header h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
    }
    .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .admin-tabs a {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      color: var(--color-muted);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .admin-tabs a.active {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-weight: 600;
    }
    .muted { color: var(--color-muted); }

    .stats-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      box-shadow: var(--shadow-sm);
    }
    .stat-card.wide { display: flex; flex-direction: column; justify-content: center; }
    .stat-value {
      font-family: var(--font-heading);
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .stat-value small {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-muted);
    }
    .stat-label {
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 0.5rem;
    }
    .progress-bar {
      width: 100%;
      height: 12px;
      background: var(--color-cream);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-olive), var(--color-terracotta));
      transition: width 0.4s ease;
    }
    .progress-values {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--color-muted);
    }

    .charts-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .chart-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .chart-card h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      color: var(--color-text);
      margin-bottom: 0.75rem;
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
      color: var(--color-text);
      cursor: pointer;
      white-space: nowrap;
    }
    th:hover { color: var(--color-terracotta); }
    td { color: var(--color-muted); }
    .numeric { text-align: right; }
    .empty {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-muted);
    }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }

    @media (max-width: 992px) {
      .stats-grid { grid-template-columns: 1fr; }
      .charts-row { grid-template-columns: 1fr; }
      .table-actions { width: 100%; }
      .table-actions input { flex: 1; }
    }
  `]
})
export class AdminStatsComponent implements OnInit {
  private admin = inject(AdminService);

  stats: Stats = {
    totalSquares: 0,
    soldSquares: 0,
    progress: 0,
    totalRaised: 0,
    sponsorBaseline: 2_000_000,
    averageSpendPerBlock: 0,
    perStatus: [],
    dailySales: [],
    overMinimumSquares: 0,
    exactMinimumSquares: 0,
    oraniaSpend: 0,
    outsiderSpend: 0
  };
  buyers: Buyer[] = [];
  filteredBuyers: Buyer[] = [];
  nonPurchasers: NonPurchaser[] = [];
  filteredNonPurchasers: NonPurchaser[] = [];
  search = '';
  nonPurchaserSearch = '';
  sortKey: keyof Buyer = 'totalSpent';
  sortDesc = true;
  loading = true;

  dailyChartData: any;
  statusChartData: any;
  overMinimumChartData: any;
  oraniaChartData: any;

  lineChartOptions: any = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 30 } },
      y: { beginAtZero: true }
    }
  };

  donutChartOptions: any = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
    }
  };

  get revenuePercent(): number {
    const pct = this.stats.sponsorBaseline > 0
      ? (this.stats.totalRaised / this.stats.sponsorBaseline) * 100
      : 0;
    return Math.min(100, Math.max(0, pct));
  }

  ngOnInit() {
    this.admin.getStats().subscribe({
      next: (s) => {
        this.stats = s;
        this.buildCharts();
      },
      error: () => { this.loading = false; }
    });

    this.admin.getPurchases().subscribe({
      next: (b) => {
        this.buyers = b.map((buyer: Omit<Buyer, 'spendPerBlock'>) => ({
          ...buyer,
          spendPerBlock: buyer.squares > 0 ? buyer.totalSpent / buyer.squares : 0
        }));
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    this.admin.getRegisteredNoPurchase().subscribe({
      next: (users) => {
        this.nonPurchasers = users;
        this.applyNonPurchaserFilters();
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

  downloadCsv() {
    const headers = ['Naam', 'E-pos', 'Foon Nommer', 'Inwoner van Orania', 'Blokke', 'Totaal Bestee', 'Bestee per Blok'];
    const rows = this.filteredBuyers.map(b => [
      b.name,
      b.email,
      b.phoneNumber || '',
      b.isOraniaResident ? 'Ja' : 'Nee',
      b.squares.toString(),
      b.totalSpent.toString(),
      b.spendPerBlock.toFixed(0)
    ]);

    this.downloadCsvFile('diamant-laan-kopers.csv', headers, rows);
  }

  applyNonPurchaserFilters() {
    const term = this.nonPurchaserSearch.trim().toLowerCase();
    this.filteredNonPurchasers = this.nonPurchasers.filter(u =>
      !term ||
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  }

  downloadNonPurchaserCsv() {
    const headers = ['Naam', 'E-pos', 'Foon Nommer', 'Inwoner van Orania'];
    const rows = this.filteredNonPurchasers.map(u => [
      u.name,
      u.email,
      u.phoneNumber || '',
      u.isOraniaResident ? 'Ja' : 'Nee'
    ]);

    this.downloadCsvFile('diamant-laan-nie-kopers.csv', headers, rows);
  }

  private downloadCsvFile(filename: string, headers: string[], rows: string[][]) {
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private buildCharts() {
    const dailyLabels = this.stats.dailySales.map(d => new Date(d.date).toLocaleDateString('af-ZA'));
    const dailyAmounts = this.stats.dailySales.map(d => d.amount);

    this.dailyChartData = {
      labels: dailyLabels,
      datasets: [{
        label: 'Verkope (R)',
        data: dailyAmounts,
        borderColor: '#C67B5C',
        backgroundColor: 'rgba(198, 123, 92, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    };

    const statusLabels = [0, 1, 2, 3].map(s => STATUS_LABELS[s as SquareStatus]);
    const statusCounts = [0, 1, 2, 3].map(s => this.stats.perStatus.find(x => x.status === s)?.count ?? 0);
    const statusColors = [0, 1, 2, 3].map(s => STATUS_COLORS[s]);

    this.statusChartData = {
      labels: statusLabels,
      datasets: [{
        data: statusCounts,
        backgroundColor: statusColors,
        borderWidth: 1
      }]
    };

    this.overMinimumChartData = {
      labels: ['Bo R500 per blok', 'Presies R500 per blok'],
      datasets: [{
        data: [this.stats.overMinimumSquares, this.stats.exactMinimumSquares],
        backgroundColor: ['#6B7B3C', '#D4C4A8'],
        borderWidth: 1
      }]
    };

    this.oraniaChartData = {
      labels: ['Inwoners', 'Uitwoners'],
      datasets: [{
        data: [this.stats.oraniaSpend, this.stats.outsiderSpend],
        backgroundColor: ['#B5651D', '#C67B5C'],
        borderWidth: 1
      }]
    };
  }
}
