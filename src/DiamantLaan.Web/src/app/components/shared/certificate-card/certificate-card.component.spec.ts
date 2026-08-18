import { TestBed } from '@angular/core/testing';
import { CertificateCardComponent, TEXT_BAND, sanitizeFilename } from './certificate-card.component';

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
      expect(TEXT_BAND.top).toBeLessThan(fraction(cert.nameStyle.top));
    });

    it('reaches past the date, the lowest of the three fields', () => {
      expect(bandBottom).toBeGreaterThan(fraction(cert.dateStyle.top));
    });

    it('stops short of the signatures printed on the plate', () => {
      expect(bandBottom).toBeLessThan(SIGNATURE_ROW);
    });
  });

  it('turns a name into something a filesystem accepts', () => {
    expect(sanitizeFilename('Anna van der Merwe')).toBe('anna-van-der-merwe');
    expect(sanitizeFilename("Piet O'Reilly / Seun")).toBe('piet-oreilly--seun');
    expect(sanitizeFilename('   ')).toBe('sertifikaat');
  });
});
