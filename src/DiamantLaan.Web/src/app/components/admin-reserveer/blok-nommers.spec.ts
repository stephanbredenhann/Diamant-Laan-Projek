import {
  MAX_BLOKKE_PER_SLAG,
  nommersNaReekse,
  ontleedBlokNommers,
  reeksTeks,
} from './blok-nommers';

const MAX = 4200;

describe('ontleedBlokNommers', () => {
  it('reads single numbers, ranges and mixed separators', () => {
    expect(ontleedBlokNommers('3, 1-4\n7  9', MAX)).toEqual({
      ids: [1, 2, 3, 4, 7, 9],
      fout: null,
    });
  });

  it('tolerates spaces around a range hyphen', () => {
    expect(ontleedBlokNommers('300 - 302', MAX).ids).toEqual([300, 301, 302]);
  });

  it('dedupes overlapping ranges', () => {
    expect(ontleedBlokNommers('1-3, 2-4', MAX).ids).toEqual([1, 2, 3, 4]);
  });

  it('rejects empty input', () => {
    expect(ontleedBlokNommers('   ', MAX).fout).toBeTruthy();
  });

  it('rejects things that are not numbers', () => {
    expect(ontleedBlokNommers('abc', MAX).fout).toBeTruthy();
    expect(ontleedBlokNommers('1.5', MAX).fout).toBeTruthy();
    expect(ontleedBlokNommers('1-2-3', MAX).fout).toBeTruthy();
  });

  it('rejects numbers outside 1..maxId', () => {
    expect(ontleedBlokNommers('0', MAX).fout).toBeTruthy();
    expect(ontleedBlokNommers('4201', MAX).fout).toBeTruthy();
    expect(ontleedBlokNommers('4190-4210', MAX).fout).toBeTruthy();
  });

  it('rejects an inverted range', () => {
    expect(ontleedBlokNommers('300-200', MAX).fout).toBeTruthy();
  });

  it('rejects more than the API will accept in one call', () => {
    expect(ontleedBlokNommers(`1-${MAX_BLOKKE_PER_SLAG}`, MAX).ids.length).toBe(MAX_BLOKKE_PER_SLAG);
    expect(ontleedBlokNommers(`1-${MAX_BLOKKE_PER_SLAG + 1}`, MAX).fout).toBeTruthy();
    // Also across several pieces, not just one oversized range.
    expect(ontleedBlokNommers(`1-400, 1000-1200`, MAX).fout).toBeTruthy();
  });
});

describe('nommersNaReekse', () => {
  it('collapses runs and leaves singles alone', () => {
    expect(nommersNaReekse([1, 2, 3, 7, 9, 10])).toEqual([
      { van: 1, tot: 3 },
      { van: 7, tot: 7 },
      { van: 9, tot: 10 },
    ]);
  });

  it('sorts and dedupes first', () => {
    expect(nommersNaReekse([3, 1, 2, 2])).toEqual([{ van: 1, tot: 3 }]);
  });

  it('handles an empty list', () => {
    expect(nommersNaReekse([])).toEqual([]);
  });

  it('round-trips through ontleedBlokNommers', () => {
    const ids = [1, 2, 3, 50, 90, 91];
    const teks = nommersNaReekse(ids).map(reeksTeks).join(', ');
    expect(teks).toBe('1-3, 50, 90-91');
    expect(ontleedBlokNommers(teks, MAX).ids).toEqual(ids);
  });
});
