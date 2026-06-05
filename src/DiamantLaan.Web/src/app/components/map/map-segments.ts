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
