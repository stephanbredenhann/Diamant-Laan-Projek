import { Square } from '../../../models/square';
import { Reeks } from '../../../utils/blok-nommers';

/**
 * How the 4200 blocks are cut into the picker's two levels of ranges.
 *
 * Plain functions on purpose: the arithmetic is the part most likely to be got
 * wrong, and it is far easier to prove correct without an Angular harness.
 */

export const MAX_BLOK_ID = 4200;

/** Blocks per level-1 button. */
export const GROEP_GROOTTE = 1000;

/** Blocks per level-2 button, and so per map section. */
export const SEKSIE_GROOTTE = 100;

export type { Reeks };

export function reeksSleutel(r: Reeks): string {
  return `${r.van}-${r.tot}`;
}

/**
 * The level-1 ranges: 1-1000, 1001-2000, 2001-3000, 3001-4200.
 *
 * The trailing 200 blocks join the last group rather than forming a stub of
 * their own, so the visitor never faces a button covering a fifth of a screen's
 * worth of road.
 */
export function groepe(): Reeks[] {
  const out: Reeks[] = [];
  for (let van = 1; van <= MAX_BLOK_ID; van += GROEP_GROOTTE) {
    const tot = van + GROEP_GROOTTE - 1;
    const restant = MAX_BLOK_ID - tot;
    // Fold a leftover shorter than a full group into this one.
    if (restant > 0 && restant < GROEP_GROOTTE) {
      out.push({ van, tot: MAX_BLOK_ID });
      break;
    }
    out.push({ van, tot: Math.min(tot, MAX_BLOK_ID) });
  }
  return out;
}

/** The level-2 ranges inside a group: ten of 100, twelve for the last group. */
export function seksies(groep: Reeks): Reeks[] {
  const out: Reeks[] = [];
  for (let van = groep.van; van <= groep.tot; van += SEKSIE_GROOTTE) {
    out.push({ van, tot: Math.min(van + SEKSIE_GROOTTE - 1, groep.tot) });
  }
  return out;
}

/** Which group and section a block number falls in, or null if it is not a block. */
export function seksieVan(id: number): { groep: Reeks; seksie: Reeks } | null {
  if (!Number.isFinite(id) || id < 1 || id > MAX_BLOK_ID) return null;

  const groep = groepe().find(g => id >= g.van && id <= g.tot);
  if (!groep) return null;

  const seksie = seksies(groep).find(s => id >= s.van && id <= s.tot);
  if (!seksie) return null;

  return { groep, seksie };
}

/**
 * Why a block cannot be picked, or null when it can be.
 *
 * The picker shows all three states, so callers need the reason and not just a
 * boolean: sold blocks keep their number in red, unavailable ones go black and
 * blank.
 */
export type BlokRede = 'onbeskikbaar' | 'verkoop';

export function blokRede(id: number, sq: Square | undefined): BlokRede | null {
  if (id < 1 || id > MAX_BLOK_ID) return 'onbeskikbaar';
  if (sq?.isReserved) return 'onbeskikbaar';
  if (sq?.isSold) return 'verkoop';
  return null;
}

export function isBeskikbaar(id: number, sq: Square | undefined): boolean {
  return blokRede(id, sq) === null;
}

/** How many blocks in a range are still free to pick. */
export function telBeskikbaar(reeks: Reeks, byId: Map<number, Square>): number {
  let n = 0;
  for (let id = reeks.van; id <= reeks.tot; id++) {
    if (isBeskikbaar(id, byId.get(id))) n++;
  }
  return n;
}
