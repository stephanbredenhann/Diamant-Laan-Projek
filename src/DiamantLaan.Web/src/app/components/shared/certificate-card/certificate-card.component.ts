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
import { TPipe } from '../../../i18n/t.pipe';

/**
 * The certificate artwork is the client's Canva design ("STADSBOUFONDS PADBOUFONDS FINAAL", page
 * one), exported to `sertifikaat-agtergrond.jpg` with its two fill-in fields — the sponsor's name
 * and the sentence carrying the block numbers — stripped out. We re-render those as live text on
 * top of the plate, so the geometry below has to stay in step with the artwork: the numbers are
 * lifted straight from the Canva document, whose page is 793.688x1171.64 (taller than A4). If the
 * plate is ever re-exported, re-check these against the new document rather than nudging them by
 * eye. Every `top` here is the box Canva reports less 0.1em, which is the baseline shift Canva
 * applies to a text frame's contents.
 */
const SHEET_W = 793.688;
const SHEET_H = 1171.64;

const NAME_BOX = { left: 162.82, top: 644.66, width: 468.06, fontSize: 43.3354, lineHeight: 60 };
const BODY_BOX = { left: 104.38, top: 693.51, width: 584.94, fontSize: 20 };

/**
 * The design carries no date field. The client asked for one written out in Afrikaans, centred in
 * the empty band between the block sentence (which ends at y 749) and the signature row (which
 * starts at y 889) — that puts it directly above Frans de Klerk's signature, the middle column.
 */
const DATE_BOX = { left: 196.84, top: 805, width: 400, fontSize: 20 };

/** The plate's own lettering. Callstories is the client's uploaded Canva font for the name. */
const NAME_FONT = `'Callstories', cursive`;
const BODY_FONT = `'Montserrat', 'Segoe UI', sans-serif`;

/**
 * Shrinking to exactly the box width still wraps, because layout rounds up where measureText does
 * not. Leaving a sliver spare keeps the name on the one line the artwork has room for.
 */
const NAME_FIT_SAFETY = 0.98;

/**
 * A summary listing many blocks runs longer than the design's sentence, so the body is allowed to
 * shrink. The ceiling is the gap between the body's top edge and the signature row at y 889, less
 * breathing room, so a long list can never collide with the signatures.
 */
const MAX_BODY_HEIGHT = 150;
const MIN_BODY_FIT = 0.55;
const BODY_LINE_HEIGHT = 1.4;

/** Runs this short read better spelled out ("5, 6, 7") than collapsed into a range ("5-7"). */
const MAX_RUN_AS_LIST = 3;

const MAANDE = [
  'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
  'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * The PDF is built in two layers rather than as one screenshot of the sheet, because html2canvas
 * can only raster what the DOM shows it: the plate came out at the preview image's resolution
 * upscaled to the capture size, so the artwork reached the page at about 124dpi however good the
 * source file was. Instead the print plate goes into the PDF as its own JPEG, byte for byte at
 * 2480px across a 210mm page (300dpi, the print standard), and html2canvas only draws the live
 * text over it. Nothing re-encodes the artwork, so it prints exactly as exported.
 */
const PRINT_PLATE_URL = 'sertifikaat-plaat-druk.jpg';

/** The export sheet's fixed pixel box, mirrored from `.cert-sheet--export` in the styles below. */
const EXPORT_W = 794;
const EXPORT_H = 1172;

/**
 * Only the strip holding the three live fields is kept from the capture. Cropping is what keeps
 * the transparent overlay cheap — jsPDF walks an alpha PNG pixel by pixel to split out its mask,
 * and a full sheet at this scale is 8M of them against the strip's 1.6M. The bounds are derived
 * from the field boxes, not typed in, so re-deriving the geometry moves the strip with it: half a
 * name line of headroom above for Callstories' ascenders, and the lower of the two fields' floors
 * below. It has to stay clear of the signature row at y 889, which the spec checks.
 */
const TEXT_BAND_TOP = NAME_BOX.top - NAME_BOX.lineHeight / 2;
const TEXT_BAND_BOTTOM = Math.max(BODY_BOX.top + MAX_BODY_HEIGHT, DATE_BOX.top + DATE_BOX.fontSize * 2);

/** Held as fractions of the sheet, the same units the fields are positioned in. */
export const TEXT_BAND = {
  top: TEXT_BAND_TOP / SHEET_H,
  height: (TEXT_BAND_BOTTOM - TEXT_BAND_TOP) / SHEET_H,
};

/** The strip in export pixels. Both the crop and its PDF placement read these, so they agree. */
const BAND_TOP_PX = Math.round(TEXT_BAND.top * EXPORT_H);
const BAND_H_PX = Math.round(TEXT_BAND.height * EXPORT_H);

/**
 * 3 puts the text on the page at 288dpi, alongside the plate's 300. Higher is pointless in print
 * and iOS caps a canvas dimension at 4096, which 1172 x 4 would break.
 */
const TEXT_LAYER_SCALE = 3;

/**
 * The page is cut to the artwork's own shape rather than to A4, which the artwork is too tall for.
 * Fitting it inside an A4 page left white bands down both sides, and against the plate's cream
 * paper they read as a printing mistake. A4's width is kept, so the sheet needs 310mm of height.
 */
const PDF_WIDTH_MM = 210;
const PDF_HEIGHT_MM = PDF_WIDTH_MM * (SHEET_H / SHEET_W);

const pctW = (v: number) => `${(v / SHEET_W) * 100}%`;
const pctH = (v: number) => `${(v / SHEET_H) * 100}%`;

/** Sizes that scale with the sheet are expressed against its rendered width. */
const sheetUnits = (v: number) => `calc(var(--sheet-w, 100%) * ${v / SHEET_W})`;

export interface CertificateSquare {
  id: number;
  status?: number;
  /** ISO timestamp from the API. Absent for older purchases, which simply leave the date blank. */
  purchaseDate?: string;
  /** Name for this block's own sheet. Absent means it prints the summary name. */
  ownerName?: string;
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

/** A name as it can appear in a filename: lowercase, hyphenated, nothing a filesystem dislikes. */
export function sanitizeFilename(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'sertifikaat';
}

/**
 * The print plate as a data URL, fetched once per page load. Every sheet in a zip embeds the same
 * 1.5MB of artwork, so fetching it per sheet would re-download it a dozen times over. Handed to
 * jsPDF as JPEG bytes, which it stores without decoding or re-encoding them.
 */
let platePromise: Promise<string> | undefined;

function printPlate(): Promise<string> {
  platePromise ??= fetch(PRINT_PLATE_URL)
    .then(res => {
      if (!res.ok) throw new Error(`Kon nie die sertifikaat-plaat laai nie (${res.status}).`);
      return res.blob();
    })
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }))
    // A failed fetch must not be cached, or the retry the download button offers can never succeed.
    .catch(err => {
      platePromise = undefined;
      throw err;
    });

  return platePromise;
}

/** One finished sheet: the PDF bytes and the filename it should be saved or zipped under. */
export interface CertificateSheetPdf {
  filename: string;
  blob: Blob;
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
  imports: [CommonModule, TPipe],
  template: `
    <div class="cert-page">
      @if (squares.length > 1 && !viewOnly && !lockedMode) {
        <div class="view-toggle" role="group" [attr.aria-label]="'Kies sertifikaat weergawe' | t">
          <button type="button" class="toggle-btn" [class.is-active]="mode === 'summary'"
                  [attr.aria-pressed]="mode === 'summary'" (click)="stelModus('summary')">{{ 'Al die bloknommers op een sertifikaat' | t }}</button>
          <button type="button" class="toggle-btn" [class.is-active]="mode === 'block'"
                  [attr.aria-pressed]="mode === 'block'" (click)="stelModus('block')">{{ 'Elke bloknommer op sy eie sertifikaat' | t }}</button>
        </div>
      }

      <div class="cert-sheet" #previewSheet>
        <img class="cert-bg" src="sertifikaat-agtergrond.jpg" alt="" #bgImage />
        @if (bladNaam && previewView; as view) {
          <div class="cert-name" [style.left]="nameStyle.left" [style.top]="nameStyle.top"
               [style.width]="nameStyle.width">{{ bladNaam }}</div>
          <div class="cert-body" [style.left]="bodyStyle.left" [style.top]="bodyStyle.top"
               [style.width]="bodyStyle.width" [style.fontSize]="bodyFontSize(view)">{{ bodyText(view) }}</div>
          @if (dateText(view); as datum) {
            <div class="cert-date" [style.left]="dateStyle.left" [style.top]="dateStyle.top"
                 [style.width]="dateStyle.width">{{ datum }}</div>
          }
        }
      </div>

      @if (mode === 'block' && squares.length > 1) {
        <div class="sheet-nav">
          <button type="button" class="nav-btn" [disabled]="previewIndex === 0"
                  (click)="stepPreview(-1)" [attr.aria-label]="'Vorige sertifikaat' | t">‹</button>
          <span class="nav-label">{{ 'Blok' | t }} {{ previewSquare?.id }}, {{ previewIndex + 1 }} {{ 'van' | t }} {{ squares.length }}</span>
          <button type="button" class="nav-btn" [disabled]="previewIndex === squares.length - 1"
                  (click)="stepPreview(1)" [attr.aria-label]="'Volgende sertifikaat' | t">›</button>
        </div>
      }

      @if (!viewOnly) {
        <div class="actions">
          <ng-content></ng-content>
          @if (squares.length > 0) {
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="downloading"
              (click)="downloadPdf()">
              {{ (downloading ? 'Besig om PDF te genereer...' : downloadLabel) | t }}
            </button>
          }
        </div>
      }

      @if (squares.length === 0) {
        <p class="empty">{{ 'Geen vierkante meter gevind nie.' | t }}</p>
      }

      @if (downloadError) {
        <p class="download-error">{{ downloadError | t }}</p>
      }
    </div>

    <!--
      Rendered at the artwork's native width so html2canvas captures exact design geometry. It
      carries no plate: the artwork is added to the PDF directly, and this sheet only supplies the
      live text drawn over it.
    -->
    <div class="cert-sheet cert-sheet--export" #exportSheet aria-hidden="true">
      @if (exportView; as view) {
        <div class="cert-name" [style.left]="nameStyle.left" [style.top]="nameStyle.top"
             [style.width]="nameStyle.width">{{ exportName }}</div>
        <div class="cert-body" [style.left]="bodyStyle.left" [style.top]="bodyStyle.top"
             [style.width]="bodyStyle.width" [style.fontSize]="bodyFontSize(view)">{{ bodyText(view) }}</div>
        @if (dateText(view); as datum) {
          <div class="cert-date" [style.left]="dateStyle.left" [style.top]="dateStyle.top"
               [style.width]="dateStyle.width">{{ datum }}</div>
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
      aspect-ratio: 794 / 1172;
      background: #fff;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    /*
     * Transparent, unlike the preview: html2canvas paints the element's own background into the
     * capture, so the white the preview wants behind the plate came out as an opaque strip across
     * the artwork in the PDF. The plate is the background here, and it is added underneath in the
     * PDF itself.
     */
    .cert-sheet--export {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 794px;
      height: 1172px;
      aspect-ratio: auto;
      --sheet-w: 794px;
      background: transparent;
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
      text-align: center;
      font-weight: 400;
    }
    /*
     * The line box is held at the design's 60px whatever --name-fit does to the glyphs, so a long
     * name shrinks in place instead of drifting up the sheet. There is no room for a second line
     * between the artwork's two fixed sentences, hence nowrap and a fit that always succeeds.
     */
    .cert-name {
      font-family: 'Callstories', cursive;
      color: var(--ob-orange);
      font-size: calc(var(--sheet-w, 100%) * 0.0546 * var(--name-fit));
      line-height: calc(var(--sheet-w, 100%) * 0.0756);
      white-space: nowrap;
    }
    .cert-body, .cert-date {
      font-family: 'Montserrat', 'Segoe UI', sans-serif;
      color: #000;
      line-height: 1.4;
    }
    .cert-date { font-size: calc(var(--sheet-w, 100%) * 0.0252); }

    .view-toggle {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    /* The global button rule pads every button, so these reset what they do not want. */
    .toggle-btn {
      padding: 0.5rem 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
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
    .nav-label { font-size: var(--fs-base); color: var(--text-muted); }
    /*
     * width/height alone leaves these ovals: the global button rule's 1.75rem side padding
     * outruns the width, so the box stretches. Zeroing the padding is what makes them circles.
     */
    .nav-btn {
      flex: 0 0 auto;
      width: var(--tap-min);
      height: var(--tap-min);
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: 50%;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: var(--fs-xl);
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
    .actions .btn-primary { min-height: var(--tap-large); font-size: var(--fs-lg); }
    @media (max-width: 480px) {
      .actions { flex-direction: column; }
      .actions .btn { width: 100%; }
    }
    .empty { text-align: center; color: var(--text-muted); font-size: var(--fs-base); }
    .download-error {
      text-align: center;
      color: #A61B1B;
      font-size: var(--fs-base);
    }
  `]
})
export class CertificateCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('previewSheet') previewSheet!: ElementRef<HTMLElement>;
  @ViewChild('exportSheet') exportSheet!: ElementRef<HTMLElement>;
  @ViewChild('bgImage') bgImage!: ElementRef<HTMLImageElement>;

  private cdr = inject(ChangeDetectorRef);
  private host = inject(ElementRef<HTMLElement>);
  private resizeObserver?: ResizeObserver;

  @Input() ownerName = '';
  /** `purchaseDate` is the ISO date the block was bought; without it the date stays blank. */
  @Input() squares: CertificateSquare[] = [];
  /**
   * Someone else's certificate, on the public share link: the summary sheet and nothing else.
   * No paging through their individual blocks, and no PDF. The owner takes their own copy.
   */
  @Input() viewOnly = false;
  /**
   * Forces one shape and hides the toggle. The account picked summary or per-block when it bought,
   * and that choice is locked with the names, so the certificate page is showing a settled fact
   * rather than offering a view to flip between. Null leaves the old free choice, which is what
   * the guest flow still uses.
   */
  @Input() lockedMode: 'summary' | 'block' | null = null;

  mode: 'summary' | 'block' = 'summary';
  downloading = false;
  downloadError = '';
  previewIndex = 0;
  exportView?: SheetView;
  /** The name on the sheet currently being exported, which need not be the one on screen. */
  exportName = '';

  private summaryBodyFit = 1;
  private viewReady = false;

  readonly nameStyle = {
    left: pctW(NAME_BOX.left),
    top: pctH(NAME_BOX.top),
    width: pctW(NAME_BOX.width),
  };

  readonly bodyStyle = {
    left: pctW(BODY_BOX.left),
    top: pctH(BODY_BOX.top),
    width: pctW(BODY_BOX.width),
  };

  readonly dateStyle = {
    left: pctW(DATE_BOX.left),
    top: pctH(DATE_BOX.top),
    width: pctW(DATE_BOX.width),
  };

  get previewSquare(): CertificateSquare | undefined {
    return this.squares[this.previewIndex];
  }

  get previewView(): SheetView | undefined {
    return this.mode === 'summary' ? this.summaryView() : this.blockView(this.previewSquare);
  }

  /**
   * The name on the sheet in view. A block may carry its own, for someone splitting their
   * blocks between family; the summary sheet always prints the one shared name.
   */
  get bladNaam(): string {
    if (this.mode === 'block') return this.previewSquare?.ownerName?.trim() || this.ownerName;
    return this.ownerName;
  }

  stelModus(mode: 'summary' | 'block') {
    if (this.mode === mode) return;
    this.mode = mode;
    void this.refit();
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
    if (changes['squares'] || changes['lockedMode']) {
      if (changes['squares']) this.previewIndex = 0;
      // A lone block has nothing to summarise, so there is no choice to offer.
      this.mode = this.lockedMode ?? (this.squares.length > 1 ? 'summary' : 'block');
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
      // The next block may print a different name, which may need a different fit.
      void this.refit();
    }
  }

  /**
   * The design's own sentence, with the placeholder filled in. The summary only pluralises it.
   * Stays Afrikaans in both languages: it is overlaid on the Afrikaans Canva plate, so an English
   * sentence would sit inside Afrikaans artwork. Translate this only alongside an English plate.
   */
  bodyText(view?: SheetView): string {
    if (!view) return '';
    const nommer = view.count === 1 ? 'bloknommer' : 'bloknommers';
    return `${nommer} ${view.blocks} ter ondersteuning van die bou van die Oewerpad in Orania geborg het.`;
  }

  /** Only the summary can outgrow the design's sentence, so only it is ever scaled down. */
  bodyFontSize(view: SheetView): string {
    const fit = view.count > 1 ? this.summaryBodyFit : 1;
    return sheetUnits(BODY_BOX.fontSize * fit);
  }

  /**
   * The purchase date written out in Afrikaans. The server records it in UTC, so read the calendar
   * fields straight off the ISO string: converting through a local `Date` would shift a
   * late-evening purchase onto the wrong day for anyone east of UTC, ourselves included.
   */
  dateText(view?: SheetView): string {
    if (!view?.date) return '';

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(view.date);
    if (!match) return '';

    const maand = MAANDE[Number(match[2]) - 1];
    if (!maand) return '';

    return `${Number(match[3])} ${maand} ${match[1]}`;
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
      ctx.font = `400 ${size}px ${BODY_FONT}`;

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
   * until the webfont has loaded — so everything waits on the two design faces rather than
   * measuring whatever happens to be available on first paint. `fonts.ready` alone is not enough:
   * a face nothing has painted yet is not pending, so it would never be waited for.
   */
  private async refit(): Promise<void> {
    await Promise.all([
      document.fonts.load(`400 ${NAME_BOX.fontSize}px ${NAME_FONT}`),
      document.fonts.load(`400 ${BODY_BOX.fontSize}px ${BODY_FONT}`),
    ]).catch(() => undefined);
    await document.fonts.ready;

    this.summaryBodyFit = this.computeBodyFit(this.bodyText(this.summaryView()));
    this.fitName(this.bladNaam);

    if (this.viewReady) {
      this.cdr.detectChanges();
    }
  }

  /**
   * Long names overflow the design's name box, so measure the rendered width and shrink to fit.
   * The ratio is resolution-independent, which is why it can be measured once against the
   * artwork's native width and then applied to both sheets.
   */
  private fitName(naam: string): void {
    if (!naam) return;

    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;

    ctx.font = `400 ${NAME_BOX.fontSize}px ${NAME_FONT}`;
    const measured = ctx.measureText(naam).width;
    const required = NAME_BOX.width / measured;
    const fit = required >= 1 ? 1 : required * NAME_FIT_SAFETY;

    this.host.nativeElement.style.setProperty('--name-fit', `${fit}`);
  }

  /** Saves whichever sheet is on screen, which is what the button under it says it will do. */
  async downloadPdf() {
    const view = this.previewView;
    if (this.downloading || !view) return;

    this.downloading = true;
    this.downloadError = '';

    try {
      const pdf = await this.pdfFrom(await this.renderTextLayer(view, this.bladNaam));
      pdf.save(this.filenameFor(view, this.bladNaam));
    } catch {
      this.downloadError = 'Kon nie PDF genereer nie. Probeer asseblief weer.';
    } finally {
      this.downloading = false;
    }
  }

  /**
   * One sheet as PDF bytes, for a caller taking several at once. `target` is a block number, or
   * 'summary' for the one sheet carrying every block. The preview is left as it was, so this can
   * be called in a loop against an off-screen card without the page flickering through the sheets.
   */
  async sheetPdf(target: 'summary' | number): Promise<CertificateSheetPdf> {
    const view = this.viewFor(target);
    if (!view) throw new Error(`Geen sertifikaat vir ${target}.`);

    const name = this.nameFor(target);
    try {
      const pdf = await this.pdfFrom(await this.renderTextLayer(view, name));
      return { filename: this.filenameFor(view, name), blob: pdf.output('blob') };
    } finally {
      this.fitName(this.bladNaam);
    }
  }

  /**
   * Every sheet this account would get: the summary first, then one per block. A lone block has
   * nothing to summarise, so it is the only sheet there is.
   */
  sheetTargets(): ('summary' | number)[] {
    const blocks = this.squares.map(s => s.id);
    return blocks.length > 1 ? ['summary', ...blocks] : blocks;
  }

  /** What one target's sheet would be called, for a chooser that lists them before rendering. */
  sheetLabel(target: 'summary' | number): string {
    return target === 'summary' ? 'Opsomming' : `Blok ${target}`;
  }

  private viewFor(target: 'summary' | number): SheetView | undefined {
    return target === 'summary'
      ? this.summaryView()
      : this.blockView(this.squares.find(s => s.id === target));
  }

  /** A block may carry its own name; the summary sheet always prints the one shared name. */
  private nameFor(target: 'summary' | number): string {
    if (target === 'summary') return this.ownerName;
    return this.squares.find(s => s.id === target)?.ownerName?.trim() || this.ownerName;
  }

  /**
   * The live text for one sheet, cropped to the strip it occupies, as a transparent PNG data URL.
   * PNG because the plate has to show through it; JPEG has no alpha and would bury the artwork
   * under a rectangle of cream.
   */
  private async renderTextLayer(view: SheetView, sheetName: string): Promise<string> {
    await this.refit();

    const { default: html2canvas } = await import('html2canvas');

    this.exportView = view;
    this.exportName = sheetName;
    this.fitName(sheetName);
    this.cdr.detectChanges();

    const sheet = await html2canvas(this.exportSheet.nativeElement, {
      scale: TEXT_LAYER_SCALE,
      width: EXPORT_W,
      height: EXPORT_H,
      backgroundColor: null,
    });

    const band = document.createElement('canvas');
    band.width = sheet.width;
    band.height = BAND_H_PX * TEXT_LAYER_SCALE;
    band.getContext('2d')?.drawImage(sheet, 0, -BAND_TOP_PX * TEXT_LAYER_SCALE);

    return band.toDataURL('image/png');
  }

  /** The plate, then the text strip over it at the same fraction of the page it was cropped from. */
  private async pdfFrom(textLayer: string) {
    const [{ jsPDF }, plate] = await Promise.all([import('jspdf'), printPlate()]);
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [PDF_WIDTH_MM, PDF_HEIGHT_MM] });

    pdf.addImage(plate, 'JPEG', 0, 0, PDF_WIDTH_MM, PDF_HEIGHT_MM, 'plaat');
    pdf.addImage(
      textLayer,
      'PNG',
      0,
      (BAND_TOP_PX / EXPORT_H) * PDF_HEIGHT_MM,
      PDF_WIDTH_MM,
      (BAND_H_PX / EXPORT_H) * PDF_HEIGHT_MM,
    );

    return pdf;
  }

  private filenameFor(view: SheetView, sheetName: string): string {
    const owner = this.sanitizeFilename(sheetName);
    return view.count > 1
      ? `sertifikaat-${owner}-opsomming.pdf`
      : `sertifikaat-${owner}-blok-${view.blocks}.pdf`;
  }

  private sanitizeFilename(name: string): string {
    return sanitizeFilename(name);
  }
}
