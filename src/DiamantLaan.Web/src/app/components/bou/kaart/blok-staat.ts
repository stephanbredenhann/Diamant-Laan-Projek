import { Square } from '../../../models/square';
import { blokRede } from './blok-reekse';

/**
 * What one block looks like to the visitor, independent of how it is drawn.
 *
 * Two views render the same hundred blocks: the road-shaped strip on a wide
 * screen, and a plain grid on a phone. They must agree on colour, wording and
 * what may be clicked, so that lives here rather than in either of them.
 */

export type BlokKlas = 'beskikbaar' | 'gekies' | 'verkoop' | 'onbeskikbaar';

export interface BlokStaat {
  id: number;
  klas: BlokKlas;
  kiesbaar: boolean;
  etiket: string;
}

export function blokState(
  van: number,
  tot: number,
  squares: Square[],
  selectedIds: number[],
): BlokStaat[] {
  const byId = new Map(squares.map(s => [s.id, s]));
  const gekies = new Set(selectedIds);

  const uit: BlokStaat[] = [];
  for (let id = van; id <= tot; id++) {
    uit.push(staatVir(id, byId.get(id), gekies.has(id)));
  }
  return uit;
}

export function staatVir(id: number, sq: Square | undefined, isGekies: boolean): BlokStaat {
  const rede = blokRede(id, sq);
  const klas: BlokKlas = isGekies ? 'gekies' : (rede ?? 'beskikbaar');
  return { id, klas, kiesbaar: rede === null, etiket: etiketVir(id, klas) };
}

function etiketVir(id: number, klas: BlokKlas): string {
  switch (klas) {
    case 'gekies': return `Blok ${id}, gekies`;
    case 'verkoop': return `Blok ${id}, reeds verkoop`;
    case 'onbeskikbaar': return `Blok ${id}, nie beskikbaar nie`;
    default: return `Blok ${id}, beskikbaar`;
  }
}
