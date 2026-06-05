# OSM Map Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded SVG grid in `road-map.component.ts` with a Leaflet.js map using OpenStreetMap tiles, with 4,200 colored 1m² squares overlaid as GeoJSON polygons on real-world geography.

**Architecture:** Add `leaflet` dependency, create `coordinate-config.ts` with geographic math (bearing, destination-point, square-to-polygon), add waypoints to `map-segments.ts`, and rewrite `road-map.component.ts` to use Leaflet instead of SVG. External Input/Output contract of `RoadMapComponent` stays unchanged.

**Tech Stack:** Angular 19, Leaflet 1.x, TypeScript, GeoJSON, OpenStreetMap tiles

---

### Task 1: Install Leaflet dependency

**Files:**
- Modify: `src/DiamantLaan.Web/package.json`
- Modify: `src/DiamantLaan.Web/angular.json`

- [ ] **Step 1: Add leaflet and @types/leaflet to package.json**

Add to `dependencies`:
```json
"leaflet": "^1.9.4",
```

Add to `devDependencies`:
```json
"@types/leaflet": "^1.9.8",
```

The updated dependencies section:
```json
"dependencies": {
  "@angular/common": "^19.2.0",
  "@angular/compiler": "^19.2.0",
  "@angular/core": "^19.2.0",
  "@angular/forms": "^19.2.0",
  "@angular/platform-browser": "^19.2.0",
  "@angular/platform-browser-dynamic": "^19.2.0",
  "@angular/router": "^19.2.0",
  "leaflet": "^1.9.4",
  "rxjs": "~7.8.0",
  "tslib": "^2.3.0",
  "zone.js": "~0.15.0"
},
"devDependencies": {
  "@angular-devkit/build-angular": "^19.2.22",
  "@angular/cli": "^19.2.22",
  "@angular/compiler-cli": "^19.2.0",
  "@types/jasmine": "~5.1.0",
  "@types/leaflet": "^1.9.8",
  "jasmine-core": "~5.6.0",
  "karma": "~6.4.0",
  "karma-chrome-launcher": "~3.2.0",
  "karma-coverage": "~2.2.0",
  "karma-jasmine": "~5.1.0",
  "karma-jasmine-html-reporter": "~2.1.0",
  "typescript": "~5.7.2"
}
```

- [ ] **Step 2: Add Leaflet CSS to angular.json styles array**

Add `"node_modules/leaflet/dist/leaflet.css"` as the first entry in the `styles` array in both the `build` and `test` sections:

In `projects.DiamantLaan.Web.architect.build.options.styles`:
```json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
  "src/styles.scss"
]
```

In `projects.DiamantLaan.Web.architect.test.options.styles`:
```json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
  "src/styles.scss"
]
```

- [ ] **Step 3: Install packages**

Run: `npm install` in `src/DiamantLaan.Web`

Expected: Successful install of leaflet and @types/leaflet

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Web/package.json src/DiamantLaan.Web/package-lock.json src/DiamantLaan.Web/angular.json
git commit -m "chore: add leaflet and @types/leaflet dependencies"
```

---

### Task 2: Add waypoint configuration to map-segments.ts

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/components/map/map-segments.ts`

- [ ] **Step 1: Add Waypoint interface and WAYPOINTS array**

Add after the `SegmentDef` interface and before the `SEGMENTS` array:

```typescript
export interface Waypoint {
  label: string;   // human-readable description
  lat: number;
  lng: number;
}

// Six waypoints defining the road path through 5 segments.
// Seg1 start → Seg1 end/Seg2 start → Seg2 end/Seg3 start →
// Seg3 end/Seg4 start → Seg4 end/Seg5 start → Seg5 end.
// UPDATE THESE with real coordinates provided by the user.
export const WAYPOINTS: Waypoint[] = [
  { label: 'Seg1 start (Reguit 130m)', lat: 0, lng: 0 },
  { label: 'Seg1 end / Seg2 start',    lat: 0, lng: 0 },
  { label: 'Seg2 end / Seg3 start',    lat: 0, lng: 0 },
  { label: 'Seg3 end / Seg4 start',    lat: 0, lng: 0 },
  { label: 'Seg4 end / Seg5 start',    lat: 0, lng: 0 },
  { label: 'Seg5 end (Reguit 290m)',   lat: 0, lng: 0 },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/DiamantLaan.Web/src/app/components/map/map-segments.ts
git commit -m "feat: add waypoint interface and placeholder coordinates to map-segments"
```

---

### Task 3: Create coordinate-config.ts — geographic math and square-to-polygon generation

**Files:**
- Create: `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts`

- [ ] **Step 1: Write the complete coordinate-config.ts file**

```typescript
import * as L from 'leaflet';
import { Square } from '../../../models/square';
import { SEGMENTS, SegmentDef, WAYPOINTS, Waypoint } from '../../map/map-segments';

const EARTH_RADIUS_M = 6371000;
const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;

/** Bearing in degrees from (lat1,lng1) to (lat2,lng2). Result 0–360 (0 = North). */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * TO_RAD;
  const φ1 = lat1 * TO_RAD;
  const φ2 = lat2 * TO_RAD;
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (Math.atan2(y, x) * TO_DEG + 360) % 360;
}

/** Destination point given start (lat,lng), bearing (degrees), distance (meters). */
function destination(lat: number, lng: number, brng: number, dist: number): L.LatLng {
  const δ = dist / EARTH_RADIUS_M;
  const θ = brng * TO_RAD;
  const φ1 = lat * TO_RAD;
  const λ1 = lng * TO_RAD;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return L.latLng(φ2 * TO_DEG, λ2 * TO_DEG);
}

/**
 * Get the 5-segment road path as an array of waypoints.
 * index 0 = Seg1 start, 1 = Seg1 end/Seg2 start, ..., 5 = Seg5 end
 */
function getRoadPath(): Waypoint[] {
  return WAYPOINTS;
}

/**
 * For a segment, determine travel-direction count (length in meters)
 * and width-direction count (always 6).
 * Returns [travelCount, widthCount].
 */
function segmentAxisCounts(seg: SegmentDef): [number, number] {
  // The larger of rows/cols is the travel direction length in meters;
  // the smaller (6) is the road width in meters.
  if (seg.rows > seg.cols) {
    return [seg.rows, seg.cols];   // vertical in SVG → travel along lat
  }
  return [seg.cols, seg.rows];     // horizontal in SVG → travel along lng
}

/** Offset a point by `dist` meters along `brng` degrees. */
function offset(pt: L.LatLng, brng: number, dist: number): L.LatLng {
  return destination(pt.lat, pt.lng, brng, dist);
}

/**
 * Generate a GeoJSON FeatureCollection for all squares.
 * Each square = a 1m × 1m Polygon feature with square properties.
 */
export function generateSquareGeoJson(squares: Square[]): L.GeoJSON {
  const waypoints = getRoadPath();
  const features: GeoJSON.Feature[] = [];

  for (let segIdx = 0; segIdx < SEGMENTS.length; segIdx++) {
    const seg = SEGMENTS[segIdx];
    const wpStart = waypoints[segIdx];
    const wpEnd = waypoints[segIdx + 1];

    if (!wpStart || !wpEnd) continue;

    const [travelCount, widthCount] = segmentAxisCounts(seg);
    const θ = bearing(wpStart.lat, wpStart.lng, wpEnd.lat, wpEnd.lng);
    const perpθ = (θ + 90) % 360;

    for (let t = 0; t < travelCount; t++) {
      // Center of this 1m slice along the travel direction
      const centerOnPath = destination(wpStart.lat, wpStart.lng, θ, t + 0.5);

      for (let w = 0; w < widthCount; w++) {
        // For SVG vertical segments: col→travel, row→width.
        // For SVG horizontal segments: col→travel, row→width.
        // Either way: travelIndex=t, widthIndex=w.
        // SVG ID mapping (column-major):
        //   sqId = seg.startId + col * seg.rows + row
        // For vertical segs (rows>cols): col=t, row=w
        // For horizontal segs (cols>rows): col=t, row=w
        // So always: col=t, row=w
        const col = t;
        const row = w;
        const sqId = seg.startId + col * seg.rows + row;

        if (sqId > seg.endId) continue;

        // Square center offset from path centerline
        // w=0..5, offset = (w - 2.5) meters perpendicular
        const perpOffset = w - (widthCount - 1) / 2; // -2.5 to +2.5 for 6-wide
        const sqCenter = destination(
          centerOnPath.lat, centerOnPath.lng,
          perpOffset >= 0 ? perpθ : (perpθ + 180) % 360,
          Math.abs(perpOffset)
        );

        // 4 corners of a 1m × 1m square around sqCenter.
        // Corners are always ±0.5m along θ (forward/back) and
        // ±0.5m along perpθ (right/left), independent of sqCenter offset.
        const half = 0.5;

        // Forward  +0.5 along θ
        const fwd = offset(sqCenter, θ, half);
        // Backward −0.5 along θ
        const bck = offset(sqCenter, (θ + 180) % 360, half);

        const tl = offset(bck, (perpθ + 180) % 360, half); // back + left
        const tr = offset(fwd, (perpθ + 180) % 360, half); // forward + left
        const br = offset(fwd, perpθ, half);                // forward + right
        const bl = offset(bck, perpθ, half);                // back + right

        const sq = squares.find(s => s.id === sqId);

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [tl.lng, tl.lat],
              [tr.lng, tr.lat],
              [br.lng, br.lat],
              [bl.lng, bl.lat],
              [tl.lng, tl.lat],
            ]],
          },
          properties: {
            id: sqId,
            status: sq?.status ?? 0,
            isSold: sq?.isSold ?? false,
          },
        });
      }
    }
  }

  const collection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  return L.geoJSON(collection);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts
git commit -m "feat: add coordinate-config with geo math and square-to-GeoJSON generator"
```

---

### Task 4: Rewrite road-map.component.ts to use Leaflet

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts`
- Create: `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.scss`

- [ ] **Step 1: Create road-map.component.scss**

```scss
:host {
  display: block;
}

.map-container {
  height: 70vh;
  min-height: 400px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  background: #f3f4f6;
}

.legend-overlay {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.92);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.6875rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  pointer-events: none;

  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 3px;
    vertical-align: middle;
  }
}
```

- [ ] **Step 2: Rewrite road-map.component.ts**

Replace the entire file with:

```typescript
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ElementRef, inject } from '@angular/core';
import * as L from 'leaflet';
import { Square, SquareStatus, STATUS_LABELS } from '../../../models/square';
import { SEGMENTS, WAYPOINTS } from '../../map/map-segments';
import { generateSquareGeoJson } from './coordinate-config';

const STATUS_COLORS: Record<number, string> = {
  [SquareStatus.NogNieBeginNie]: '#d1d5db',
  [SquareStatus.Voorberei]:      '#fbbf24',
  [SquareStatus.BesigOmTeTeer]:  '#3b82f6',
  [SquareStatus.KlaarGeteer]:    '#22c55e',
};
const SOLD_COLOR = '#fb923c';
const SELECTED_COLOR = '#f97316';

@Component({
  selector: 'app-road-map',
  standalone: true,
  templateUrl: './road-map.component.html',
  styleUrls: ['./road-map.component.scss'],
})
export class RoadMapComponent implements OnInit, OnChanges {
  @Input() squares: Square[] = [];
  @Input() selectedIds: number[] = [];
  @Input() statusFilter: number | null = null;
  @Output() squareClicked = new EventEmitter<number>();

  private el = inject(ElementRef);
  private map!: L.Map;
  private geoLayer!: L.GeoJSON;
  private mapInitialized = false;

  ngOnInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.mapInitialized) return;

    if (changes['squares'] || changes['selectedIds'] || changes['statusFilter']) {
      this.refreshLayer();
    }
  }

  private initMap() {
    if (this.mapInitialized) return;

    const container = this.el.nativeElement.querySelector('.map-container');
    if (!container) return;

    // Calculate center from waypoints (first and last)
    const wp = WAYPOINTS;
    const midLat = (wp[0].lat + wp[wp.length - 1].lat) / 2;
    const midLng = (wp[0].lng + wp[wp.length - 1].lng) / 2;

    this.map = L.map(container, {
      center: [midLat, midLng],
      zoom: 18,
      minZoom: 16,
      maxZoom: 20,
      zoomControl: true,
      attributionControl: true,
      renderer: L.canvas(), // canvas renderer for performance with 4200 polygons
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(this.map);

    this.mapInitialized = true;
    this.refreshLayer();
  }

  private refreshLayer() {
    if (!this.mapInitialized) return;

    // Remove old layer
    if (this.geoLayer) {
      this.map.removeLayer(this.geoLayer);
    }

    // Generate fresh GeoJSON from current squares
    this.geoLayer = generateSquareGeoJson(this.squares);

    // Style each feature
    this.geoLayer.setStyle((feature) => {
      const props = feature?.properties;
      const id = props?.['id'] as number;
      const status = (props?.['status'] as number) ?? SquareStatus.NogNieBeginNie;
      const isSold = props?.['isSold'] as boolean;

      let fillColor = STATUS_COLORS[status] ?? STATUS_COLORS[SquareStatus.NogNieBeginNie];
      let fillOpacity = 0.85;
      let strokeColor = '#fff';
      let strokeWeight = 0.5;

      if (status === SquareStatus.NogNieBeginNie && isSold) {
        fillColor = SOLD_COLOR;
      }

      if (this.selectedIds.includes(id)) {
        strokeColor = SELECTED_COLOR;
        strokeWeight = 2;
      }

      if (this.statusFilter !== null && status !== this.statusFilter && !(status === SquareStatus.NogNieBeginNie && isSold)) {
        fillOpacity = 0.2;
      }

      return {
        fillColor,
        fillOpacity,
        color: strokeColor,
        weight: strokeWeight,
      };
    });

    // Click handler
    this.geoLayer.on('click', (e: L.LeafletEvent) => {
      const id = (e.sourceTarget?.feature?.properties?.['id'] as number);
      if (id != null) {
        this.squareClicked.emit(id);
      }
    });

    // Tooltip handler
    this.geoLayer.on('mouseover', (e: L.LeafletEvent) => {
      const props = e.sourceTarget?.feature?.properties;
      const id = props?.['id'] as number;
      const status = props?.['status'] as number;
      const isSold = props?.['isSold'] as boolean;
      if (id == null) return;

      let label: string;
      if (status === SquareStatus.NogNieBeginNie && isSold) {
        label = `Verkoop`;
      } else {
        label = STATUS_LABELS[status as SquareStatus] ?? 'Onbekend';
      }
      e.sourceTarget.bindTooltip(`Blok #${id} — ${label}`, {
        direction: 'top',
        offset: [0, -4],
      }).openTooltip();
    });

    this.geoLayer.on('mouseout', (e: L.LeafletEvent) => {
      e.sourceTarget.closeTooltip();
    });

    this.geoLayer.addTo(this.map);
  }

  /** Fit map bounds to the road area */
  fitBounds() {
    const wp = WAYPOINTS;
    const bounds = L.latLngBounds(wp.map(w => [w.lat, w.lng] as L.LatLngTuple));
    this.map.fitBounds(bounds, { padding: [30, 30] });
  }
}
```

- [ ] **Step 3: Create road-map.component.html**

```html
<div class="map-container"></div>
```

Note: The legend stays in the parent components (`map.component.ts` and `admin.component.ts`) since they already render it. The map container is the Leaflet mount point.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.html src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.scss
git commit -m "refactor: rewrite road-map component to use Leaflet with OSM tiles"
```

---

### Task 5: Verify build compiles

**Files:** None modified

- [ ] **Step 1: Build the Angular app**

Run: `npm run build` from `src/DiamantLaan.Web`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Fix any compilation errors if present**

Common issues to check:
- Ensure `leaflet` is properly imported (`import * as L from 'leaflet'`)
- Ensure `L.geoJSON`, `L.tileLayer`, `L.map`, `L.canvas`, `L.latLngBounds`, `L.latLng` types resolve
- Ensure `GeoJSON.Feature`, `GeoJSON.FeatureCollection` types resolve (these are built-in TypeScript DOM types)
- Ensure `L.LeafletEvent` and `L.LeafletMouseEvent` types are used correctly

---

### Task 6: Update user-provided waypoint coordinates

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/components/map/map-segments.ts`

- [ ] **Step 1: Replace placeholder coordinates with real values**

The user will provide lat/lng for the 6 waypoints. Update the `WAYPOINTS` array in `map-segments.ts`.

Example (after user provides):
```typescript
export const WAYPOINTS: Waypoint[] = [
  { label: 'Seg1 start (Reguit 130m)', lat: -25.123456, lng: 28.123456 },
  { label: 'Seg1 end / Seg2 start',    lat: -25.123789, lng: 28.123789 },
  { label: 'Seg2 end / Seg3 start',    lat: -25.124012, lng: 28.124012 },
  { label: 'Seg3 end / Seg4 start',    lat: -25.124345, lng: 28.124345 },
  { label: 'Seg4 end / Seg5 start',    lat: -25.124678, lng: 28.124678 },
  { label: 'Seg5 end (Reguit 290m)',   lat: -25.125000, lng: 28.125000 },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/DiamantLaan.Web/src/app/components/map/map-segments.ts
git commit -m "feat: set real waypoint coordinates for road segments"
```

---

### Task 7: Final verification

- [ ] **Step 1: Build again with coordinates**

Run: `npm run build` from `src/DiamantLaan.Web`

Expected: Clean build, no errors.

- [ ] **Step 2: Visual check (if running dev server)**

Run: `npm start` from `src/DiamantLaan.Web`

Navigate to `/kaart` and `/admin` and verify:
- OpenStreetMap tiles load as background
- Colored grid squares overlay the road path
- Clicking squares selects/deselects them
- Tooltips appear on hover
- Status filter works in admin view
