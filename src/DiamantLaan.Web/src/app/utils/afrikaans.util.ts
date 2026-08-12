/**
 * Afrikaans wording helpers.
 *
 * Two vocabularies exist on purpose. The database, the admin screens and the
 * map speak of a "blok", because that is what the records are. Donor-facing
 * screens speak of a "vierkante meter" of road, which is the thing a donor
 * actually pays for and is far more concrete for a first-time visitor.
 */

/** Internal/admin wording: 1 blok, 2 blokke. */
export function blokLabel(count: number): string {
  return count === 1 ? 'blok' : 'blokke';
}

/**
 * Donor-facing wording. Afrikaans does not pluralise a unit of measure after a
 * numeral, so it stays "vierkante meter" for every count — never "meters".
 */
export function meterLabel(_count: number): string {
  return 'vierkante meter';
}

/** e.g. "1 vierkante meter", "5 vierkante meter". */
export function meterFrase(count: number): string {
  return `${count} ${meterLabel(count)}`;
}

/** Compact form for tight spaces: "5 m²". */
export function meterKort(count: number): string {
  return `${count} m²`;
}

/** A space as the thousands separator, per Afrikaans convention: "2 500". */
export function nommer(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Rand with a space as the thousands separator, per Afrikaans convention: "R2 500". */
export function randBedrag(amount: number): string {
  return `R${nommer(amount)}`;
}
