import * as L from 'leaflet';
import * as turf from '@turf/turf';
import type { Polygon } from 'geojson';
import { Square } from '../../../models/square';
import {
  TOTAL_SQUARES,
  buildRoadLineString,
  getSquareRing,
} from './road-geometry';

/**
 * Leaflet-shaped views of the road geometry. The geometry itself lives in
 * road-geometry.ts, which knows nothing about Leaflet.
 */

export { getSquareCentroid } from './road-geometry';

const MAP_BOUNDS_PADDING_KM = 0.5;

let cachedBaseFeatures: GeoJSON.Feature<Polygon>[] | null = null;
let cachedMapBounds: L.LatLngBounds | null = null;

/** Static polygon geometry for all squares (computed once). */
function getBaseFeatures(): GeoJSON.Feature<Polygon>[] {
  if (cachedBaseFeatures) return cachedBaseFeatures;

  const features: GeoJSON.Feature<Polygon>[] = [];
  for (let sqId = 1; sqId <= TOTAL_SQUARES; sqId++) {
    const ring = getSquareRing(sqId);
    if (!ring) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { id: sqId },
    });
  }

  cachedBaseFeatures = features;
  return cachedBaseFeatures;
}

/**
 * Leaflet max bounds padded ~1km around the road/square corridor.
 */
export function getMapBounds(): L.LatLngBounds {
  if (cachedMapBounds) return cachedMapBounds;

  const road = buildRoadLineString();
  const buffered = turf.buffer(road, MAP_BOUNDS_PADDING_KM, { units: 'kilometers' });
  if (!buffered) {
    const bbox = turf.bbox(road);
    cachedMapBounds = L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);
    return cachedMapBounds;
  }
  const bbox = turf.bbox(buffered);
  cachedMapBounds = L.latLngBounds(
    [bbox[1], bbox[0]],
    [bbox[3], bbox[2]],
  );
  return cachedMapBounds;
}

/**
 * Generate a Leaflet GeoJSON layer with all 4200 squares positioned
 * along the real-world road path defined by WAYPOINTS.
 *
 * Geometry is cached; only status/sold properties are merged per request.
 */
export function generateSquareGeoJson(squares: Square[]): L.GeoJSON {
  const squareById = new Map(squares.map(s => [s.id, s]));
  const baseFeatures = getBaseFeatures();

  const features = baseFeatures.map(feature => {
    const id = feature.properties?.['id'] as number;
    const sq = squareById.get(id);

    return {
      ...feature,
      properties: {
        id,
        status: sq?.status ?? 0,
        isSold: sq?.isSold ?? false,
        imageCount: sq?.imageCount ?? 0,
      },
    };
  });

  return L.geoJSON({
    type: 'FeatureCollection',
    features,
  } as GeoJSON.GeoJsonObject);
}
