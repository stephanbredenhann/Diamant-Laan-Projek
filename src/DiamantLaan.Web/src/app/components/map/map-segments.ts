export interface SegmentDef {
  name: string;
  startId: number;
  endId: number;
  length: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  cellW: number;
  cellH: number;
}

// Road: 700m long, 6m wide = 4200 blocks numbered 1-4200.
// Cell size: 6×6 SVG units per block (1px gap between cells).
// SVG viewBox: 0 0 1700 2640
//
// Road shape (top → bottom):
//   Seg1  – 130m vertical  (top-right,  x=1640)
//   Seg2  – 100m horizontal (turn left, y=800)
//   Seg3  – 170m horizontal (continue left, y=800)
//   Seg4  –  10m kink       (corner, y=836)
//   Seg5  – 290m vertical  (bottom-left, x=20, y=872)

export const SEGMENTS: SegmentDef[] = [
  {
    name: 'Reguit 130m',
    startId: 1, endId: 780,
    length: 130,
    x: 1640, y: 20, width: 36, height: 780,
    rows: 130, cols: 6, cellW: 6, cellH: 6,
  },
  {
    name: 'Draai Links 100m',
    startId: 781, endId: 1380,
    length: 100,
    x: 1040, y: 800, width: 600, height: 36,
    rows: 6, cols: 100, cellW: 6, cellH: 6,
  },
  {
    name: 'Reguit 170m',
    startId: 1381, endId: 2400,
    length: 170,
    x: 20, y: 800, width: 1020, height: 36,
    rows: 6, cols: 170, cellW: 6, cellH: 6,
  },
  {
    name: 'Draai Regs',
    startId: 2401, endId: 2460,
    length: 10,
    x: 20, y: 836, width: 60, height: 36,
    rows: 6, cols: 10, cellW: 6, cellH: 6,
  },
  {
    name: 'Reguit 290m',
    startId: 2461, endId: 4200,
    length: 290,
    x: 20, y: 872, width: 36, height: 1740,
    rows: 290, cols: 6, cellW: 6, cellH: 6,
  },
];

export interface Waypoint {
  label: string;
  lat: number;
  lng: number;
}

// OSM centerline path: Diamantlaan reversed from the southern end to the
// Oewerlaan junction, then Oewerlaan forward. Squares 1–4200 are distributed
// evenly along this polyline, 6 squares wide.
export const WAYPOINTS: Waypoint[] = [
  { label: 'Start', lat: -29.8060799, lng: 24.4194275 },
  { label: 'P1',    lat: -29.8058501, lng: 24.4196822 },
  { label: 'P2',    lat: -29.8058438, lng: 24.4196905 },
  { label: 'P3',    lat: -29.8057848, lng: 24.4197628 },
  { label: 'P4',    lat: -29.8057228, lng: 24.4198289 },
  { label: 'P5',    lat: -29.8056394, lng: 24.4199102 },
  { label: 'P6',    lat: -29.8055977, lng: 24.4199509 },
  { label: 'P7',    lat: -29.8055126, lng: 24.4200271 },
  { label: 'P8',    lat: -29.8054354, lng: 24.4200958 },
  { label: 'P9',    lat: -29.8053039, lng: 24.4202015 },
  { label: 'P10',   lat: -29.8051686, lng: 24.4202899 },
  { label: 'P11',   lat: -29.8050757, lng: 24.4203354 },
  { label: 'P12',   lat: -29.8049681, lng: 24.4203721 },
  { label: 'P13',   lat: -29.8048359, lng: 24.4204042 },
  { label: 'P14',   lat: -29.8047113, lng: 24.4204366 },
  { label: 'P15',   lat: -29.8045338, lng: 24.4204718 },
  { label: 'P16',   lat: -29.8044447, lng: 24.4204832 },
  { label: 'P17',   lat: -29.8043648, lng: 24.4204834 },
  { label: 'P18',   lat: -29.8042545, lng: 24.4204654 },
  { label: 'P19',   lat: -29.8041791, lng: 24.4204284 },
  { label: 'P20',   lat: -29.8041134, lng: 24.4203866 },
  { label: 'P21',   lat: -29.8040645, lng: 24.420342 },
  { label: 'P22',   lat: -29.8039421, lng: 24.4202108 },
  { label: 'P23',   lat: -29.8037095, lng: 24.4199572 },
  { label: 'P24',   lat: -29.8035271, lng: 24.4197628 },
  { label: 'Junction', lat: -29.8030819, lng: 24.4192824 },
  { label: 'P26',   lat: -29.8029313, lng: 24.4194661 },
  { label: 'P27',   lat: -29.802612, lng: 24.4198781 },
  { label: 'P28',   lat: -29.802174, lng: 24.4204106 },
  { label: 'P29',   lat: -29.8014412, lng: 24.421374 },
  { label: 'P30',   lat: -29.8013743, lng: 24.4214596 },
  { label: 'End',   lat: -29.8013537, lng: 24.4214846 },
];
