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

// 13 waypoints defining the real-world road path.
// The road runs ~700m start→end. Squares 1–4200 are distributed
// evenly along this polyline, 6 squares wide.
export const WAYPOINTS: Waypoint[] = [
  { label: 'Start', lat: -29.806075, lng: 24.419353 },
  { label: 'P1',    lat: -29.805764, lng: 24.419708 },
  { label: 'P2',    lat: -29.805344, lng: 24.420086 },
  { label: 'P3',    lat: -29.805108, lng: 24.420269 },
  { label: 'P4',    lat: -29.804664, lng: 24.420419 },
  { label: 'P5',    lat: -29.804342, lng: 24.420447 },
  { label: 'P6',    lat: -29.804194, lng: 24.420419 },
  { label: 'P7',    lat: -29.803889, lng: 24.420161 },
  { label: 'P8',    lat: -29.803522, lng: 24.419742 },
  { label: 'P9',    lat: -29.803072, lng: 24.419269 },
  { label: 'P10',   lat: -29.802264, lng: 24.420228 },
  { label: 'P11',   lat: -29.801950, lng: 24.420606 },
  { label: 'End',   lat: -29.801347, lng: 24.421422 },
];
