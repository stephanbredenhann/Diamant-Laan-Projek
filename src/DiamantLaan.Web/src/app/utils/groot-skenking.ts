/**
 * The arithmetic behind the Groot skenking page: rand typed by an admin, the blocks that buys,
 * and the typed confirmation. Plain functions, like blok-nommers.ts, so a mistake that would
 * sell the wrong thousand blocks is caught by a spec rather than by a donor.
 */

/** Matches AdminDonationController.PricePerSquare. */
export const BLOK_PRYS = 500;

export interface BedragUitslag {
  /** In rand. 0 when `fout` is set. */
  bedrag: number;
  blokke: number;
  fout: string | null;
}

/**
 * Reads "700 000", "R700000" or "R 700 000" into rand and a block count. Only whole rand: a
 * comma is a decimal separator in Afrikaans and a thousands separator in English, so guessing
 * which one the admin meant is exactly the wrong thing to do with R700 000.
 */
export function blokkeVirBedrag(teks: string, maksBlokke: number): BedragUitslag {
  const skoon = teks.replace(/^\s*R/i, '').replace(/[\s ]/g, '');
  if (!skoon) return misluk('Voer die bedrag in.');
  if (!/^\d+$/.test(skoon)) return misluk('Tik die bedrag in hele rand, net syfers (bv. 700 000).');

  const bedrag = Number(skoon);
  if (bedrag <= 0) return misluk('Die bedrag moet meer as R0 wees.');
  if (bedrag % BLOK_PRYS !== 0) {
    const onder = Math.floor(bedrag / BLOK_PRYS) * BLOK_PRYS;
    return misluk(
      `Die bedrag moet ’n veelvoud van R${BLOK_PRYS} wees. Naaste: ${formatRand(onder)} of ${formatRand(onder + BLOK_PRYS)}.`
    );
  }

  const blokke = bedrag / BLOK_PRYS;
  if (blokke > maksBlokke) {
    return misluk(`’n Skenking kan hoogstens ${maksBlokke} blokke (${formatRand(maksBlokke * BLOK_PRYS)}) dek.`);
  }

  return { bedrag, blokke, fout: null };
}

/**
 * True only when the admin typed the exact block count. Spaces are forgiven ("1 400"); nothing
 * else is, so "140" or "14000" never confirms a 1 400-block donation.
 */
export function bevestigingPas(getik: string, blokke: number): boolean {
  if (blokke <= 0) return false;
  return getik.replace(/[\s ]/g, '') === String(blokke);
}

/** R700000 becomes "R700 000", the way the amount is written everywhere else on the site. */
export function formatRand(bedrag: number): string {
  return 'R' + String(Math.round(bedrag)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * The idempotency key for one confirmation screen. randomUUID needs a secure context, which
 * production always is; the fallback is for an admin poking at a LAN address in development.
 */
export function nuweSleutel(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function misluk(fout: string): BedragUitslag {
  return { bedrag: 0, blokke: 0, fout };
}
