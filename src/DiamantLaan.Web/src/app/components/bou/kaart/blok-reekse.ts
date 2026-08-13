import { Square } from '../../../models/square';
import { Reeks } from '../../../utils/blok-nommers';

/**
 * How the 4000 blocks are cut into the picker's sections of a hundred.
 *
 * Plain functions on purpose: the arithmetic is the part most likely to be got
 * wrong, and it is far easier to prove correct without an Angular harness.
 */

export const MAX_BLOK_ID = 4000;

/** Blocks per section, and so per page of the picker. */
export const SEKSIE_GROOTTE = 100;

export type { Reeks };

export function reeksSleutel(r: Reeks): string {
  return `${r.van}-${r.tot}`;
}

/** Every section, 1-100 through 3901-4000. */
export function alleSeksies(): Reeks[] {
  const out: Reeks[] = [];
  for (let van = 1; van <= MAX_BLOK_ID; van += SEKSIE_GROOTTE) {
    out.push({ van, tot: Math.min(van + SEKSIE_GROOTTE - 1, MAX_BLOK_ID) });
  }
  return out;
}

/** Which section a block number falls in, or null if it is not a block. */
export function seksieVan(id: number): Reeks | null {
  if (!Number.isFinite(id) || id < 1 || id > MAX_BLOK_ID) return null;

  const van = Math.floor((id - 1) / SEKSIE_GROOTTE) * SEKSIE_GROOTTE + 1;
  return { van, tot: Math.min(van + SEKSIE_GROOTTE - 1, MAX_BLOK_ID) };
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
