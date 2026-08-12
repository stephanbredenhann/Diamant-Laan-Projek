import { Component, computed, input, output } from '@angular/core';
import { Square } from '../../../models/square';
import { getSquarePolygons } from '../../shared/road-map/road-geometry';
import { BlokStaat, staatVir } from './blok-staat';
import { LngLat, maakVenster, maakVlak } from './kaart-projeksie';

/** Breathing room around the strip, in metres. */
const PADDING_M = 1.2;

interface StrookBlok extends BlokStaat {
  punte: string;
  cx: number;
  cy: number;
  merk: string;
}

/**
 * One 100-block stretch of road, drawn flat and still.
 *
 * The outlines are the same real trapezoids the Leaflet map uses, so the curve
 * of the road is genuine. There is no aerial layer here: seventeen metres is
 * far past what OpenStreetMap has detail for, and the overview band above
 * already answers "where am I?" without blurring anything. Two other things are
 * deliberately absent, dragging and zooming, because losing your place on the
 * map is the single worst thing that can happen to a visitor halfway through
 * paying.
 *
 * Every block is a real focusable element, not a canvas hit-test, so the whole
 * strip can be worked through with nothing but the Tab and Enter keys.
 */
@Component({
  selector: 'app-blok-strook',
  standalone: true,
  template: `
    <svg
      class="strook"
      [attr.viewBox]="viewBox()"
      role="group"
      [attr.aria-label]="'Blokke ' + van() + ' tot ' + tot()"
      preserveAspectRatio="xMidYMid meet"
    >
      @for (b of blokke(); track b.id) {
        <g
          [class]="'blok ' + b.klas"
          [class.beklemtoon]="beklemtoon() === b.id"
          [attr.tabindex]="b.kiesbaar ? 0 : null"
          [attr.role]="b.kiesbaar ? 'button' : null"
          [attr.aria-pressed]="b.klas === 'gekies' ? true : (b.kiesbaar ? false : null)"
          [attr.aria-label]="b.etiket"
          (click)="kies(b)"
          (keydown.enter)="kies(b); $event.preventDefault()"
          (keydown.space)="kies(b); $event.preventDefault()"
        >
          <polygon [attr.points]="b.punte" />
          @if (b.klas !== 'onbeskikbaar') {
            <text [attr.x]="b.cx" [attr.y]="b.cy">{{ b.id }}</text>
          }
          @if (b.klas === 'gekies') {
            <polyline class="tiek" [attr.points]="b.merk" />
          }
        </g>
      }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    .strook {
      display: block;
      width: 100%;
      height: auto;
      max-height: 62vh;
      /* No panning, no pinch-zoom: the strip is the whole view, on purpose. */
      touch-action: manipulation;
    }
    .blok polygon {
      stroke: var(--surface);
      stroke-width: 0.06;
      stroke-linejoin: round;
      transition: fill 0.12s ease;
    }
    .blok text {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.42px;
      text-anchor: middle;
      dominant-baseline: central;
      pointer-events: none;
      user-select: none;
    }

    .beskikbaar polygon { fill: var(--blok-beskikbaar); }
    .beskikbaar text { fill: var(--ink); }
    .beskikbaar { cursor: pointer; }
    .beskikbaar:hover polygon { fill: #C4B08C; }

    .gekies polygon {
      fill: var(--blok-gekies);
      stroke: var(--ink);
      stroke-width: 0.16;
    }
    .gekies text { fill: #FFFFFF; }
    .gekies { cursor: pointer; }
    /* Green alone is not a signal a red-green colour-blind visitor can read,
       so a chosen block also carries a heavy border and a tick. */
    .tiek {
      fill: none;
      stroke: #FFFFFF;
      stroke-width: 0.11;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .verkoop polygon { fill: var(--blok-verkoop); }
    .verkoop text { fill: #FFFFFF; }
    .verkoop { cursor: not-allowed; }

    .onbeskikbaar polygon { fill: var(--blok-onbeskikbaar); }
    .onbeskikbaar { cursor: not-allowed; }

    .blok:focus { outline: none; }
    .blok:focus-visible polygon {
      stroke: var(--ob-yellow);
      stroke-width: 0.2;
    }

    .beklemtoon polygon {
      stroke: var(--ob-blue);
      stroke-width: 0.22;
      animation: blok-flits 1.1s ease-in-out 3;
    }
    @keyframes blok-flits {
      0%, 100% { stroke-opacity: 1; }
      50% { stroke-opacity: 0.15; }
    }
    @media (prefers-reduced-motion: reduce) {
      .beklemtoon polygon { animation: none; }
      .blok polygon { transition: none; }
    }
  `]
})
export class BlokStrookComponent {
  readonly van = input.required<number>();
  readonly tot = input.required<number>();
  readonly squares = input<Square[]>([]);
  readonly selectedIds = input<number[]>([]);
  /** Block to flash after a search hit. */
  readonly beklemtoon = input<number | null>(null);

  readonly blokGekliek = output<number>();

  private readonly meetkunde = computed(() => {
    const polygons = getSquarePolygons(this.van(), this.tot());
    if (polygons.length === 0) return null;

    const hoeke = (ring: LngLat[]) => ring.slice(0, 4);
    const middelLngLat = (ring: LngLat[]): LngLat => [
      hoeke(ring).reduce((s, [lng]) => s + lng, 0) / 4,
      hoeke(ring).reduce((s, [, lat]) => s + lat, 0) / 4,
    ];

    // The direction is averaged over a full road row at each end: block ids run
    // across the road before they run along it, so a single first-to-last line
    // would tilt the strip by the width of the road.
    const ryMiddel = (deel: typeof polygons): LngLat => {
      const punte = deel.map(p => middelLngLat(p.ring));
      return [
        punte.reduce((s, [lng]) => s + lng, 0) / punte.length,
        punte.reduce((s, [, lat]) => s + lat, 0) / punte.length,
      ];
    };
    const ry = Math.min(6, polygons.length);
    const vlak = maakVlak(
      polygons.flatMap(p => hoeke(p.ring)),
      ryMiddel(polygons.slice(0, ry)),
      ryMiddel(polygons.slice(-ry)),
    );

    const vorms = polygons.map(p => {
      const punte = hoeke(p.ring).map(c => vlak.project(c));
      const xs = punte.map(([x]) => x);
      const ys = punte.map(([, y]) => y);
      return {
        id: p.id,
        punte,
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        cx: xs.reduce((s, x) => s + x, 0) / 4,
        cy: ys.reduce((s, y) => s + y, 0) / 4,
      };
    });

    const venster = maakVenster(vorms.flatMap(v => v.punte), PADDING_M);
    return { vorms, vlak, venster };
  });

  readonly viewBox = computed(() => this.meetkunde()?.venster.viewBox ?? '0 0 1 1');

  readonly blokke = computed<StrookBlok[]>(() => {
    const g = this.meetkunde();
    if (!g) return [];

    const byId = new Map(this.squares().map(s => [s.id, s]));
    const gekies = new Set(this.selectedIds());

    return g.vorms.map(v => ({
      ...staatVir(v.id, byId.get(v.id), gekies.has(v.id)),
      punte: v.punte.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' '),
      cx: v.cx,
      cy: v.cy,
      merk: tiekPunte(v.minX, v.minY),
    }));
  });

  kies(b: StrookBlok) {
    if (!b.kiesbaar) return;
    this.blokGekliek.emit(b.id);
  }
}

/** A small tick tucked into the block's top-left corner. */
function tiekPunte(minX: number, minY: number): string {
  const x = minX + 0.16;
  const y = minY + 0.26;
  return `${x},${y} ${x + 0.12},${y + 0.14} ${x + 0.34},${y - 0.16}`;
}

