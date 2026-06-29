import * as L from 'leaflet';
import * as turf from '@turf/turf';
import type { Feature, LineString, Point, Polygon } from 'geojson';
import { Square } from '../../../models/square';
import { WAYPOINTS } from '../../map/map-segments';

const ROAD_LENGTH_M = 700;
const ROAD_WIDTH = 6;
const TOTAL_SQUARES = 4200;
const MAP_BOUNDS_PADDING_KM = 0.5;

let cachedRoad: Feature<LineString> | null = null;
let cachedBaseFeatures: GeoJSON.Feature<Polygon>[] | null = null;
let cachedMapBounds: L.LatLngBounds | null = null;

function buildRoadLineString(): Feature<LineString> {
  if (cachedRoad) return cachedRoad;
  const coords = WAYPOINTS.map(wp => [wp.lng, wp.lat] as [number, number]);
  cachedRoad = turf.lineString(coords);
  return cachedRoad;
}

/** Bearing (degrees) along the road at a given distance in meters. */
function bearingAtDistance(
  road: Feature<LineString>,
  distanceAlongM: number,
  totalDist: number,
): number {
  const delta = 0.5;
  const d1 = Math.max(0, distanceAlongM - delta);
  const d2 = Math.min(totalDist, distanceAlongM + delta);
  const p1 = turf.along(road, d1, { units: 'meters' });
  const p2 = turf.along(road, d2, { units: 'meters' });
  return turf.bearing(p1, p2);
}

/** Offset a path point perpendicular to the road bearing by `meters` (negative = left). */
function offsetPerpendicular(
  point: Feature<Point>,
  bearingDeg: number,
  meters: number,
): [number, number] {
  const perpBearing = meters >= 0 ? (bearingDeg + 90) % 360 : (bearingDeg + 270) % 360;
  const dest = turf.destination(point, Math.abs(meters), perpBearing, { units: 'meters' });
  return dest.geometry.coordinates as [number, number];
}

/** Corner of a trapezoid cell at a given distance along the road and perpendicular offset. */
function cornerAt(
  road: Feature<LineString>,
  distanceAlongM: number,
  bearingDeg: number,
  perpOffsetM: number,
): [number, number] {
  const onPath = turf.along(road, distanceAlongM, { units: 'meters' });
  return offsetPerpendicular(onPath, bearingDeg, perpOffsetM);
}

/** Static polygon geometry for all squares (computed once). */
function getBaseFeatures(): GeoJSON.Feature<Polygon>[] {
  if (cachedBaseFeatures) return cachedBaseFeatures;

  const road = buildRoadLineString();
  const totalDist = turf.length(road, { units: 'meters' });
  const features: GeoJSON.Feature<Polygon>[] = [];

  for (let sqId = 1; sqId <= TOTAL_SQUARES; sqId++) {
    const roadPos = Math.floor((sqId - 1) / ROAD_WIDTH);
    const widthIdx = (sqId - 1) % ROAD_WIDTH;

    const backDist = (roadPos / ROAD_LENGTH_M) * totalDist;
    const frontDist = ((roadPos + 1) / ROAD_LENGTH_M) * totalDist;

    const backBearing = bearingAtDistance(road, backDist, totalDist);
    const frontBearing = bearingAtDistance(road, frontDist, totalDist);

    const perpLeft = widthIdx - 3;
    const perpRight = widthIdx - 2;

    const backLeft = cornerAt(road, backDist, backBearing, perpLeft);
    const backRight = cornerAt(road, backDist, backBearing, perpRight);
    const frontLeft = cornerAt(road, frontDist, frontBearing, perpLeft);
    const frontRight = cornerAt(road, frontDist, frontBearing, perpRight);

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          backLeft,
          frontLeft,
          frontRight,
          backRight,
          backLeft,
        ]],
      },
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
      },
    };
  });

  return L.geoJSON({
    type: 'FeatureCollection',
    features,
  } as GeoJSON.GeoJsonObject);
}

const centroidCache = new Map<number, { lat: number; lng: number }>();

/** Approximate GPS centroid for a block (indicative only). */
export function getSquareCentroid(squareId: number): { lat: number; lng: number } | null {
  if (squareId < 1 || squareId > TOTAL_SQUARES) return null;

  const cached = centroidCache.get(squareId);
  if (cached) return cached;

  const road = buildRoadLineString();
  const totalDist = turf.length(road, { units: 'meters' });

  const roadPos = Math.floor((squareId - 1) / ROAD_WIDTH);
  const widthIdx = (squareId - 1) % ROAD_WIDTH;

  const backDist = (roadPos / ROAD_LENGTH_M) * totalDist;
  const frontDist = ((roadPos + 1) / ROAD_LENGTH_M) * totalDist;
  const midDist = (backDist + frontDist) / 2;

  const bearing = bearingAtDistance(road, midDist, totalDist);
  const perpCenter = widthIdx - 2.5;
  const onPath = turf.along(road, midDist, { units: 'meters' });
  const [lng, lat] = offsetPerpendicular(onPath, bearing, perpCenter);

  const result = { lat, lng };
  centroidCache.set(squareId, result);
  return result;
}
