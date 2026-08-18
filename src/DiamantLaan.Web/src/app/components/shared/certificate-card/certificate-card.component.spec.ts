import { TestBed } from '@angular/core/testing';
import { CertificateCardComponent } from './certificate-card.component';

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
});
