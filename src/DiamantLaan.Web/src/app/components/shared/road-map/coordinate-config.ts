import * as L from 'leaflet';
import { Square } from '../../../models/square';
import { WAYPOINTS, Waypoint } from '../../map/map-segments';

const EARTH_RADIUS_M = 6371000;
const TO_RAD = Math.PI / 180;
const TO_DEG = 180 / Math.PI;
const ROAD_LENGTH_M = 700;
const ROAD_WIDTH = 6;

/** Bearing in degrees from (lat1,lng1) to (lat2,lng2). Result 0–360 (0 = North). */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * TO_RAD;
  const φ1 = lat1 * TO_RAD;
  const φ2 = lat2 * TO_RAD;
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (Math.atan2(y, x) * TO_DEG + 360) % 360;
}

/** Haversine distance in meters between two points. */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * TO_RAD;
  const φ2 = lat2 * TO_RAD;
  const Δφ = (lat2 - lat1) * TO_RAD;
  const Δλ = (lng2 - lng1) * TO_RAD;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Destination point given start (lat,lng), bearing (deg), distance (meters). */
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

/** Offset a point by `dist` meters along `brng` degrees. */
function offset(pt: L.LatLng, brng: number, dist: number): L.LatLng {
  return destination(pt.lat, pt.lng, brng, dist);
}

/** Build cumulative distances (meters) along the waypoint polyline. */
function buildCumulativeDistances(wps: Waypoint[]): number[] {
  const dists = [0];
  for (let i = 1; i < wps.length; i++) {
    const d = haversineDistance(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng);
    dists.push(dists[i - 1] + d);
  }
  return dists;
}

/** Interpolate lat/lng at a given distance (meters) along the polyline. */
function interpolateAlongPath(wps: Waypoint[], cumDists: number[], distance: number): L.LatLng {
  if (distance <= 0) return L.latLng(wps[0].lat, wps[0].lng);
  for (let i = 1; i < cumDists.length; i++) {
    if (distance <= cumDists[i]) {
      const segStart = cumDists[i - 1];
      const segLen = cumDists[i] - segStart;
      if (segLen < 0.0001) return L.latLng(wps[i].lat, wps[i].lng);
      const t = (distance - segStart) / segLen;
      const lat = wps[i - 1].lat + t * (wps[i].lat - wps[i - 1].lat);
      const lng = wps[i - 1].lng + t * (wps[i].lng - wps[i - 1].lng);
      return L.latLng(lat, lng);
    }
  }
  const last = wps[wps.length - 1];
  return L.latLng(last.lat, last.lng);
}

/** Get bearing at a given distance along the polyline. */
function bearingAtDistance(wps: Waypoint[], cumDists: number[], distance: number): number {
  if (distance <= 0) return bearing(wps[0].lat, wps[0].lng, wps[1].lat, wps[1].lng);
  for (let i = 1; i < cumDists.length; i++) {
    if (distance <= cumDists[i]) {
      return bearing(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng);
    }
  }
  const n = wps.length;
  return bearing(wps[n - 2].lat, wps[n - 2].lng, wps[n - 1].lat, wps[n - 1].lng);
}

/**
 * Generate a Leaflet GeoJSON layer with all 4200 squares positioned
 * along the real-world road path defined by WAYPOINTS.
 * Squares 1–4200 are distributed evenly (by road meter ID) along the
 * polyline, 6 squares wide.
 */
export function generateSquareGeoJson(squares: Square[]): L.GeoJSON {
  const wps = WAYPOINTS;
  const cumDists = buildCumulativeDistances(wps);
  const totalDist = cumDists[cumDists.length - 1];
  const features: GeoJSON.Feature[] = [];

  for (let sqId = 1; sqId <= 4200; sqId++) {
    const roadPos = Math.floor((sqId - 1) / ROAD_WIDTH); // 0–699
    const widthIdx = (sqId - 1) % ROAD_WIDTH;            // 0–5

    // Map road position (0..699) to polyline distance (0..totalDist)
    const polyDist = (roadPos / (ROAD_LENGTH_M - 1)) * totalDist;

    const centerOnPath = interpolateAlongPath(wps, cumDists, polyDist);
    const θ = bearingAtDistance(wps, cumDists, polyDist);
    const perpθ = (θ + 90) % 360;

    // Offset perpendicular for road width (centered on path, ±2.5 m)
    const perpOffset = widthIdx - (ROAD_WIDTH - 1) / 2;
    const sqCenter = perpOffset === 0
      ? centerOnPath
      : offset(centerOnPath, perpOffset >= 0 ? perpθ : (perpθ + 180) % 360, Math.abs(perpOffset));

    // 4 corners of a 1 m × 1 m square around sqCenter
    const half = 0.5;
    const fwd = offset(sqCenter, θ, half);
    const bck = offset(sqCenter, (θ + 180) % 360, half);

    const tl = offset(bck, (perpθ + 180) % 360, half);
    const tr = offset(fwd, (perpθ + 180) % 360, half);
    const br = offset(fwd, perpθ, half);
    const bl = offset(bck, perpθ, half);

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

  return L.geoJSON({
    type: 'FeatureCollection',
    features,
  } as GeoJSON.GeoJsonObject);
}
