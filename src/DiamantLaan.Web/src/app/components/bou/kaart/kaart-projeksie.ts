/**
 * Flattening real coordinates onto a still SVG map.
 *
 * Shared by the whole-road overview and the 100-block strip. Both need the same
 * three things: lat/lng turned into metres, the result turned so the road runs
 * left to right, and OpenStreetMap tiles placed into that same frame.
 */

/** Metres per degree, good enough over the few hundred metres of this road. */
const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LNG = 111320;

/** OpenStreetMap's standard tiles: 256 px square. */
export const TEEL_GROOTTE = 256;

export type LngLat = [number, number];
export type Punt = [number, number];

export interface Teel {
  sleutel: string;
  x: number;
  y: number;
  grootte: number;
  url: string;
}

export interface Venster {
  minX: number;
  minY: number;
  breedte: number;
  hoogte: number;
  viewBox: string;
}

export interface Vlak {
  lat0: number;
  lng0: number;
  kosLat: number;
  cos: number;
  sin: number;
  /** lng/lat to rotated metres, relative to the centre of the input points. */
  project(p: LngLat): Punt;
}

/**
 * Builds the projection for a set of points.
 *
 * `van` and `tot` name the direction that should end up running left to right.
 * Rotating is only a choice of viewing angle, the way you would turn a paper
 * map: the shapes, and so the curve of the road, are untouched.
 */
export function maakVlak(punte: LngLat[], van: LngLat, tot: LngLat): Vlak {
  const lat0 = punte.reduce((s, [, lat]) => s + lat, 0) / punte.length;
  const lng0 = punte.reduce((s, [lng]) => s + lng, 0) / punte.length;
  const kosLat = Math.cos((lat0 * Math.PI) / 180);

  const plat = ([lng, lat]: LngLat): Punt => [
    (lng - lng0) * kosLat * M_PER_DEG_LNG,
    -(lat - lat0) * M_PER_DEG_LAT,
  ];

  const a = plat(van);
  const b = plat(tot);
  const hoek = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const cos = Math.cos(hoek);
  const sin = Math.sin(hoek);

  return {
    lat0, lng0, kosLat, cos, sin,
    project(p: LngLat): Punt {
      const [x, y] = plat(p);
      return [x * cos + y * sin, -x * sin + y * cos];
    },
  };
}

/** Bounding box of already-projected points, with breathing room in metres. */
export function maakVenster(punte: Punt[], padding: number): Venster {
  const xs = punte.map(([x]) => x);
  const ys = punte.map(([, y]) => y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const breedte = Math.max(...xs) - Math.min(...xs) + padding * 2;
  const hoogte = Math.max(...ys) - Math.min(...ys) + padding * 2;
  return { minX, minY, breedte, hoogte, viewBox: `${minX} ${minY} ${breedte} ${hoogte}` };
}

/**
 * The transform that puts tiles into the rotated frame.
 *
 * Web Mercator and the local metre projection are both conformal at this size,
 * so tile pixels differ from metres by a single scale factor. One rigid
 * transform therefore places every tile, and the images stay square against the
 * road instead of being sheared.
 */
export function teelMatriks(vlak: Vlak): string {
  return `matrix(${vlak.cos} ${-vlak.sin} ${vlak.sin} ${vlak.cos} 0 0)`;
}

/**
 * Grows a window about its centre until it matches the given width:height.
 *
 * Without this the SVG viewBox and the box it is drawn in disagree, and
 * `preserveAspectRatio` letterboxes the difference: bare wedges of background
 * down the sides, exactly where the tiles stop.
 */
export function normaliseerAspek(v: Venster, aspek: number): Venster {
  const huidig = v.breedte / v.hoogte;
  if (Math.abs(huidig - aspek) < 1e-6) return v;

  const breedte = huidig < aspek ? v.hoogte * aspek : v.breedte;
  const hoogte = huidig < aspek ? v.hoogte : v.breedte / aspek;
  const minX = v.minX - (breedte - v.breedte) / 2;
  const minY = v.minY - (hoogte - v.hoogte) / 2;
  return { minX, minY, breedte, hoogte, viewBox: `${minX} ${minY} ${breedte} ${hoogte}` };
}

/**
 * The tile zoom that renders roughly one tile pixel per screen pixel.
 *
 * Clamped to 19 because OpenStreetMap publishes nothing sharper, and to 16 so a
 * wide view never asks for a comically coarse tile.
 */
export function zoomVir(vlak: Vlak, breedteM: number, skermBreedtePx = 760): number {
  const gewens = (156543.03392 * vlak.kosLat * skermBreedtePx) / Math.max(breedteM, 1);
  // Rounding down rather than up: one level coarser is barely softer, but it
  // quarters the number of tiles fetched, which matters on a shared tile server.
  return Math.min(19, Math.max(16, Math.floor(Math.log2(gewens))));
}

/**
 * Every tile needed to cover the window, at the given zoom.
 *
 * `marge` adds a ring of extra tiles. The window is rotated relative to the
 * tile grid, so a view that is exactly covered on paper can still show bare
 * corners once rounding is in play; one spare ring costs a few requests and
 * removes the whole class of problem.
 */
export function teelsVir(vlak: Vlak, v: Venster, zoom: number, marge = 1): Teel[] {
  const mPerPx = (156543.03392 * vlak.kosLat) / Math.pow(2, zoom);
  const [px0, py0] = wereldPixel(vlak.lat0, vlak.lng0, zoom);
  const grootte = TEEL_GROOTTE * mPerPx;

  // Un-rotate the visible corners: tiles live in the unrotated frame.
  const hoeke: Punt[] = [
    [v.minX, v.minY], [v.minX + v.breedte, v.minY],
    [v.minX, v.minY + v.hoogte], [v.minX + v.breedte, v.minY + v.hoogte],
  ];
  const terug = hoeke.map(([x, y]): Punt => [
    x * vlak.cos - y * vlak.sin,
    x * vlak.sin + y * vlak.cos,
  ]);

  const index = (m: number, oorsprong: number) =>
    Math.floor((oorsprong + m / mPerPx) / TEEL_GROOTTE);
  const vanX = index(Math.min(...terug.map(p => p[0])), px0) - marge;
  const totX = index(Math.max(...terug.map(p => p[0])), px0) + marge;
  const vanY = index(Math.min(...terug.map(p => p[1])), py0) - marge;
  const totY = index(Math.max(...terug.map(p => p[1])), py0) + marge;

  const uit: Teel[] = [];
  for (let tx = vanX; tx <= totX; tx++) {
    for (let ty = vanY; ty <= totY; ty++) {
      uit.push({
        sleutel: `${zoom}/${tx}/${ty}`,
        x: (tx * TEEL_GROOTTE - px0) * mPerPx,
        y: (ty * TEEL_GROOTTE - py0) * mPerPx,
        grootte,
        url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
      });
    }
  }
  return uit;
}

/** Web Mercator world pixel coordinates at a given zoom. */
function wereldPixel(lat: number, lng: number, zoom: number): Punt {
  const n = TEEL_GROOTTE * Math.pow(2, zoom);
  const s = Math.sin((lat * Math.PI) / 180);
  return [
    ((lng + 180) / 360) * n,
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n,
  ];
}
