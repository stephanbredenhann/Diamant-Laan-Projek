import { Square, SquareStatus } from '../../../models/square';
import {
  MAX_BLOK_ID,
  alleSeksies,
  blokRede,
  isBeskikbaar,
  seksieVan,
  telBeskikbaar,
} from './blok-reekse';

function blok(id: number, isSold = false, isReserved = false): Square {
  return { id, status: SquareStatus.NogNieBeginNie, isSold, isReserved };
}

describe('blok-reekse', () => {
  it('tiles 1..4000 with sections of a hundred, no gap and no overlap', () => {
    const ss = alleSeksies();
    expect(ss.length).toBe(40);
    expect(ss[0]).toEqual({ van: 1, tot: 100 });
    expect(ss[ss.length - 1].tot).toBe(MAX_BLOK_ID);
    ss.forEach((s, i) => {
      if (i > 0) expect(s.van).toBe(ss[i - 1].tot + 1);
    });
  });

  it('locates a block in its section', () => {
    expect(seksieVan(2350)).toEqual({ van: 2301, tot: 2400 });
  });

  it('puts range boundaries in the right section', () => {
    expect(seksieVan(1)).toEqual({ van: 1, tot: 100 });
    expect(seksieVan(100)).toEqual({ van: 1, tot: 100 });
    expect(seksieVan(101)).toEqual({ van: 101, tot: 200 });
    expect(seksieVan(4000)).toEqual({ van: 3901, tot: 4000 });
  });

  it('rejects block numbers that do not exist', () => {
    expect(seksieVan(0)).toBeNull();
    expect(seksieVan(4001)).toBeNull();
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
