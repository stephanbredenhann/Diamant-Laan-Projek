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
import { blokLabel } from '../../../utils/afrikaans.util';

/**
 * The certificate artwork is the client's Canva design, exported to `sertifikaat-agtergrond.png`
 * with the fill-in fields stripped out. We re-render those fields as live text on top of the
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
const DATE_ROW = { top: 947, height: 20 };
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

/**
 * A summary listing many blocks runs longer than the design's sentence, so the body is allowed to
 * shrink. The ceiling is the gap between the body's top edge and the signature row at y 717,
 * less a little breathing room, so a long list can never collide with the signatures.
 */
const MAX_BODY_HEIGHT = 130;
const MIN_BODY_FIT = 0.55;
const BODY_LINE_HEIGHT = 1.4;

/** Runs this short read better spelled out ("5, 6, 7") than collapsed into a range ("5-7"). */
const MAX_RUN_AS_LIST = 3;

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

/** What a single sheet shows. Both the per-block and the summary certificate reduce to this. */
interface SheetView {
  blocks: string;
  count: number;
  date?: string;
}

/**
 * Collapse block numbers into the shortest sensible reading: runs of four or more become a range,
 * anything shorter is spelled out, and separate runs are listed together.
 * `[1,2,3,7,8,9,10,15]` reads as `1, 2, 3, 7-10, 15`.
 */
export function formatBlockRanges(ids: number[]): string {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const runs: number[][] = [];
  let run: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      run.push(sorted[i]);
    } else {
      runs.push(run);
      run = [sorted[i]];
    }
  }
  runs.push(run);

  return runs
    .map(r => (r.length <= MAX_RUN_AS_LIST ? r.join(', ') : `${r[0]}-${r[r.length - 1]}`))
    .join(', ');
}

/**
 * Renders the sponsorship certificate and handles the PDF export. Used both by the signed-in
 * certificate page and by the guest flow after a checkout that skipped signing up, so it takes
 * everything it needs as inputs rather than reading the session.
 *
 * A buyer holding several blocks can either page through one certificate per block and take just
 * the one they are looking at, or take a single summary certificate covering every block. The
 * download always produces whichever sheet is on screen.
 */
@Component({
  selector: 'app-certificate-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cert-page">
      @if (squares.length > 1) {
        <div class="view-toggle" role="group" aria-label="Kies sertifikaat weergawe">
          <button type="button" class="toggle-btn" [class.is-active]="mode === 'summary'"
                  [attr.aria-pressed]="mode === 'summary'" (click)="mode = 'summary'">Opsomming</button>
          <button type="button" class="toggle-btn" [class.is-active]="mode === 'block'"
                  [attr.aria-pressed]="mode === 'block'" (click)="mode = 'block'">Individuele blokke</button>
        </div>
      }

      <div class="cert-sheet" #previewSheet>
        <img class="cert-bg" src="sertifikaat-agtergrond.png" alt="" #bgImage />
        @if (ownerName && previewView; as view) {
          <div class="cert-name" [class.cert-name--wrap]="nameWraps"
               [style.left]="nameStyle.left" [style.top]="nameStyle.top"
               [style.width]="nameStyle.width" [style.height]="nameStyle.height">{{ ownerName }}</div>
          <div class="cert-body" [style.left]="bodyStyle.left" [style.top]="bodyStyle.top"
               [style.width]="bodyStyle.width" [style.fontSize]="bodyFontSize(view)">{{ bodyText(view) }}</div>
          @if (dateParts(view); as d) {
            <div class="cert-date" [style.left]="dayStyle.left" [style.top]="dayStyle.top"
                 [style.width]="dayStyle.width" [style.height]="dayStyle.height">{{ d.day }}</div>
            <div class="cert-date" [style.left]="monthStyle.left" [style.top]="monthStyle.top"
                 [style.width]="monthStyle.width" [style.height]="monthStyle.height">{{ d.month }}</div>
            <div class="cert-date" [style.left]="yearStyle.left" [style.top]="yearStyle.top"
                 [style.width]="yearStyle.width" [style.height]="yearStyle.height">{{ d.year }}</div>
          }
        }
      </div>

      @if (mode === 'block' && squares.length > 1) {
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
            {{ downloading ? 'Besig om PDF te genereer...' : downloadLabel }}
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
      @if (exportView; as view) {
        <div class="cert-name" [class.cert-name--wrap]="nameWraps"
             [style.left]="nameStyle.left" [style.top]="nameStyle.top"
             [style.width]="nameStyle.width" [style.height]="nameStyle.height">{{ ownerName }}</div>
        <div class="cert-body" [style.left]="bodyStyle.left" [style.top]="bodyStyle.top"
             [style.width]="bodyStyle.width" [style.fontSize]="bodyFontSize(view)">{{ bodyText(view) }}</div>
        @if (dateParts(view); as d) {
          <div class="cert-date" [style.left]="dayStyle.left" [style.top]="dayStyle.top"
               [style.width]="dayStyle.width" [style.height]="dayStyle.height">{{ d.day }}</div>
          <div class="cert-date" [style.left]="monthStyle.left" [style.top]="monthStyle.top"
               [style.width]="monthStyle.width" [style.height]="monthStyle.height">{{ d.month }}</div>
          <div class="cert-date" [style.left]="yearStyle.left" [style.top]="yearStyle.top"
               [style.width]="yearStyle.width" [style.height]="yearStyle.height">{{ d.year }}</div>
        }
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
    .cert-body { line-height: 1.4; }
    .cert-date {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      font-size: calc(var(--sheet-w, 100%) * 0.0176322);
      line-height: 1.1;
      white-space: nowrap;
    }

    .view-toggle {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    /* The global button rule pads every button, so these reset what they do not want. */
    .toggle-btn {
      padding: 0.5rem 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-muted);
      font-size: 0.875rem;
    }
    .toggle-btn.is-active {
      background: var(--ob-orange);
      border-color: var(--ob-orange);
      color: var(--color-on-primary);
    }

    .sheet-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }
    .nav-label { font-size: 0.875rem; color: var(--color-muted); }
    /*
     * width/height alone leaves these ovals: the global button rule's 1.75rem side padding
     * outruns the width, so the box stretches. Zeroing the padding is what makes them circles.
     */
    .nav-btn {
      flex: 0 0 auto;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: 50%;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 1.25rem;
      line-height: 1;
    }
    .nav-btn:hover:not(:disabled) {
      border-color: var(--ob-orange);
      color: var(--ob-orange);
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

  mode: 'summary' | 'block' = 'summary';
  downloading = false;
  downloadError = '';
  previewIndex = 0;
  exportView?: SheetView;
  nameWraps = false;

  private summaryBodyFit = 1;
  private viewReady = false;

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

  get previewView(): SheetView | undefined {
    return this.mode === 'summary' ? this.summaryView() : this.blockView(this.previewSquare);
  }

  get downloadLabel(): string {
    if (this.squares.length <= 1) return 'Laai PDF af';
    return this.mode === 'summary' ? 'Laai opsomming af' : 'Laai hierdie sertifikaat af';
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
    this.viewReady = true;
    void this.refit();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['squares']) {
      this.previewIndex = 0;
      // A lone block has nothing to summarise, so there is no choice to offer.
      this.mode = this.squares.length > 1 ? 'summary' : 'block';
    }
    // Both callers fill these in asynchronously, so re-fit rather than trusting the first render.
    if (!changes['ownerName']?.firstChange || changes['squares']) {
      void this.refit();
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

  bodyText(view?: SheetView): string {
    if (!view) return '';
    return `${blokLabel(view.count)} no. ${view.blocks} aangekoop het ter ondersteuning van die teer van die Oewerpad in Orania.`;
  }

  /** Only the summary can outgrow the design's sentence, so only it is ever scaled down. */
  bodyFontSize(view: SheetView): string {
    const fit = view.count > 1 ? this.summaryBodyFit : 1;
    return `calc(var(--sheet-w, 100%) * ${(BODY_BOX.fontSize / SHEET_W) * fit})`;
  }

  /**
   * Split the purchase date into the artwork's three slots. The server records the date in UTC, so
   * read the calendar fields straight off the ISO string: converting through a local `Date` would
   * shift a late-evening purchase onto the wrong day for anyone east of UTC, ourselves included.
   */
  dateParts(view?: SheetView): { day: string; month: string; year: string } | null {
    if (!view?.date) return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(view.date);
    if (!match) return null;

    return { day: match[3], month: match[2], year: match[1] };
  }

  private blockView(square?: CertificateSquare): SheetView | undefined {
    if (!square) return undefined;
    return { blocks: String(square.id), count: 1, date: square.purchaseDate };
  }

  /** The summary carries every block and, as agreed, the date of the most recent purchase. */
  private summaryView(): SheetView {
    const dates = this.squares
      .map(s => s.purchaseDate)
      .filter((d): d is string => !!d)
      .sort();

    return {
      blocks: formatBlockRanges(this.squares.map(s => s.id)),
      count: this.squares.length,
      date: dates[dates.length - 1],
    };
  }

  /**
   * Long block lists have to be shrunk to stay clear of the signatures. Wrapping is counted here
   * rather than measured off the DOM so the answer is the same on both sheets; the count is
   * conservative, since the browser can also break after the hyphen in a range and we do not.
   */
  private computeBodyFit(text: string): number {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return 1;

    for (let fit = 1; fit >= MIN_BODY_FIT; fit -= 0.04) {
      const size = BODY_BOX.fontSize * fit;
      ctx.font = `400 ${size}px 'Open Sans', 'Noto Sans', 'Segoe UI', sans-serif`;

      let lines = 1;
      let current = '';
      for (const word of text.split(' ')) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && ctx.measureText(candidate).width > BODY_BOX.width) {
          lines++;
          current = word;
        } else {
          current = candidate;
        }
      }

      if (lines * size * BODY_LINE_HEIGHT <= MAX_BODY_HEIGHT) return fit;
    }

    return MIN_BODY_FIT;
  }

  /**
   * Both fits are measured with canvas text metrics, which silently fall back to a system font
   * until the webfont has loaded — so everything waits on `fonts.ready` rather than measuring
   * whatever happens to be available on first paint.
   */
  private async refit(): Promise<void> {
    await document.fonts.ready;

    this.summaryBodyFit = this.computeBodyFit(this.bodyText(this.summaryView()));
    this.fitName();

    if (this.viewReady) {
      this.cdr.detectChanges();
    }
  }

  /**
   * Long names overflow the design's name box, so measure the rendered width and shrink to fit.
   * The ratio is resolution-independent, which is why it can be measured once against the
   * artwork's native width and then applied to both sheets.
   */
  private fitName(): void {
    if (!this.ownerName) return;

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
  }

  async downloadPdf() {
    const view = this.previewView;
    if (this.downloading || !view) return;

    this.downloading = true;
    this.downloadError = '';

    try {
      await this.refit();
      await this.decodeBackgrounds();

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      this.exportView = view;
      this.cdr.detectChanges();

      // scale 2 against the 794px sheet lands on 1588px — the plate's native resolution.
      const canvas = await html2canvas(this.exportSheet.nativeElement, {
        scale: 2,
        width: SHEET_W,
        height: SHEET_H,
        backgroundColor: '#ffffff',
      });

      // A4 portrait in mm; the artwork is full-bleed so the page is drawn edge to edge.
      const pdf = new jsPDF('p', 'mm', 'a4');
      // JPEG, not PNG: the canvas PNG encoder barely compresses the artwork and lands about
      // 10MB a page. At this quality the difference is invisible but the page is roughly 300KB.
      pdf.addImage(
        canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY),
        'JPEG',
        0, 0,
        pdf.internal.pageSize.getWidth(),
        pdf.internal.pageSize.getHeight(),
      );

      pdf.save(this.filenameFor(view));
    } catch {
      this.downloadError = 'Kon nie PDF genereer nie. Probeer asseblief weer.';
    } finally {
      this.downloading = false;
    }
  }

  private filenameFor(view: SheetView): string {
    const owner = this.sanitizeFilename(this.ownerName);
    return view.count > 1
      ? `sertifikaat-${owner}-opsomming.pdf`
      : `sertifikaat-${owner}-blok-${view.blocks}.pdf`;
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
