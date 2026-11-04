import { TestBed } from '@angular/core/testing';
import { CERTIFICATE_DESIGNS, CertificateCardComponent, TEXT_BAND, sanitizeFilename } from './certificate-card.component';

describe('CertificateCardComponent', () => {
  let cert: CertificateCardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CertificateCardComponent] });
    cert = TestBed.createComponent(CertificateCardComponent).componentInstance;
  });

  it('writes the purchase date out in Afrikaans', () => {
    expect(cert.dateText({ blocks: '12', count: 1, date: '2026-08-18T09:15:00Z' })).toBe('18 Augustus 2026');
    expect(cert.dateText({ blocks: '12', count: 1, date: '2026-01-03T00:00:00Z' })).toBe('3 Januarie 2026');
  });

  it('reads the calendar day off the ISO string, not off a local Date', () => {
    // 23:30 UTC is already the next day here, and the sheet must still say the 18th.
    expect(cert.dateText({ blocks: '12', count: 1, date: '2026-08-18T23:30:00Z' })).toBe('18 Augustus 2026');
  });

  it('leaves the date blank when there is none, or it cannot be read', () => {
    expect(cert.dateText({ blocks: '12', count: 1 })).toBe('');
    expect(cert.dateText({ blocks: '12', count: 1, date: '2026-13-01' })).toBe('');
  });

  it('names one block in the singular and several in the plural', () => {
    expect(cert.bodyText({ blocks: '12', count: 1 })).toContain('bloknommer 12 ter');
    expect(cert.bodyText({ blocks: '1, 2', count: 2 })).toContain('bloknommers 1, 2 ter');
  });

  it('offers a summary sheet plus one per block', () => {
    cert.squares = [{ id: 12 }, { id: 13 }];
    expect(cert.sheetTargets()).toEqual(['summary', 12, 13]);
    expect(cert.sheetLabel('summary')).toBe('Opsomming');
    expect(cert.sheetLabel(13)).toBe('Blok 13');
  });

  it('offers only the one sheet a lone block has, so a zip cannot hold it twice', () => {
    cert.squares = [{ id: 12 }];
    expect(cert.sheetTargets()).toEqual([12]);
  });

  it('has no sheets to offer without blocks', () => {
    cert.squares = [];
    expect(cert.sheetTargets()).toEqual([]);
  });

  /**
   * The PDF pastes only this strip of the capture over the plate, so anything the strip misses is
   * simply absent from the download, and anything it overreaches paints a transparent rectangle
   * across the artwork's own lettering. Both failures look like a broken certificate, and neither
   * shows up on screen — the preview draws the same text straight onto the page.
   */
  describe('the text strip the PDF crops out of the capture', () => {
    const fraction = (style: string) => parseFloat(style) / 100;
    const bandBottom = TEXT_BAND.top + TEXT_BAND.height;
    /** Where the plate's own signature row starts, y 889 of the design's 1171.64pt page. */
    const SIGNATURE_ROW = 889 / 1171.64;

    it('starts above the name, leaving room for Callstories to rise out of its line box', () => {
      expect(TEXT_BAND.top).toBeLessThan(fraction(cert.layouts.standaard.name.top));
    });

    it('reaches past the date, the lowest of the three fields', () => {
      expect(bandBottom).toBeGreaterThan(fraction(cert.layouts.standaard.date.top));
    });

    it('stops short of the signatures printed on the plate', () => {
      expect(bandBottom).toBeLessThan(SIGNATURE_ROW);
    });

    it('is still the standard plate geometry, untouched by the pioneer one', () => {
      const std = CERTIFICATE_DESIGNS.standaard;
      expect(std.nameBox).toEqual({ left: 162.82, top: 644.66, width: 468.06, fontSize: 43.3354, lineHeight: 60 });
      expect(std.bodyBox).toEqual({ left: 104.38, top: 693.51, width: 584.94, fontSize: 20 });
      expect(std.dateBox).toEqual({ left: 196.84, top: 805, width: 400, fontSize: 20 });
      expect(std.maxBodyHeight).toBe(150);
      expect(std.plate).toBe('sertifikaat-agtergrond.jpg');
      expect(std.printPlate).toBe('sertifikaat-plaat-druk.jpg');
    });
  });

  /**
   * The pioneer plate moves the fill-in band up and puts a gold seal where the standard plate's
   * date sat. Its fields have to fit between "Hiermee word bevestig dat" and the seal.
   */
  describe('the pioneer plate', () => {
    const pioneer = CERTIFICATE_DESIGNS.pionier;
    const fraction = (style: string) => parseFloat(style) / 100;
    const bandBottom = pioneer.band.top + pioneer.band.height;
    /** "Hiermee word bevestig dat" ends at y 459.3 of 1171.64; the seal starts at y 684.8. */
    const LEAD_IN_BOTTOM = 459.3;
    const SEAL_TOP = 684.8 / 1171.64;

    it('starts its strip above the name and reaches past the date', () => {
      expect(pioneer.band.top).toBeLessThan(fraction(cert.layouts.pionier.name.top));
      expect(bandBottom).toBeGreaterThan(fraction(cert.layouts.pionier.date.top));
    });

    it('stops the strip short of the seal printed on the plate', () => {
      expect(pioneer.floor).toBe(684.8);
      expect(bandBottom).toBeLessThan(SEAL_TOP);
    });

    it('sets the name below the lead-in line, at the same distance as on the standard plate', () => {
      const std = CERTIFICATE_DESIGNS.standaard;
      expect(pioneer.nameBox.top).toBeGreaterThan(LEAD_IN_BOTTOM);
      expect(pioneer.bodyBox.top - pioneer.nameBox.top).toBeCloseTo(std.bodyBox.top - std.nameBox.top, 5);
    });

    it('keeps the date, between the block sentence and the seal', () => {
      expect(pioneer.bodyBox.top + pioneer.maxBodyHeight).toBeLessThan(pioneer.dateBox.top);
      expect(pioneer.dateBox.top + pioneer.dateBox.fontSize * 1.4).toBeLessThan(pioneer.floor);
    });

    it('keeps the text, fonts and widths of the standard plate', () => {
      const std = CERTIFICATE_DESIGNS.standaard;
      expect(pioneer.nameBox.width).toBe(std.nameBox.width);
      expect(pioneer.nameBox.fontSize).toBe(std.nameBox.fontSize);
      expect(pioneer.bodyBox.width).toBe(std.bodyBox.width);
      expect(pioneer.bodyBox.fontSize).toBe(std.bodyBox.fontSize);
      expect(pioneer.dateBox.fontSize).toBe(std.dateBox.fontSize);
    });

    it('shrinks a long block list to the pioneer ceiling, not the standard one', () => {
      const ranges = Array.from({ length: 40 }, (_, i) => `${i * 10 + 1}-${i * 10 + 5}`).join(', ');
      const text = cert.bodyText({ blocks: ranges, count: 200 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fit = (cert as any).computeBodyFit(text, pioneer) as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stdFit = (cert as any).computeBodyFit(text, CERTIFICATE_DESIGNS.standaard) as number;
      expect(fit).toBeLessThan(stdFit);
      expect(fit).toBeGreaterThanOrEqual(pioneer.minBodyFit);
    });
  });

  describe('picking the plate', () => {
    const pioneerFirst = [
      { id: 5, isPioneer: true, purchaseDate: '2026-02-01T10:00:00Z' },
      { id: 6, isPioneer: true, purchaseDate: '2026-02-03T10:00:00Z' },
      { id: 7, isPioneer: true, purchaseDate: '2026-02-03T10:00:00Z' },
      { id: 900, purchaseDate: '2026-09-20T10:00:00Z' },
    ];

    it('prints each block on its own plate', () => {
      cert.squares = pioneerFirst;
      expect(cert.viewFor(5)?.design).toBe('pionier');
      expect(cert.viewFor(900)?.design).toBe('standaard');
    });

    it('splits a mixed set into a pioneer summary and a standard one', () => {
      cert.squares = pioneerFirst;
      expect(cert.sheetTargets()).toEqual(['summary-pionier', 'summary', 5, 6, 7, 900]);

      const pioneer = cert.viewFor('summary-pionier')!;
      expect(pioneer.design).toBe('pionier');
      expect(pioneer.blocks).toBe('5, 6, 7');
      expect(cert.dateText(pioneer)).toBe('3 Februarie 2026');

      const standard = cert.viewFor('summary')!;
      expect(standard.design).toBe('standaard');
      expect(standard.blocks).toBe('900');
      expect(standard.count).toBe(1);
      expect(cert.dateText(standard)).toBe('20 September 2026');
    });

    it('names the two summaries apart, in the chooser and on disk', () => {
      cert.squares = pioneerFirst;
      expect(cert.sheetLabel('summary-pionier')).toBe('Opsomming (pionier)');
      expect(cert.filenameFor(cert.viewFor('summary-pionier')!, 'Anna Boer')).toBe('sertifikaat-anna-boer-opsomming-pionier.pdf');
      expect(cert.filenameFor(cert.viewFor('summary')!, 'Anna Boer')).toBe('sertifikaat-anna-boer-opsomming.pdf');
      expect(cert.filenameFor(cert.viewFor(900)!, 'Anna Boer')).toBe('sertifikaat-anna-boer-blok-900.pdf');
    });

    it('pages between the two summaries in the summary preview', () => {
      cert.squares = pioneerFirst;
      cert.mode = 'summary';
      expect(cert.previewTarget).toBe('summary-pionier');
      expect(cert.previewView?.design).toBe('pionier');
      cert.stepPreview(1);
      expect(cert.previewTarget).toBe('summary');
      expect(cert.previewView?.design).toBe('standaard');
      cert.stepPreview(1);
      expect(cert.previewTarget).toBe('summary');
    });

    it('keeps one summary, on the pioneer plate, when every block is a pioneer', () => {
      cert.squares = pioneerFirst.slice(0, 3);
      expect(cert.sheetTargets()).toEqual(['summary', 5, 6, 7]);
      const summary = cert.viewFor('summary')!;
      expect(summary.design).toBe('pionier');
      expect(cert.filenameFor(summary, 'Anna Boer')).toBe('sertifikaat-anna-boer-opsomming.pdf');
    });

    it('leaves a set with no pioneer blocks exactly as it was', () => {
      cert.squares = [{ id: 12 }, { id: 13 }];
      expect(cert.sheetTargets()).toEqual(['summary', 12, 13]);
      expect(cert.viewFor('summary')?.design).toBe('standaard');
      expect(cert.geometryOf(cert.viewFor('summary')).plate).toBe('sertifikaat-agtergrond.jpg');
    });
  });

  it('turns a name into something a filesystem accepts', () => {
    expect(sanitizeFilename('Anna van der Merwe')).toBe('anna-van-der-merwe');
    expect(sanitizeFilename("Piet O'Reilly / Seun")).toBe('piet-oreilly--seun');
    expect(sanitizeFilename('   ')).toBe('sertifikaat');
  });
});
