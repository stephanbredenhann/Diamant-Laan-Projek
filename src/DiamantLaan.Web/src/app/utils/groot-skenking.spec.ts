import { bevestigingPas, blokkeVirBedrag, formatRand, nuweSleutel } from './groot-skenking';

const MAX = 4000;

describe('blokkeVirBedrag', () => {
  it('turns R700 000 into 1 400 blocks however it is typed', () => {
    for (const teks of ['700000', '700 000', 'R700000', 'R 700 000', ' r700 000 ']) {
      expect(blokkeVirBedrag(teks, MAX)).toEqual({ bedrag: 700000, blokke: 1400, fout: null });
    }
  });

  it('accepts a single block', () => {
    expect(blokkeVirBedrag('500', MAX).blokke).toBe(1);
  });

  it('refuses an amount that is not a multiple of R500, and suggests the nearest ones', () => {
    const uitslag = blokkeVirBedrag('700250', MAX);
    expect(uitslag.blokke).toBe(0);
    expect(uitslag.fout).toContain('R700 000');
    expect(uitslag.fout).toContain('R700 500');
  });

  it('refuses empty, zero and anything that is not whole rand', () => {
    expect(blokkeVirBedrag('', MAX).fout).toBeTruthy();
    expect(blokkeVirBedrag('0', MAX).fout).toBeTruthy();
    expect(blokkeVirBedrag('-500', MAX).fout).toBeTruthy();
    expect(blokkeVirBedrag('700,000', MAX).fout).toBeTruthy();
    expect(blokkeVirBedrag('700000.00', MAX).fout).toBeTruthy();
    expect(blokkeVirBedrag('sewe', MAX).fout).toBeTruthy();
  });

  it('refuses more than the road has', () => {
    expect(blokkeVirBedrag(String(MAX * 500), MAX).blokke).toBe(MAX);
    expect(blokkeVirBedrag(String((MAX + 1) * 500), MAX).fout).toBeTruthy();
  });
});

describe('bevestigingPas', () => {
  it('only matches the exact count', () => {
    expect(bevestigingPas('1400', 1400)).toBeTrue();
    expect(bevestigingPas(' 1 400 ', 1400)).toBeTrue();
    expect(bevestigingPas('140', 1400)).toBeFalse();
    expect(bevestigingPas('14000', 1400)).toBeFalse();
    expect(bevestigingPas('1,400', 1400)).toBeFalse();
    expect(bevestigingPas('', 1400)).toBeFalse();
  });

  it('never confirms nothing', () => {
    expect(bevestigingPas('0', 0)).toBeFalse();
  });
});

describe('formatRand', () => {
  it('groups thousands with spaces', () => {
    expect(formatRand(500)).toBe('R500');
    expect(formatRand(700000)).toBe('R700 000');
    expect(formatRand(2000000)).toBe('R2 000 000');
  });
});

describe('nuweSleutel', () => {
  it('makes a fresh GUID every time', () => {
    const a = nuweSleutel();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(nuweSleutel()).not.toBe(a);
  });
});
