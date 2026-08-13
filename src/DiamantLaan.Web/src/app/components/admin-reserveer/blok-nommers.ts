/**
 * Turning what an admin types into a list of block numbers, and back again.
 *
 * Plain functions on purpose: this is the only fiddly logic on the Reserveer page
 * and it is far easier to prove correct without an Angular harness.
 */

/** Matches BulkReserveDto.SquareIds in the API. */
export const MAX_BLOKKE_PER_SLAG = 500;

export interface BlokNommersUitslag {
  ids: number[];
  fout: string | null;
}

/**
 * Reads "1-199, 250, 300 - 310" into a sorted, deduped list of block numbers.
 *
 * Commas, spaces and newlines all separate. A hyphen inside a piece makes it a range.
 */
export function ontleedBlokNommers(teks: string, maxId: number): BlokNommersUitslag {
  // Collapse spaces around a hyphen first, so "300 - 302" stays one range.
  const stukke = teks.replace(/\s*-\s*/g, '-').split(/[\s,]+/).filter(s => s.length > 0);
  if (stukke.length === 0) return { ids: [], fout: 'Voer eers bloknommers in.' };

  const gevind = new Set<number>();

  for (const stuk of stukke) {
    const dele = stuk.split('-');
    if (dele.length > 2) return fout(stuk);

    const van = heelGetal(dele[0]);
    const tot = dele.length === 2 ? heelGetal(dele[1]) : van;
    if (van === null || tot === null) return fout(stuk);

    if (van < 1 || tot > maxId) {
      return { ids: [], fout: `Bloknommers moet tussen 1 en ${maxId} wees. Kyk na "${stuk}".` };
    }
    if (van > tot) {
      return { ids: [], fout: `"${stuk}" loop agteruit. Skryf die kleiner nommer eerste.` };
    }
    if (tot - van + 1 > MAX_BLOKKE_PER_SLAG) return teVeel();

    for (let id = van; id <= tot; id++) {
      gevind.add(id);
      if (gevind.size > MAX_BLOKKE_PER_SLAG) return teVeel();
    }
  }

  return { ids: [...gevind].sort((a, b) => a - b), fout: null };
}

/** The inverse: [1,2,3,7] becomes "1-3, 7". Used to keep the reserved list readable. */
export function nommersNaReekse(ids: number[]): { van: number; tot: number }[] {
  const gesorteer = [...new Set(ids)].sort((a, b) => a - b);
  const out: { van: number; tot: number }[] = [];

  for (const id of gesorteer) {
    const laaste = out[out.length - 1];
    if (laaste && id === laaste.tot + 1) laaste.tot = id;
    else out.push({ van: id, tot: id });
  }

  return out;
}

export function reeksTeks(r: { van: number; tot: number }): string {
  return r.van === r.tot ? `${r.van}` : `${r.van}-${r.tot}`;
}

function heelGetal(s: string | undefined): number | null {
  if (s === undefined || !/^\d+$/.test(s)) return null;
  return Number(s);
}

function fout(stuk: string): BlokNommersUitslag {
  return { ids: [], fout: `"${stuk}" is nie ’n geldige bloknommer of reeks nie.` };
}

function teVeel(): BlokNommersUitslag {
  return { ids: [], fout: `Hoogstens ${MAX_BLOKKE_PER_SLAG} blokke op ’n slag. Deel dit op in kleiner stukke.` };
}
