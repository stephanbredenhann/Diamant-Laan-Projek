# OSM Map Overlay for Diamant Laan

**Date:** 2026-06-05
**Status:** Approved

## Goal

Replace the hardcoded SVG grid map in `road-map.component.ts` with a Leaflet.js map using OpenStreetMap tiles. The 4,200 colored 1m² squares (representing road tarring progress) are overlaid as a GeoJSON layer on real-world geography.

## Scope

- Replace SVG rendering in `road-map.component.ts` with Leaflet
- Add geographic coordinate configuration for the 5 road segments
- Compute lat/lng polygons for all 4,200 squares client-side
- Preserve all existing interaction: click-to-select, hover tooltips, status colors, zoom
- Works in both `/kaart` (purchase) and `/admin` (status management) views
- No backend changes

## Out of Scope

- Home page decorative SVG hero (stays as-is)
- My-squares list view (no map currently)
- Mobile-specific adaptations beyond Leaflet's built-in support

## Architecture

```
road-map.component.ts (refactored)
├── Leaflet Map Instance
│   ├── OSM Tile Layer (background)
│   ├── GeoJSON Layer (4,200 square polygons)
│   │   └── L.canvas renderer (performance)
│   ├── Click/tooltip event binding
│   └── Native zoom/pan controls
│
coordinate-config.ts (NEW)
├── Waypoint[] { label, lat, lng }
├── buildSegmentPath(waypoints) → latlng[]
├── squareToPolygon(sqId) → GeoJSON Polygon
└── generateAllSquares(squares[], waypoints) → FeatureCollection
```

## Coordinate System

- User provides 6 waypoints (lat/lng) — start and end of each segment
- For each straight segment, bearing is calculated between start and end
- Squares are placed at 1m intervals along the segment bearing
- 6 squares wide means perpendicular offset of ±3m from centerline
- Each square = 1m × 1m polygon defined by 4 corner coordinates
- Geographic math: Haversine distance + destination-point formula

## Data Flow

1. `road-map.component` loads squares from API (unchanged)
2. `coordinate-config.ts` generates GeoJSON FeatureCollection from squares + waypoints
3. GeoJSON layer renders to Leaflet map via canvas renderer
4. Click on feature → emit selected square (same output contract as current)
5. Hover → Leaflet tooltip (replaces SVG `<title>` element)

## Files Changed

| File | Change |
|------|--------|
| `src/DiamantLaan.Web/package.json` | Add `leaflet`, `@types/leaflet` |
| `src/DiamantLaan.Web/angular.json` | Add Leaflet CSS to styles |
| `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.ts` | Rewrite: Leaflet map |
| `src/DiamantLaan.Web/src/app/components/shared/road-map/road-map.component.scss` | Leaflet container styles |
| `src/DiamantLaan.Web/src/app/components/map/map-segments.ts` | Add waypoints array |
| `src/DiamantLaan.Web/src/app/components/shared/road-map/coordinate-config.ts` | **New**: coordinate math |

## Dependencies

- `leaflet` — MIT license, ~40KB gzipped, no API key required
- `@types/leaflet` — TypeScript definitions

## Performance

- Leaflet canvas renderer handles 4,200 features comparably to current 4,200 SVG rects
- GeoJSON FeatureCollection generated once, cached in component
- Re-renders only on square data change (status/selection), not on pan/zoom

## Zoom Levels

- Min zoom: 16 (1m ≈ 3px, squares start being visible)
- Max zoom: 20 (1m ≈ 30px, squares clearly tappable)
- No max bounds — user can pan freely around the road area
