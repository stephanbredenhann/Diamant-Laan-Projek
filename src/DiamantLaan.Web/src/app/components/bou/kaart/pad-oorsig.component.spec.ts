import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PadOorsigComponent } from './pad-oorsig.component';

describe('PadOorsigComponent', () => {
  let fixture: ComponentFixture<PadOorsigComponent>;

  function afmetings(): { breedte: number; hoogte: number } {
    const vb = fixture.nativeElement.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
    return { breedte: vb[2], hoogte: vb[3] };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PadOorsigComponent] }).compileComponents();
    fixture = TestBed.createComponent(PadOorsigComponent);
  });

  afterEach(() => fixture.destroy());

  it('shows the whole road, laid out landscape', () => {
    fixture.componentRef.setInput('merk', null);
    fixture.detectChanges();

    const { breedte, hoogte } = afmetings();
    // The road runs ~700 m; start-to-end is turned to run left to right.
    expect(breedte).toBeGreaterThan(400);
    expect(breedte).toBeLessThan(900);
    expect(breedte).toBeGreaterThan(hoogte);
    // The viewBox matches the panel, so nothing is letterboxed away.
    expect(breedte / hoogte).toBeCloseTo(16 / 9, 3);
    expect(fixture.nativeElement.querySelector('svg').style.aspectRatio).toBeTruthy();

    const punte = fixture.nativeElement.querySelector('polyline.pad').getAttribute('points').split(' ');
    expect(punte.length).toBe(32);
  });

  it('keeps the viewBox and the CSS box in step at any aspect', () => {
    // These two must agree exactly. If they drift, preserveAspectRatio
    // letterboxes the difference and the tiles stop short of the panel edge.
    for (const aspek of [16 / 9, 5, 3]) {
      fixture.componentRef.setInput('merk', { van: 2301, tot: 2400 });
      fixture.componentRef.setInput('aspek', aspek);
      fixture.detectChanges();

      const { breedte, hoogte } = afmetings();
      expect(breedte / hoogte).withContext(`viewBox at ${aspek}`).toBeCloseTo(aspek, 3);
      // Chrome serialises `aspect-ratio: 5` as "5 / 1", so parse both forms.
      const [a, b = 1] = fixture.nativeElement.querySelector('svg')
        .style.aspectRatio.split('/').map((n: string) => Number(n.trim()));
      expect(a / b).withContext(`css at ${aspek}`).toBeCloseTo(aspek, 4);
    }
  });

  it('marks nothing until a range is given', () => {
    fixture.componentRef.setInput('merk', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('polyline.merk')).toBeNull();
    expect(fixture.nativeElement.querySelector('circle.speld')).toBeNull();
  });

  it('traces a thousand-block group as a stretch of road', () => {
    fixture.componentRef.setInput('merk', { van: 2001, tot: 3000 });
    fixture.detectChanges();

    const merk = fixture.nativeElement.querySelector('polyline.merk');
    expect(merk).not.toBeNull();
    expect(merk.getAttribute('points').split(' ').length).toBeGreaterThan(10);
    expect(fixture.nativeElement.querySelector('circle.speld')).not.toBeNull();
  });

  it('traces the stretch without hooking sideways at either end', () => {
    // Block ids run across the road before they run along it, so a trace built
    // from raw centroids can end in a lane six metres off the one it started
    // in. That showed up as a right-angled hook on the end of the marker.
    for (const merk of [{ van: 2301, tot: 2400 }, { van: 1, tot: 100 }, { van: 4101, tot: 4200 }]) {
      fixture.componentRef.setInput('merk', merk);
      fixture.detectChanges();

      const punte: number[][] = fixture.nativeElement.querySelector('polyline.merk')
        .getAttribute('points').split(' ').map((p: string) => p.split(',').map(Number));

      const segmente = punte.slice(1).map((p, i) => [p[0] - punte[i][0], p[1] - punte[i][1]]);
      const lengtes = segmente.map(([dx, dy]) => Math.hypot(dx, dy));
      const langste = Math.max(...lengtes);

      // No segment may double back or turn hard against its neighbour: the road
      // curves, but never by more than a few degrees over a couple of metres.
      for (let i = 1; i < segmente.length; i++) {
        const [ax, ay] = segmente[i - 1];
        const [bx, by] = segmente[i];
        const skaal = Math.hypot(ax, ay) * Math.hypot(bx, by);
        if (skaal === 0) continue;
        const kosinus = (ax * bx + ay * by) / skaal;
        expect(kosinus)
          .withContext(`${merk.van}-${merk.tot}: hard turn at segment ${i}`)
          .toBeGreaterThan(0.9);
      }

      // And no single segment may be wildly longer than the rest, which is what
      // a sideways jump across the road width looked like.
      for (const l of lengtes) {
        expect(l).withContext(`${merk.van}-${merk.tot}: uneven segment`).toBeGreaterThan(langste * 0.5);
      }
    }
  });

  it('keeps the marked stretch inside the road it belongs to', () => {
    fixture.componentRef.setInput('merk', { van: 2301, tot: 2400 });
    fixture.detectChanges();

    const lees = (sel: string) => fixture.nativeElement.querySelector(sel)
      .getAttribute('points').split(' ').map((p: string) => p.split(',').map(Number));

    const pad = lees('polyline.pad');
    const merk = lees('polyline.merk');
    const binne = (v: number[][], i: number) => ({
      min: Math.min(...v.map(p => p[i])), max: Math.max(...v.map(p => p[i])),
    });

    for (const as of [0, 1]) {
      const p = binne(pad, as);
      const m = binne(merk, as);
      // A metre of slack: the marked line runs down the centre of the blocks,
      // which sit half a road-width off the waypoint path.
      expect(m.min).toBeGreaterThanOrEqual(p.min - 4);
      expect(m.max).toBeLessThanOrEqual(p.max + 4);
    }
  });

  it('loads crisp tiles rather than upscaled ones', () => {
    fixture.componentRef.setInput('merk', null);
    fixture.detectChanges();

    const teels = fixture.nativeElement.querySelectorAll('.teels image');
    expect(teels.length).toBeGreaterThan(0);
    // Zoom 18 here is ~0.52 m/px, so a 256 px tile covers ~133 m. Shown across a
    // ~600 m band it is downscaled, which is why the overview reads sharply.
    // The whole road spans ~600 m in a ~740 px panel, so zoom 17 (~1 m/px here,
    // a ~266 m tile) is about one tile pixel per screen pixel.
    const grootte = Number(teels[0].getAttribute('width'));
    expect(grootte).toBeGreaterThan(240);
    expect(grootte).toBeLessThan(290);
    expect(teels[0].getAttribute('href')).toContain('/17/');
  });

  it('zooms in as the marked range narrows', () => {
    const breedteVir = (merk: unknown) => {
      fixture.componentRef.setInput('merk', merk);
      fixture.detectChanges();
      return afmetings().breedte;
    };

    const heleWeg = breedteVir(null);
    const groep = breedteVir({ van: 2001, tot: 3000 });
    const seksie = breedteVir({ van: 2301, tot: 2400 });

    expect(groep).toBeLessThan(heleWeg);
    expect(seksie).toBeLessThan(groep);
    // A real step down each time, not a token one.
    expect(seksie).toBeLessThan(heleWeg / 4);
    // ...but never so far in that there is no context left around the stretch,
    // which is only ~17 m long.
    expect(seksie).toBeGreaterThan(60);
    expect(seksie).toBeLessThan(200);
  });

  it('raises the tile zoom as it closes in, and never past what OSM publishes', () => {
    const zoomVir = (merk: unknown) => {
      fixture.componentRef.setInput('merk', merk);
      fixture.detectChanges();
      const href = fixture.nativeElement.querySelector('.teels image').getAttribute('href');
      return Number(href.split('/')[3]);
    };

    expect(zoomVir(null)).toBe(17);
    expect(zoomVir({ van: 2001, tot: 3000 })).toBeGreaterThan(17);
    expect(zoomVir({ van: 2301, tot: 2400 })).toBe(19);
  });

  it('covers the rotated view completely, corners included', () => {
    fixture.componentRef.setInput('merk', null);
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
    const [a, b, c, d] = svg.querySelector('.teels').getAttribute('transform')
      .match(/matrix\(([^)]+)\)/)[1].trim().split(/\s+/).map(Number);

    const beelde = [...svg.querySelectorAll('.teels image')];
    const xs = beelde.map(i => Number(i.getAttribute('x')));
    const ys = beelde.map(i => Number(i.getAttribute('y')));
    const sy = Number(beelde[0].getAttribute('width'));

    // The rotation is orthonormal, so its inverse is its transpose.
    const terug = (X: number, Y: number) => [a * X + b * Y, c * X + d * Y];
    for (const [X, Y] of [[vx, vy], [vx + vw, vy], [vx, vy + vh], [vx + vw, vy + vh]]) {
      const [x, y] = terug(X, Y);
      expect(x).toBeGreaterThanOrEqual(Math.min(...xs));
      expect(x).toBeLessThanOrEqual(Math.max(...xs) + sy);
      expect(y).toBeGreaterThanOrEqual(Math.min(...ys));
      expect(y).toBeLessThanOrEqual(Math.max(...ys) + sy);
    }
  });
});
