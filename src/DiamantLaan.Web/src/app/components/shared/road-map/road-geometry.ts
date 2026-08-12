import * as turf from '@turf/turf';
import type { Feature, LineString, Point } from 'geojson';
import { WAYPOINTS } from '../../map/map-segments';

/**
 * Where every block sits on the real road, in plain lat/lng.
 *
 * Deliberately free of Leaflet: the wizard's block picker draws these same
 * outlines as inline SVG, and pulling a map library into that lazy chunk would
 * cost a donor mid-purchase a download they never need. Leaflet-shaped helpers
 * live next door in coordinate-config.ts.
 */

export const ROAD_LENGTH_M = 700;
export const ROAD_WIDTH = 6;
export const TOTAL_SQUARES = 4200;

/** One block's outline as [lng, lat] pairs, closed (first point repeated last). */
export interface SquarePolygon {
  id: number;
  ring: [number, number][];
}

let cachedRoad: Feature<LineString> | null = null;
let cachedTotalDist: number | null = null;
const ringCache = new Map<number, [number, number][]>();
const centroidCache = new Map<number, { lat: number; lng: number }>();

export function buildRoadLineString(): Feature<LineString> {
  if (cachedRoad) return cachedRoad;
  const coords = WAYPOINTS.map(wp => [wp.lng, wp.lat] as [number, number]);
  cachedRoad = turf.lineString(coords);
  return cachedRoad;
}

function roadLength(): number {
  if (cachedTotalDist === null) {
    cachedTotalDist = turf.length(buildRoadLineString(), { units: 'meters' });
  }
  return cachedTotalDist;
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

/** Closed [lng, lat] outline for one block. Cached, so slices stay cheap. */
export function getSquareRing(squareId: number): [number, number][] | null {
  if (squareId < 1 || squareId > TOTAL_SQUARES) return null;

  const cached = ringCache.get(squareId);
  if (cached) return cached;

  const road = buildRoadLineString();
  const totalDist = roadLength();

  const roadPos = Math.floor((squareId - 1) / ROAD_WIDTH);
  const widthIdx = (squareId - 1) % ROAD_WIDTH;

  const backDist = (roadPos / ROAD_LENGTH_M) * totalDist;
  const frontDist = ((roadPos + 1) / ROAD_LENGTH_M) * totalDist;

  const backBearing = bearingAtDistance(road, backDist, totalDist);
  const frontBearing = bearingAtDistance(road, frontDist, totalDist);

  const perpLeft = widthIdx - 3;
  const perpRight = widthIdx - 2;

  const ring: [number, number][] = [
    cornerAt(road, backDist, backBearing, perpLeft),
    cornerAt(road, frontDist, frontBearing, perpLeft),
    cornerAt(road, frontDist, frontBearing, perpRight),
    cornerAt(road, backDist, backBearing, perpRight),
  ];
  ring.push(ring[0]);

  ringCache.set(squareId, ring);
  return ring;
}

/**
 * Outlines for a slice of the road, inclusive of both ends.
 *
 * Only the requested blocks are computed, so the picker's 100-block section
 * costs a fraction of building all 4200.
 */
export function getSquarePolygons(fromId: number, toId: number): SquarePolygon[] {
  const from = Math.max(1, Math.floor(fromId));
  const to = Math.min(TOTAL_SQUARES, Math.floor(toId));

  const out: SquarePolygon[] = [];
  for (let id = from; id <= to; id++) {
    const ring = getSquareRing(id);
    if (ring) out.push({ id, ring });
  }
  return out;
}

/** Approximate GPS centroid for a block (indicative only). */
export function getSquareCentroid(squareId: number): { lat: number; lng: number } | null {
  if (squareId < 1 || squareId > TOTAL_SQUARES) return null;

  const cached = centroidCache.get(squareId);
  if (cached) return cached;

  const road = buildRoadLineString();
  const totalDist = roadLength();

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
