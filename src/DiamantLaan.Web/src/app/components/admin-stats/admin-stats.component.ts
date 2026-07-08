import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';
import { AdminService } from '../../services/admin.service';

Chart.register(...registerables);
import { STATUS_LABELS, SquareStatus, STATUS_COLORS } from '../../models/square';

interface Buyer {
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  phoneDisplay?: string;
  isOraniaResident?: boolean;
  isOraniaBewegingMember?: boolean;
  squares: number;
  totalSpent: number;
}

interface NonPurchaser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  phoneDisplay?: string;
  isOraniaResident?: boolean;
  isOraniaBewegingMember?: boolean;
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
  totalRaised: number;
  sponsorBaseline: number;
  perStatus: StatusCount[];
  dailySales: DailySale[];
  oraniaSquares: number;
  outsiderSquares: number;
  bewegingSquares: number;
  nonBewegingSquares: number;
}

type DailyChartMode = 'daily' | 'cumulative';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <div class="admin-content">
      @if (loading) {
        <p class="muted">Laai statistieke...</p>
      } @else {
        <div class="export-bar">
          <button
            type="button"
            class="btn btn-outline btn-sm"
            (click)="downloadPdf()"
            [disabled]="exportingPdf">
            {{ exportingPdf ? 'Genereer PDF...' : 'Laai af as PDF' }}
          </button>
          @if (pdfError) {
            <p class="error-msg">{{ pdfError }}</p>
          }
        </div>

        <div #statsExport class="stats-export">
        @if (loadError) {
          <p class="error-msg">{{ loadError }}</p>
        }

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
            <div class="stat-value">
              {{ stats.soldSquares | number:'1.0-0' }}<small> / {{ stats.totalSquares | number:'1.0-0' }}</small>
            </div>
            <div class="stat-label">Blokke Verkoop</div>
            <div class="mini-progress">
              <div class="mini-progress-fill" [style.width.%]="salesPercent"></div>
            </div>
            <div class="stat-sub">{{ salesPercent | number:'1.0-1' }}% verkoop · {{ availableSquares | number:'1.0-0' }} beskikbaar</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ conversionRate | number:'1.0-1' }}<small>%</small></div>
            <div class="stat-label">Omskakelingskoers</div>
            <div class="mini-progress">
              <div class="mini-progress-fill" [style.width.%]="conversionRate"></div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ projectedCompletionLabel }}</div>
            <div class="stat-label">Geskatte Uitverkoop</div>
          </div>
        </div>

        <div class="charts-timeseries">
          <div class="chart-card">
            <div class="chart-header">
              <h3>Daglikse Verkope</h3>
              <div class="chart-toggle">
                <button
                  type="button"
                  class="toggle-btn"
                  [class.active]="dailyChartMode === 'daily'"
                  (click)="setDailyChartMode('daily')">
                  Daagliks
                </button>
                <button
                  type="button"
                  class="toggle-btn"
                  [class.active]="dailyChartMode === 'cumulative'"
                  (click)="setDailyChartMode('cumulative')">
                  Kumulatief
                </button>
              </div>
            </div>
            <canvas baseChart
              [data]="dailyChartData"
              [options]="lineChartOptions"
              [type]="'line'">
            </canvas>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3>Blokke Verkoop</h3>
              <div class="chart-toggle">
                <button
                  type="button"
                  class="toggle-btn"
                  [class.active]="squaresChartMode === 'daily'"
                  (click)="setSquaresChartMode('daily')">
                  Daagliks
                </button>
                <button
                  type="button"
                  class="toggle-btn"
                  [class.active]="squaresChartMode === 'cumulative'"
                  (click)="setSquaresChartMode('cumulative')">
                  Kumulatief
                </button>
              </div>
            </div>
            <canvas baseChart
              [data]="squaresChartData"
              [options]="squaresChartOptions"
              [type]="'line'">
            </canvas>
          </div>
        </div>

        <div class="charts-row">
          <div class="chart-card">
            <h3>Status Verdeling</h3>
            <canvas baseChart
              [data]="statusChartData"
              [options]="donutChartOptions"
              [type]="'doughnut'">
            </canvas>
          </div>
          <div class="chart-card">
            <h3>Inwoners vs Uitwoners</h3>
            <p class="chart-subtitle">Blokke gekoop</p>
            <canvas baseChart
              [data]="oraniaChartData"
              [options]="donutChartOptions"
              [type]="'pie'">
            </canvas>
          </div>
          <div class="chart-card">
            <h3>Bewegingslede vs Nie-Lede</h3>
            <p class="chart-subtitle">Blokke gekoop</p>
            <canvas baseChart
              [data]="bewegingChartData"
              [options]="donutChartOptions"
              [type]="'pie'">
            </canvas>
          </div>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h3>Kopers</h3>
            <div class="table-actions pdf-hide">
              <input type="text" [(ngModel)]="search" (input)="applyFilters()" placeholder="Soek naam of e-pos...">
              <button class="btn btn-outline btn-sm" (click)="downloadCsv()">Laai af as CSV</button>
            </div>
          </div>
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
                  <th (click)="sortBy('phoneNumber')" [class.sorted]="sortKey === 'phoneNumber'">
                    Foonnommer <span class="sort-icon">{{ sortIcon('phoneNumber') }}</span>
                  </th>
                  <th (click)="sortBy('isOraniaResident')" [class.sorted]="sortKey === 'isOraniaResident'">
                    Inwoner <span class="sort-icon">{{ sortIcon('isOraniaResident') }}</span>
                  </th>
                  <th (click)="sortBy('isOraniaBewegingMember')" [class.sorted]="sortKey === 'isOraniaBewegingMember'">
                    Bewegingslid <span class="sort-icon">{{ sortIcon('isOraniaBewegingMember') }}</span>
                  </th>
                  <th (click)="sortBy('squares')" class="numeric" [class.sorted]="sortKey === 'squares'">
                    Blokke <span class="sort-icon">{{ sortIcon('squares') }}</span>
                  </th>
                  <th (click)="sortBy('totalSpent')" class="numeric" [class.sorted]="sortKey === 'totalSpent'">
                    Totaal Bestee <span class="sort-icon">{{ sortIcon('totalSpent') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (b of filteredBuyers; track b.userId) {
                  <tr>
                    <td>{{ b.name }}</td>
                    <td>{{ b.email }}</td>
                    <td>{{ b.phoneDisplay || b.phoneNumber || '-' }}</td>
                    <td>{{ b.isOraniaResident ? 'Ja' : 'Nee' }}</td>
                    <td>{{ b.isOraniaBewegingMember ? 'Ja' : 'Nee' }}</td>
                    <td class="numeric">{{ b.squares }}</td>
                    <td class="numeric">R{{ b.totalSpent | number:'1.0-0' }}</td>
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
            <div class="table-actions pdf-hide">
              <input type="text" [(ngModel)]="nonPurchaserSearch" (input)="applyNonPurchaserFilters()" placeholder="Soek naam of e-pos...">
              <button class="btn btn-outline btn-sm" (click)="downloadNonPurchaserCsv()">Laai af as CSV</button>
            </div>
          </div>
          @if (nonPurchaserError) {
            <p class="error-msg">{{ nonPurchaserError }}</p>
          }
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>E-pos</th>
                  <th>Foonnommer</th>
                  <th>Inwoner</th>
                  <th>Bewegingslid</th>
                </tr>
              </thead>
              <tbody>
                @for (u of filteredNonPurchasers; track u.id) {
                  <tr>
                    <td>{{ u.name }}</td>
                    <td>{{ u.email }}</td>
                    <td>{{ u.phoneDisplay || u.phoneNumber || '-' }}</td>
                    <td>{{ u.isOraniaResident ? 'Ja' : 'Nee' }}</td>
                    <td>{{ u.isOraniaBewegingMember ? 'Ja' : 'Nee' }}</td>
                  </tr>
                }
                @if (filteredNonPurchasers.length === 0 && !nonPurchaserError) {
                  <tr>
                    <td colspan="5" class="empty">Geen geregistreerde gebruikers sonder aankoop nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-content { }
    .export-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .export-bar .error-msg { margin-bottom: 0; flex: 1 1 100%; }
    .stats-export.exporting .pdf-hide { display: none !important; }
    .stats-export.exporting .table-scroll { overflow: visible; }
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

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr));
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
    .stat-card.wide {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
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
    .stat-label small {
      text-transform: none;
      letter-spacing: 0;
      font-weight: 400;
    }
    .stat-sub {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin-top: 0.375rem;
    }
    .mini-progress {
      width: 100%;
      height: 6px;
      background: var(--color-cream);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .mini-progress-fill {
      height: 100%;
      background: var(--color-olive);
      transition: width 0.4s ease;
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

    .charts-timeseries {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
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
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .chart-card h3,
    .chart-header h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      color: var(--color-text);
      margin: 0;
    }
    .chart-subtitle {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin: 0.25rem 0 0.75rem;
    }
    .chart-toggle {
      display: flex;
      gap: 0.25rem;
    }
    .toggle-btn {
      padding: 0.25rem 0.625rem;
      font-size: 0.6875rem;
      font-family: var(--font-heading);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-cream);
      color: var(--color-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .toggle-btn.active {
      background: var(--color-terracotta);
      border-color: var(--color-terracotta);
      color: #fff;
    }
    .toggle-btn:hover:not(.active) {
      border-color: var(--color-terracotta);
      color: var(--color-text);
    }

    .table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem;
      box-shadow: var(--shadow-sm);
      margin-bottom: 1.5rem;
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
    .sort-icon {
      font-size: 0.625rem;
      margin-left: 0.125rem;
      opacity: 0.4;
    }
    th.sorted .sort-icon { opacity: 1; color: var(--color-terracotta); }
    td { color: var(--color-muted); }
    .numeric { text-align: right; }
    .empty {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-muted);
    }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }

    @media (max-width: 992px) {
      .table-actions { width: 100%; }
      .table-actions input { flex: 1; }
    }
  `]
})
export class AdminStatsComponent implements OnInit {
  private admin = inject(AdminService);

  @ViewChild('statsExport') statsExport!: ElementRef<HTMLElement>;

  stats: Stats = {
    totalSquares: 4200,
    soldSquares: 0,
    totalRaised: 0,
    sponsorBaseline: 2_000_000,
    perStatus: [],
    dailySales: [],
    oraniaSquares: 0,
    outsiderSquares: 0,
    bewegingSquares: 0,
    nonBewegingSquares: 0
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
  loadError = '';
  nonPurchaserError = '';
  exportingPdf = false;
  pdfError = '';

  dailyChartMode: DailyChartMode = 'daily';
  squaresChartMode: DailyChartMode = 'daily';

  dailyChartData: any;
  squaresChartData: any;
  statusChartData: any;
  oraniaChartData: any;
  bewegingChartData: any;

  lineChartOptions: any = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 30 } },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Rand (R)', font: { size: 11 } }
      }
    }
  };

  squaresChartOptions: any = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 30 } },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Blokke', font: { size: 11 } }
      }
    }
  };

  donutChartOptions: any = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
    }
  };

  private pendingRequests = 3;

  get revenuePercent(): number {
    const pct = this.stats.sponsorBaseline > 0
      ? (this.stats.totalRaised / this.stats.sponsorBaseline) * 100
      : 0;
    return Math.min(100, Math.max(0, pct));
  }

  get salesPercent(): number {
    if (this.stats.totalSquares <= 0) return 0;
    return Math.min(100, Math.max(0, (this.stats.soldSquares / this.stats.totalSquares) * 100));
  }

  get availableSquares(): number {
    return Math.max(0, this.stats.totalSquares - this.stats.soldSquares);
  }

  get conversionRate(): number {
    const total = this.buyers.length + this.nonPurchasers.length;
    if (total === 0) return 0;
    return (this.buyers.length / total) * 100;
  }

  get projectedCompletionLabel(): string {
    const remaining = this.availableSquares;
    if (remaining <= 0) return 'Uitverkoop';

    const sales = this.stats.dailySales;
    if (sales.length === 0) return 'Nog onbekend';

    const totalSquaresSold = sales.reduce((sum, d) => sum + d.squares, 0);
    const avgPerDay = totalSquaresSold / sales.length;

    if (avgPerDay <= 0) return 'Nog onbekend';

    const daysRemaining = Math.ceil(remaining / avgPerDay);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);

    return `~${daysRemaining} dae (${targetDate.toLocaleDateString('af-ZA')})`;
  }

  ngOnInit() {
    this.admin.getStats().subscribe({
      next: (s) => {
        this.stats = s;
        this.buildCharts();
        this.finishRequest();
      },
      error: () => {
        this.loadError = 'Kon nie statistieke laai nie.';
        this.finishRequest();
      }
    });

    this.admin.getPurchases().subscribe({
      next: (b) => {
        this.buyers = b;
        this.applyFilters();
        this.finishRequest();
      },
      error: () => {
        this.loadError = 'Kon nie kopers laai nie.';
        this.finishRequest();
      }
    });

    this.admin.getRegisteredNoPurchase().subscribe({
      next: (users) => {
        this.nonPurchasers = users;
        this.applyNonPurchaserFilters();
        this.finishRequest();
      },
      error: () => {
        this.nonPurchaserError = 'Kon nie geregistreerde gebruikers sonder aankoop laai nie.';
        this.finishRequest();
      }
    });
  }

  private finishRequest() {
    this.pendingRequests--;
    if (this.pendingRequests <= 0) {
      this.loading = false;
    }
  }

  setDailyChartMode(mode: DailyChartMode) {
    this.dailyChartMode = mode;
    this.buildDailyChart();
  }

  setSquaresChartMode(mode: DailyChartMode) {
    this.squaresChartMode = mode;
    this.buildSquaresChart();
  }

  sortIcon(key: keyof Buyer): string {
    if (this.sortKey !== key) return '⇅';
    return this.sortDesc ? '▼' : '▲';
  }

  async downloadPdf() {
    if (this.exportingPdf || !this.statsExport) return;

    this.exportingPdf = true;
    this.pdfError = '';

    const element = this.statsExport.nativeElement;
    element.classList.add('exporting');

    try {
      await document.fonts.ready;
      await new Promise<void>(resolve => setTimeout(resolve, 150));

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const pageCanvasHeight = Math.floor((contentHeight * canvas.width) / contentWidth);

      let renderedHeight = 0;
      let page = 0;

      while (renderedHeight < canvas.height) {
        if (page > 0) pdf.addPage();

        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');

        ctx.drawImage(
          canvas,
          0, renderedHeight, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight
        );

        const sliceImgHeight = (sliceHeight * contentWidth) / canvas.width;
        pdf.addImage(
          pageCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          contentWidth,
          sliceImgHeight
        );

        renderedHeight += sliceHeight;
        page++;
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`diamant-laan-statistieke-${date}.pdf`);
    } catch {
      this.pdfError = 'Kon nie PDF genereer nie. Probeer asseblief weer.';
    } finally {
      element.classList.remove('exporting');
      this.exportingPdf = false;
    }
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
    const headers = ['Naam', 'E-pos', 'Foonnommer', 'Inwoner van Orania', 'Bewegingslid', 'Blokke', 'Totaal Bestee'];
    const rows = this.filteredBuyers.map(b => [
      b.name,
      b.email,
      b.phoneDisplay || b.phoneNumber || '',
      b.isOraniaResident ? 'Ja' : 'Nee',
      b.isOraniaBewegingMember ? 'Ja' : 'Nee',
      b.squares.toString(),
      b.totalSpent.toString()
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
    const headers = ['Naam', 'E-pos', 'Foonnommer', 'Inwoner van Orania', 'Bewegingslid'];
    const rows = this.filteredNonPurchasers.map(u => [
      u.name,
      u.email,
      u.phoneDisplay || u.phoneNumber || '',
      u.isOraniaResident ? 'Ja' : 'Nee',
      u.isOraniaBewegingMember ? 'Ja' : 'Nee'
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
    this.buildDailyChart();
    this.buildSquaresChart();
    this.buildStatusChart();
    this.buildOraniaChart();
    this.buildBewegingChart();
  }

  private buildDailyChart() {
    const dailyLabels = this.stats.dailySales.map(d => new Date(d.date).toLocaleDateString('af-ZA'));
    const dailyAmounts = this.stats.dailySales.map(d => d.amount);

    let revenueData: number[];
    if (this.dailyChartMode === 'cumulative') {
      let running = 0;
      revenueData = dailyAmounts.map(a => { running += a; return running; });
    } else {
      revenueData = dailyAmounts;
    }

    this.dailyChartData = {
      labels: dailyLabels,
      datasets: [{
        label: this.dailyChartMode === 'cumulative' ? 'Kumulatiewe Verkope (R)' : 'Verkope (R)',
        data: revenueData,
        borderColor: '#C67B5C',
        backgroundColor: 'rgba(198, 123, 92, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    };
  }

  private buildSquaresChart() {
    const dailyLabels = this.stats.dailySales.map(d => new Date(d.date).toLocaleDateString('af-ZA'));
    const dailySquares = this.stats.dailySales.map(d => d.squares);

    let squaresData: number[];
    if (this.squaresChartMode === 'cumulative') {
      let running = 0;
      squaresData = dailySquares.map(s => { running += s; return running; });
    } else {
      squaresData = dailySquares;
    }

    this.squaresChartData = {
      labels: dailyLabels,
      datasets: [{
        label: this.squaresChartMode === 'cumulative' ? 'Kumulatiewe Blokke' : 'Blokke Verkoop',
        data: squaresData,
        borderColor: '#6B7B3C',
        backgroundColor: 'rgba(107, 123, 60, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    };
  }

  private buildStatusChart() {
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
  }

  private buildOraniaChart() {
    this.oraniaChartData = {
      labels: ['Inwoners', 'Uitwoners'],
      datasets: [{
        data: [this.stats.oraniaSquares, this.stats.outsiderSquares],
        backgroundColor: ['#B5651D', '#C67B5C'],
        borderWidth: 1
      }]
    };
  }

  private buildBewegingChart() {
    this.bewegingChartData = {
      labels: ['Bewegingslede', 'Nie-Lede'],
      datasets: [{
        data: [this.stats.bewegingSquares, this.stats.nonBewegingSquares],
        backgroundColor: ['#5C7A29', '#8FA65A'],
        borderWidth: 1
      }]
    };
  }
}
