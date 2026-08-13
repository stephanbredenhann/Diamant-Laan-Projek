import { Square, SquareStatus } from '../../../models/square';
import {
  MAX_BLOK_ID,
  blokRede,
  groepe,
  isBeskikbaar,
  seksieVan,
  seksies,
  telBeskikbaar,
} from './blok-reekse';

function blok(id: number, isSold = false, isReserved = false): Square {
  return { id, status: SquareStatus.NogNieBeginNie, isSold, isReserved };
}

describe('blok-reekse', () => {
  it('tiles 1..4200 with four groups, no gap and no overlap', () => {
    const gs = groepe();
    expect(gs.length).toBe(4);
    expect(gs[0].van).toBe(1);
    expect(gs[gs.length - 1].tot).toBe(MAX_BLOK_ID);
    gs.forEach((g, i) => {
      if (i > 0) expect(g.van).toBe(gs[i - 1].tot + 1);
      expect(g.tot).toBeGreaterThanOrEqual(g.van);
    });
  });

  it('folds the trailing 200 blocks into the last group', () => {
    const last = groepe()[3];
    expect(last).toEqual({ van: 3001, tot: 4200 });
  });

  it('tiles every group with 100-block sections', () => {
    for (const g of groepe()) {
      const ss = seksies(g);
      expect(ss[0].van).toBe(g.van);
      expect(ss[ss.length - 1].tot).toBe(g.tot);
      ss.forEach((s, i) => {
        if (i > 0) expect(s.van).toBe(ss[i - 1].tot + 1);
      });
    }
  });

  it('gives the last group twelve sections and the others ten', () => {
    const counts = groepe().map(g => seksies(g).length);
    expect(counts).toEqual([10, 10, 10, 12]);
  });

  it('locates a block in its group and section', () => {
    expect(seksieVan(2350)).toEqual({
      groep: { van: 2001, tot: 3000 },
      seksie: { van: 2301, tot: 2400 },
    });
  });

  it('puts range boundaries in the right section', () => {
    expect(seksieVan(1)!.seksie).toEqual({ van: 1, tot: 100 });
    expect(seksieVan(100)!.seksie).toEqual({ van: 1, tot: 100 });
    expect(seksieVan(101)!.seksie).toEqual({ van: 101, tot: 200 });
    expect(seksieVan(4200)!.seksie).toEqual({ van: 4101, tot: 4200 });
  });

  it('rejects block numbers that do not exist', () => {
    expect(seksieVan(0)).toBeNull();
    expect(seksieVan(4201)).toBeNull();
    expect(seksieVan(NaN)).toBeNull();
  });

  it('treats an admin-reserved block as unavailable', () => {
    expect(blokRede(199, blok(199, false, true))).toBe('onbeskikbaar');
    expect(blokRede(199, blok(199))).toBeNull();
  });

  it('prefers onbeskikbaar over verkoop when a block is both', () => {
    expect(blokRede(500, blok(500, true, true))).toBe('onbeskikbaar');
  });

  it('reports a sold block as verkoop, not onbeskikbaar', () => {
    expect(blokRede(500, blok(500, true))).toBe('verkoop');
    expect(isBeskikbaar(500, blok(500, true))).toBe(false);
  });

  it('treats a block the API never returned as still available', () => {
    expect(isBeskikbaar(500, undefined)).toBe(true);
  });

  it('excludes both sold and reserved blocks when counting a range', () => {
    const byId = new Map<number, Square>();
    for (let id = 1; id <= 300; id++) {
      byId.set(id, blok(id, id === 250 || id === 251, id <= 10));
    }

    // 300 blocks, ten reserved and two sold.
    expect(telBeskikbaar({ van: 1, tot: 300 }, byId)).toBe(288);
  });
});
