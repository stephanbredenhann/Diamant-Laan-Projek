import { Component, computed, input } from '@angular/core';
import { WAYPOINTS } from '../../map/map-segments';
import { ROAD_WIDTH, getSquareCentroid } from '../../shared/road-map/road-geometry';
import { MAX_BLOK_ID, Reeks } from './blok-reekse';
import {
  LngLat, maakVenster, maakVlak, normaliseerAspek, teelMatriks, teelsVir, zoomVir,
} from './kaart-projeksie';

/**
 * Default shape of the panel. The road turns through most of a right angle, so
 * a narrow letterbox could never frame a whole thousand-block group: its height
 * alone would fill the band. A near-16:9 panel leaves room to close in.
 *
 * Callers override it where the panel is wide rather than tall, which is the
 * only reason this is a knob at all: the viewBox and the CSS box must agree
 * exactly or `preserveAspectRatio` letterboxes the difference.
 */
const ASPEK = 16 / 9;

/** Padding around the whole road, in metres. */
const PADDING_M = 40;

/** Never zoom tighter than this across; below it the tiles have no more detail. */
const MIN_SPAN_M = 55;

/** Context to keep around a marked stretch, as a fraction of its own length. */
const KONTEKS = 0.22;

/** Roughly how many points to trace a highlighted stretch with. */
const MONSTER = 40;

/** Which row of the road a block sits in. Rows are six blocks wide. */
function ry(id: number): number {
  return Math.floor((id - 1) / ROAD_WIDTH);
}

/** Centre of the tar for one row: the midpoint of its two middle blocks. */
function ryMiddel(n: number): LngLat | null {
  const links = getSquareCentroid(n * ROAD_WIDTH + 3);
  const regs = getSquareCentroid(n * ROAD_WIDTH + 4);
  if (!links || !regs) return null;
  return [(links.lng + regs.lng) / 2, (links.lat + regs.lat) / 2];
}

/**
 * The whole 700 m road at a glance, with the stretch you are looking at marked.
 *
 * Drilling from a thousand blocks down to a hundred loses all sense of place:
 * seventeen metres of tar looks the same anywhere. This band is the answer to
 * "where am I?" and it stays on screen at every level of the drill-down.
 */
@Component({
  selector: 'app-pad-oorsig',
  standalone: true,
  template: `
    <figure class="oorsig">
      <svg
        [attr.viewBox]="viewBox()"
        role="img"
        [attr.aria-label]="etiket()"
        [style.aspect-ratio]="aspek()"
        preserveAspectRatio="xMidYMid meet"
      >
        <g class="teels" [attr.transform]="teelTransform()" aria-hidden="true">
          @for (t of teels(); track t.sleutel) {
            <image
              [attr.href]="t.url"
              [attr.x]="t.x"
              [attr.y]="t.y"
              [attr.width]="t.grootte"
              [attr.height]="t.grootte"
              crossorigin="anonymous"
            />
          }
        </g>
        <polyline class="pad-omtrek" [attr.points]="padLyn()" />
        <polyline class="pad" [attr.points]="padLyn()" />
        @if (merkLyn(); as m) {
          <polyline class="merk" [attr.points]="m" />
        }
        @if (merkPunt(); as p) {
          <circle class="speld" [attr.cx]="p[0]" [attr.cy]="p[1]" [attr.r]="speldR()" />
        }
      </svg>
      <figcaption>
        {{ etiket() }}
        <span class="erkenning">
          Kaartdata &copy;
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-bydraers
        </span>
      </figcaption>
    </figure>
  `,
  styles: [`
    :host { display: block; }
    /* No width cap of its own: beside the buttons the grid track sizes it, and
       stacked above the blocks it should line up with them edge to edge. */
    .oorsig {
      margin: 0;
      background: var(--bg-chalk);
      border: 1px solid var(--border-soft);
      padding: 0.75rem;
    }
    /* aspect-ratio is bound from the aspek input, matching the viewBox exactly,
       so the map fills the panel edge to edge with no letterboxed gaps. */
    svg {
      display: block;
      width: 100%;
      background: var(--surface-sand);
    }
    .teels image { opacity: 0.85; }
    /* Non-scaling strokes: the road keeps a readable thickness on screen no
       matter how the band is scaled to fit. */
    .pad-omtrek, .pad, .merk {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .pad-omtrek { stroke: #FFFFFF; stroke-width: 9; opacity: 0.9; }
    .pad { stroke: var(--tar); stroke-width: 5; }
    .merk { stroke: var(--action-strong); stroke-width: 7; }
    .speld {
      fill: var(--action-strong);
      stroke: #FFFFFF;
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
    }
    figcaption {
      margin-top: 0.5rem;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: var(--fs-base);
      color: var(--text-muted);
      text-align: center;
    }
    /* OpenStreetMap's licence requires this credit stays visible wherever the
       tiles are, so it lives with them rather than in the page around them. */
    .erkenning {
      display: block;
      margin-top: 0.2rem;
      font-family: var(--font-body);
      font-weight: 400;
      font-size: 0.75rem;
    }
  `]
})
export class PadOorsigComponent {
  /** The stretch to mark, or null to show the road on its own. */
  readonly merk = input<Reeks | null>(null);

  /** Width:height of the panel. Drives the viewBox and the CSS box together. */
  readonly aspek = input(ASPEK);

  private readonly vlak = computed(() => {
    const punte = WAYPOINTS.map(w => [w.lng, w.lat] as LngLat);
    return maakVlak(punte, punte[0], punte[punte.length - 1]);
  });

  private readonly geprojekteer = computed(() =>
    WAYPOINTS.map(w => this.vlak().project([w.lng, w.lat])));

  /**
   * Tightens as the visitor drills in: the whole road, then the thousand, then
   * the hundred. The orientation never changes, so each step reads as zooming
   * into the same map rather than jumping to a new one.
   */
  private readonly venster = computed(() => {
    const stuk = this.merkPunte();
    if (stuk.length === 0) {
      return normaliseerAspek(maakVenster(this.geprojekteer(), PADDING_M), this.aspek());
    }

    const styf = maakVenster(stuk, 0);
    const span = Math.max(styf.breedte, styf.hoogte);
    const ruim = maakVenster(stuk, Math.max((MIN_SPAN_M - span) / 2, span * KONTEKS));
    return normaliseerAspek(ruim, this.aspek());
  });

  readonly viewBox = computed(() => this.venster().viewBox);
  readonly teelTransform = computed(() => teelMatriks(this.vlak()));
  readonly teels = computed(() => {
    const v = this.venster();
    return teelsVir(this.vlak(), v, zoomVir(this.vlak(), v.breedte));
  });

  readonly padLyn = computed(() =>
    this.geprojekteer().map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));

  /**
   * Centre-line of the marked stretch, traced row by row along the real road.
   *
   * Sampling block centroids directly does not work: ids run across the road
   * before they run along it, so consecutive samples can sit in different lanes
   * and the line hooks sideways by the road's full six metres. Rows are the
   * honest unit here, and averaging the two middle blocks of each row puts the
   * trace down the centre of the tar rather than along one edge of it.
   */
  private readonly merkPunte = computed(() => {
    const r = this.merk();
    if (!r) return [];

    const eersteRy = ry(r.van);
    const laasteRy = ry(Math.min(r.tot, MAX_BLOK_ID));
    const stap = Math.max(1, Math.ceil((laasteRy - eersteRy + 1) / MONSTER));

    const rye: number[] = [];
    for (let n = eersteRy; n <= laasteRy; n += stap) rye.push(n);
    if (rye[rye.length - 1] !== laasteRy) rye.push(laasteRy);

    const uit: [number, number][] = [];
    for (const n of rye) {
      const p = ryMiddel(n);
      if (p) uit.push(this.vlak().project(p));
    }
    return uit;
  });

  readonly merkLyn = computed(() => {
    const p = this.merkPunte();
    // A short stretch is a dot, not a line; the pin carries it instead.
    return p.length < 2 ? null : p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  });

  readonly merkPunt = computed(() => {
    const p = this.merkPunte();
    return p.length === 0 ? null : p[Math.floor(p.length / 2)];
  });

  /** Pin radius as a fraction of the view, so it reads at any band size. */
  readonly speldR = computed(() => this.venster().breedte * 0.012);

  readonly etiket = computed(() => {
    const r = this.merk();
    return r
      ? `Oewerpad: blokke ${r.van} tot ${r.tot} is hier gemerk`
      : 'Oewerpad, die hele roete';
  });
}
