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

// Road: 6m wide = 6 rows. Squares numbered 1-4500 sequentially.
// SVG positions are viewBox coordinates (500x620 roughly)

export const SEGMENTS: SegmentDef[] = [
  {
    name: 'Reguit 130m',
    startId: 1, endId: 780,
    length: 130,
    x: 400, y: 50, width: 30, height: 260,
    rows: 6, cols: 130, cellW: 5, cellH: 2,
  },
  {
    name: 'Draai Links 100m',
    startId: 781, endId: 1380,
    length: 100,
    x: 350, y: 300, width: 60, height: 60,
    rows: 6, cols: 100, cellW: 2, cellH: 2,
  },
  {
    name: 'Reguit 170m',
    startId: 1381, endId: 2400,
    length: 170,
    x: 50, y: 340, width: 340, height: 30,
    rows: 6, cols: 170, cellW: 2, cellH: 5,
  },
  {
    name: 'Draai Regs',
    startId: 2401, endId: 2460,
    length: 10,
    x: 385, y: 310, width: 35, height: 35,
    rows: 6, cols: 10, cellW: 2, cellH: 2,
  },
  {
    name: 'Reguit 290m',
    startId: 2461, endId: 4200,
    length: 290,
    x: 420, y: 30, width: 30, height: 580,
    rows: 6, cols: 290, cellW: 5, cellH: 2,
  },
];
