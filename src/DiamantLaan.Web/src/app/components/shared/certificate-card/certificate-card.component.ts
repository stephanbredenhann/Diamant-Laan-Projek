import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';

/**
 * The certificate artwork is the client's Canva design, exported to `sertifikaat-agtergrond.png`
 * with the two fill-in fields stripped out. We re-render those fields as live text on top of the
 * plate, so the geometry below has to stay in step with the artwork: the numbers are lifted
 * straight from the Canva document, whose page is 794×1123 (A4 at 96dpi). If the plate is ever
 * re-exported, re-check these against the new document rather than nudging them by eye.
 */
const SHEET_W = 794;
const SHEET_H = 1123;

const NAME_BOX = { left: 116.7551, top: 477.4423, width: 560.1905, height: 79.6667, fontSize: 66.6667 };
const BODY_BOX = { left: 146.3550, top: 574.7090, width: 500.9908, height: 82.0852, fontSize: 21.3334 };

/**
 * The date row is drawn into the artwork as an orange rule (x 311.6→467.2 at y 968.4) with two
 * slashes over it, centred near x 365 and x 416. These three boxes are the gaps between them, so
 * the day/month/year sit on the rule the way they would if someone had written them in.
 */
const DATE_ROW = { top: 947, height: 20, fontSize: 14 };
const DATE_DAY = { left: 311.5664, width: 48 };
const DATE_MONTH = { left: 370, width: 41 };
const DATE_YEAR = { left: 421, width: 46 };

/** Smallest the name may shrink to before we let it wrap onto a second line instead. */
const MIN_NAME_FIT = 0.42;

/**
 * Shrinking to exactly the box width still wraps, because layout rounds up where measureText
 * does not. Leaving a sliver spare keeps the name on one line, sitting on the orange rule.
 */
const NAME_FIT_SAFETY = 0.98;

/** High enough that the artwork's hard orange edges stay clean, low enough to keep pages small. */
const PDF_JPEG_QUALITY = 0.92;

const pctW = (v: number) => `${(v / SHEET_W) * 100}%`;
const pctH = (v: number) => `${(v / SHEET_H) * 100}%`;

const dateSlotStyle = (slot: { left: number; width: number }) => ({
  left: pctW(slot.left),
  top: pctH(DATE_ROW.top),
  width: pctW(slot.width),
  height: pctH(DATE_ROW.height),
});

export interface CertificateSquare {
  id: number;
  status?: number;
  /** ISO timestamp from the API. Absent for older purchases, which simply leave the row blank. */
  purchaseDate?: string;
}

/**
 * Renders the sponsorship certificate and handles the PDF export. Used both by the signed-in
 * certificate page and by the guest flow after a checkout that skipped signing up, so it takes
 * everything it needs as inputs rather than reading the session.
 *
 * The design carries a single "blok no. ____" slot, so a buyer holding several blocks gets one
 * certificate page per block rather than a list crammed into one.
 */
@Component({
  selector: 'app-certificate-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cert-page">
      <div class="cert-sheet" #previewSheet>
        <img class="cert-bg" src="sertifikaat-agtergrond.png" alt="" #bgImage />
        @if (ownerName) {
          <div class="cert-name" [class.cert-name--wrap]="nameWraps"
               [style.left]="nameStyle.left" [style.top]="nameStyle.top"
               [style.width]="nameStyle.width" [style.height]="nameStyle.height">{{ ownerName }}</div>
          <div class="cert-body" [style.left]="bodyStyle.left" [style.top]="bodyStyle.top"
               [style.width]="bodyStyle.width">{{ bodyTextFor(previewSquare?.id) }}</div>
          @if (dateParts(previewSquare); as d) {
            <div class="cert-date" [style.left]="dayStyle.left" [style.top]="dayStyle.top"
                 [style.width]="dayStyle.width" [style.height]="dayStyle.height">{{ d.day }}</div>
            <div class="cert-date" [style.left]="monthStyle.left" [style.top]="monthStyle.top"
                 [style.width]="monthStyle.width" [style.height]="monthStyle.height">{{ d.month }}</div>
            <div class="cert-date" [style.left]="yearStyle.left" [style.top]="yearStyle.top"
                 [style.width]="yearStyle.width" [style.height]="yearStyle.height">{{ d.year }}</div>
          }
        }
      </div>

      @if (squares.length > 1) {
        <div class="sheet-nav">
          <button type="button" class="nav-btn" [disabled]="previewIndex === 0"
                  (click)="stepPreview(-1)" aria-label="Vorige sertifikaat">‹</button>
          <span class="nav-label">Blok {{ previewSquare?.id }} — {{ previewIndex + 1 }} van {{ squares.length }}</span>
          <button type="button" class="nav-btn" [disabled]="previewIndex === squares.length - 1"
                  (click)="stepPreview(1)" aria-label="Volgende sertifikaat">›</button>
        </div>
      }

      <div class="actions">
        <ng-content></ng-content>
        @if (squares.length > 0) {
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="downloading"
            (click)="downloadPdf()">
            {{ downloading ? downloadProgress : downloadLabel }}
          </button>
        }
      </div>

      @if (squares.length === 0) {
        <p class="empty">Geen blokke gevind nie.</p>
      }

      @if (downloadError) {
        <p class="download-error">{{ downloadError }}</p>
      }
    </div>

    <!-- Rendered at the artwork's native 794px so html2canvas captures exact design geometry. -->
    <div class="cert-sheet cert-sheet--export" #exportSheet aria-hidden="true">
      <img class="cert-bg" src="sertifikaat-agtergrond.png" alt="" #exportBgImage />
      <div class="cert-name" [class.cert-name--wrap]="nameWraps"
           [style.left]="nameStyle.left" [style.top]="nameStyle.top"
           [style.width]="nameStyle.width" [style.height]="nameStyle.height">{{ ownerName }}</div>
      <div class="cert-body" [style.left]="bodyStyle.left" [style.top]="bodyStyle.top"
           [style.width]="bodyStyle.width">{{ bodyTextFor(exportSquare?.id) }}</div>
      @if (dateParts(exportSquare); as d) {
        <div class="cert-date" [style.left]="dayStyle.left" [style.top]="dayStyle.top"
             [style.width]="dayStyle.width" [style.height]="dayStyle.height">{{ d.day }}</div>
        <div class="cert-date" [style.left]="monthStyle.left" [style.top]="monthStyle.top"
             [style.width]="monthStyle.width" [style.height]="monthStyle.height">{{ d.month }}</div>
        <div class="cert-date" [style.left]="yearStyle.left" [style.top]="yearStyle.top"
             [style.width]="yearStyle.width" [style.height]="yearStyle.height">{{ d.year }}</div>
      }
    </div>
  `,
  styles: [`
    :host { --name-fit: 1; }
    .cert-page { display: flex; flex-direction: column; gap: 1.25rem; }

    .cert-sheet {
      position: relative;
      width: 100%;
      aspect-ratio: 794 / 1123;
      background: #fff;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    .cert-sheet--export {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 794px;
      height: 1123px;
      aspect-ratio: auto;
      --sheet-w: 794px;
      box-shadow: none;
    }
    .cert-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }

    .cert-name, .cert-body, .cert-date {
      position: absolute;
      color: #000;
      font-family: 'Open Sans', 'Noto Sans', 'Segoe UI', sans-serif;
      font-weight: 400;
      text-align: center;
    }
    .cert-date {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      font-size: calc(var(--sheet-w, 100%) * 0.0176322);
      line-height: 1.1;
      white-space: nowrap;
    }
    .cert-name {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      font-size: calc(var(--sheet-w, 100%) * 0.0839632 * var(--name-fit));
      line-height: 1.15;
      white-space: nowrap;
    }
    .cert-name--wrap {
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .cert-body {
      font-size: calc(var(--sheet-w, 100%) * 0.0268682);
      line-height: 1.4;
    }

    .sheet-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }
    .nav-label { font-size: 0.875rem; color: var(--color-muted); }
    .nav-btn {
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--color-border);
      border-radius: 50%;
      background: var(--color-surface);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
    }
    .nav-btn:disabled { opacity: 0.4; cursor: default; }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .empty { text-align: center; color: var(--color-muted); }
    .download-error {
      text-align: center;
      color: var(--color-warning);
      font-size: 0.875rem;
    }
  `]
})
export class CertificateCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('previewSheet') previewSheet!: ElementRef<HTMLElement>;
  @ViewChild('exportSheet') exportSheet!: ElementRef<HTMLElement>;
  @ViewChild('bgImage') bgImage!: ElementRef<HTMLImageElement>;
  @ViewChild('exportBgImage') exportBgImage!: ElementRef<HTMLImageElement>;

  private cdr = inject(ChangeDetectorRef);
  private host = inject(ElementRef<HTMLElement>);
  private resizeObserver?: ResizeObserver;

  @Input() ownerName = '';
  /** `purchaseDate` is the ISO date the block was bought; without it the date row stays blank. */
  @Input() squares: CertificateSquare[] = [];

  downloading = false;
  downloadError = '';
  downloadProgress = '';
  previewIndex = 0;
  exportSquare?: CertificateSquare;
  nameWraps = false;

  readonly nameStyle = {
    left: pctW(NAME_BOX.left),
    top: pctH(NAME_BOX.top),
    width: pctW(NAME_BOX.width),
    height: pctH(NAME_BOX.height),
  };

  readonly bodyStyle = {
    left: pctW(BODY_BOX.left),
    top: pctH(BODY_BOX.top),
    width: pctW(BODY_BOX.width),
  };

  readonly dayStyle = dateSlotStyle(DATE_DAY);
  readonly monthStyle = dateSlotStyle(DATE_MONTH);
  readonly yearStyle = dateSlotStyle(DATE_YEAR);

  get previewSquare(): CertificateSquare | undefined {
    return this.squares[this.previewIndex];
  }

  get downloadLabel(): string {
    return this.squares.length > 1
      ? `Laai ${this.squares.length} sertifikate af (PDF)`
      : 'Laai PDF af';
  }

  ngAfterViewInit() {
    // The overlay text scales off the sheet's rendered width; the export sheet is a fixed 794px
    // and sets --sheet-w in CSS, so only the responsive preview needs watching.
    this.resizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        this.previewSheet.nativeElement.style.setProperty('--sheet-w', `${width}px`);
      }
    });
    this.resizeObserver.observe(this.previewSheet.nativeElement);
    void this.fitName();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Both callers fill these in asynchronously, so re-fit rather than trusting the first render.
    if (changes['ownerName'] && !changes['ownerName'].firstChange) {
      void this.fitName();
    }
    if (changes['squares']) {
      this.previewIndex = 0;
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  stepPreview(delta: number) {
    const next = this.previewIndex + delta;
    if (next >= 0 && next < this.squares.length) {
      this.previewIndex = next;
    }
  }

  bodyTextFor(blockId?: number): string {
    return `blok no. ${blockId ?? ''} aangekoop het ter ondersteuning van die teer van die Oewerpad in Orania.`;
  }

  /**
   * Split the purchase date into the artwork's three slots. The server records the date in UTC, so
   * read the calendar fields straight off the ISO string: converting through a local `Date` would
   * shift a late-evening purchase onto the wrong day for anyone east of UTC, ourselves included.
   */
  dateParts(square?: CertificateSquare): { day: string; month: string; year: string } | null {
    const iso = square?.purchaseDate;
    if (!iso) return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!match) return null;

    return { day: match[3], month: match[2], year: match[1] };
  }

  /**
   * Long names overflow the design's name box, so measure the rendered width and shrink to fit.
   * The ratio is resolution-independent, which is why it can be measured once against the
   * artwork's native width and then applied to both sheets.
   */
  private async fitName(): Promise<void> {
    if (!this.ownerName) return;

    await document.fonts.ready;

    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;

    ctx.font = `400 ${NAME_BOX.fontSize}px 'Open Sans', 'Noto Sans', 'Segoe UI', sans-serif`;
    const measured = ctx.measureText(this.ownerName).width;
    const required = NAME_BOX.width / measured;

    let fit: number;
    if (required >= 1) {
      fit = 1;
      this.nameWraps = false;
    } else if (required * NAME_FIT_SAFETY >= MIN_NAME_FIT) {
      fit = required * NAME_FIT_SAFETY;
      this.nameWraps = false;
    } else {
      // Beyond this the name would be too small to read, so let it run onto a second line.
      fit = MIN_NAME_FIT;
      this.nameWraps = true;
    }

    this.host.nativeElement.style.setProperty('--name-fit', `${fit}`);
    this.cdr.detectChanges();
  }

  async downloadPdf() {
    if (this.downloading || this.squares.length === 0) return;

    this.downloading = true;
    this.downloadError = '';
    this.downloadProgress = 'Besig om PDF te genereer...';

    try {
      await document.fonts.ready;
      await this.fitName();
      await this.decodeBackgrounds();

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      // A4 portrait in mm; the artwork is full-bleed so each page is drawn edge to edge.
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (const [index, square] of this.squares.entries()) {
        if (this.squares.length > 1) {
          this.downloadProgress = `Blok ${index + 1} van ${this.squares.length}...`;
        }

        this.exportSquare = square;
        this.cdr.detectChanges();
        await new Promise(requestAnimationFrame);

        // scale 2 against the 794px sheet lands on 1588px — the plate's native resolution.
        const canvas = await html2canvas(this.exportSheet.nativeElement, {
          scale: 2,
          width: SHEET_W,
          height: SHEET_H,
          backgroundColor: '#ffffff',
        });

        if (index > 0) pdf.addPage();
        // JPEG, not PNG: the canvas PNG encoder barely compresses the artwork and lands about
        // 10MB a page, which is a punishing download for someone holding a dozen blocks. At this
        // quality the difference is invisible on the artwork but the page drops to roughly 300KB.
        pdf.addImage(canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY), 'JPEG', 0, 0, pageW, pageH);
      }

      pdf.save(`sertifikaat-${this.sanitizeFilename(this.ownerName)}.pdf`);
    } catch {
      this.downloadError = 'Kon nie PDF genereer nie. Probeer asseblief weer.';
    } finally {
      this.downloading = false;
      this.downloadProgress = '';
    }
  }

  /** html2canvas paints whatever the image currently holds, so make sure the plate is decoded. */
  private async decodeBackgrounds(): Promise<void> {
    const images = [this.bgImage?.nativeElement, this.exportBgImage?.nativeElement].filter(Boolean);
    await Promise.all(images.map(img => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
  }

  private sanitizeFilename(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'sertifikaat';
  }
}
