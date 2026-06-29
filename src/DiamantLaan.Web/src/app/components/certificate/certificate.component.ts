import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService } from '../../services/purchase.service';
import { getSquareCentroid } from '../shared/road-map/coordinate-config';

const SHORT_VERSION_THRESHOLD = 10;

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div class="cert-page">
        <div #certCard class="cert-card">
          <div class="demo-watermark">DEMO</div>
          <h1>Eiendomssertifikaat</h1>
          <p class="subtitle">Diamant Laan Teerprojek</p>

          @if (ownerName) {
            <p class="owner">Hierby word bevestig dat</p>
            <p class="owner-name">{{ ownerName }}</p>
            <p class="owner">die volgende blokke op Diamant Laan geborg het:</p>

            <ul class="block-list">
              @for (sq of squares; track sq.id) {
                <li>
                  <strong>Blok #{{ sq.id }}</strong>
                  @if (getCoords(sq.id); as coords) {
                    <span class="coords">— {{ coords.lat | number:'1.4-4' }}°, {{ coords.lng | number:'1.4-4' }}°</span>
                  }
                </li>
              }
            </ul>

            <p class="disclaimer">Hierdie is 'n demonstrasiesertifikaat. Die finale ontwerp volg later.</p>
          } @else {
            <p class="empty">Geen blokke gevind nie.</p>
          }
        </div>

        <div #certCardShort class="cert-card cert-card--export" aria-hidden="true">
          <div class="demo-watermark">DEMO</div>
          <h1>Eiendomssertifikaat</h1>
          <p class="subtitle">Diamant Laan Teerprojek</p>

          @if (ownerName) {
            <p class="owner">Hierby word bevestig dat</p>
            <p class="owner-name">{{ ownerName }}</p>
            <p class="owner">die volgende bydrae op Diamant Laan gelewer het:</p>

            <dl class="summary-stats">
              <div>
                <dt>Totaal bestee</dt>
                <dd>R{{ totalSpent | number:'1.0-0' }}</dd>
              </div>
              <div>
                <dt>Blokke geborg</dt>
                <dd>{{ blockCount | number:'1.0-0' }}</dd>
              </div>
            </dl>

            <p class="disclaimer">Hierdie is 'n demonstrasiesertifikaat. Die finale ontwerp volg later.</p>
          }
        </div>

        <div class="actions">
          <a routerLink="/my-blokke" class="btn btn-outline">Terug na My Blokke</a>
          @if (squares.length > 0) {
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="downloading"
              (click)="onDownloadClick()">
              {{ downloading ? 'Besig om PDF te genereer...' : 'Laai PDF af' }}
            </button>
          }
        </div>

        @if (downloadError) {
          <p class="download-error">{{ downloadError }}</p>
        }
      </div>
    </div>

    @if (showVersionPrompt) {
      <div class="prompt-backdrop" (click)="closeVersionPrompt()">
        <div class="prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="version-prompt-title" (click)="$event.stopPropagation()">
          <h3 id="version-prompt-title">Korter sertifikaat?</h3>
          <p>
            Dit lyk of jou sertifikaat baie lank gaan wees. Sal jy 'n korter weergawe verkies?
          </p>
          <p class="prompt-hint">
            Die korter weergawe wys net jou totaal bestee en aantal blokke — nie elke blok afsonderlik nie.
          </p>
          <div class="prompt-actions">
            <button type="button" class="btn btn-primary" (click)="downloadPdf('short')">Ja, korter weergawe</button>
            <button type="button" class="btn btn-outline" (click)="downloadPdf('full')">Nee, volledige sertifikaat</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; max-width: 800px; }
    .cert-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .cert-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface);
      border: 3px double var(--color-border);
      border-radius: var(--radius);
      padding: 3rem 2.5rem;
      box-shadow: var(--shadow-lg);
      text-align: center;
    }
    .cert-card--export {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 800px;
      box-shadow: none;
    }
    .demo-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-family: var(--font-heading);
      font-size: 5rem;
      font-weight: 700;
      color: rgba(198, 123, 92, 0.12);
      pointer-events: none;
      user-select: none;
    }
    h1 {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      color: var(--color-text);
      margin-bottom: 0.25rem;
    }
    .subtitle {
      color: var(--color-muted);
      font-size: 0.9375rem;
      margin-bottom: 2rem;
    }
    .owner { color: var(--color-muted); font-size: 0.9375rem; }
    .owner-name {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-terracotta);
      margin: 0.5rem 0 1.5rem;
    }
    .block-list {
      list-style: none;
      text-align: left;
      max-width: 420px;
      margin: 0 auto 1.5rem;
      padding: 0;
    }
    .block-list li {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      max-width: 420px;
      margin: 0 auto 1.5rem;
      text-align: center;
    }
    .summary-stats div {
      padding: 1.25rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-cream);
    }
    .summary-stats dt {
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin-bottom: 0.35rem;
    }
    .summary-stats dd {
      font-family: var(--font-heading);
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-terracotta);
    }
    .coords {
      font-family: monospace;
      color: var(--color-muted);
      font-size: 0.8125rem;
    }
    .disclaimer {
      font-size: 0.75rem;
      color: var(--color-muted-light);
      font-style: italic;
    }
    .empty { color: var(--color-muted); }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .download-error {
      text-align: center;
      color: var(--color-warning);
      font-size: 0.875rem;
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
  `]
})
export class CertificateComponent implements OnInit {
  @ViewChild('certCard') certCard!: ElementRef<HTMLElement>;
  @ViewChild('certCardShort') certCardShort!: ElementRef<HTMLElement>;

  private auth = inject(AuthService);
  private purchase = inject(PurchaseService);

  ownerName = '';
  squares: { id: number; status: number }[] = [];
  blockCount = 0;
  totalSpent = 0;
  downloading = false;
  downloadError = '';
  showVersionPrompt = false;

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.ownerName = `${user.firstName} ${user.lastName}`.trim();
    }
    this.purchase.getMySquares().subscribe(s => {
      this.squares = s.sort((a, b) => a.id - b.id);
      this.blockCount = this.squares.length;
    });
    this.purchase.getMySummary().subscribe({
      next: summary => {
        this.blockCount = summary.blockCount;
        this.totalSpent = summary.totalSpent;
      },
      error: () => {
        this.totalSpent = this.blockCount * 500;
      }
    });
  }

  getCoords(id: number) {
    return getSquareCentroid(id);
  }

  onDownloadClick() {
    if (this.downloading) return;

    if (this.squares.length > SHORT_VERSION_THRESHOLD) {
      this.showVersionPrompt = true;
      return;
    }

    void this.downloadPdf('full');
  }

  closeVersionPrompt() {
    if (!this.downloading) {
      this.showVersionPrompt = false;
    }
  }

  async downloadPdf(version: 'full' | 'short') {
    if (this.downloading) return;

    this.showVersionPrompt = false;
    this.downloading = true;
    this.downloadError = '';

    try {
      await document.fonts.ready;

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const element = version === 'short'
        ? this.certCardShort.nativeElement
        : this.certCard.nativeElement;

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
      pdf.save(`sertifikaat-${this.sanitizeFilename(this.ownerName)}${suffix}.pdf`);
    } catch {
      this.downloadError = 'Kon nie PDF genereer nie. Probeer asseblief weer.';
    } finally {
      this.downloading = false;
    }
  }

  private sanitizeFilename(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'sertifikaat';
  }
}
