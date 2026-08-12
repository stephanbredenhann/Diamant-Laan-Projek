import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Square, SquareStatus } from '../../../models/square';
import { BlokStrookComponent } from './blok-strook.component';

/**
 * The projection and rotation are the easiest thing here to get quietly wrong:
 * a bad angle still renders, it just renders a diagonal smear with unreadable
 * numbers. These assertions pin the shape of the result.
 */
describe('BlokStrookComponent', () => {
  let fixture: ComponentFixture<BlokStrookComponent>;

  function opstel(van: number, tot: number, squares: Square[] = [], gekies: number[] = []) {
    fixture.componentRef.setInput('van', van);
    fixture.componentRef.setInput('tot', tot);
    fixture.componentRef.setInput('squares', squares);
    fixture.componentRef.setInput('selectedIds', gekies);
    fixture.detectChanges();
  }

  function viewBoxAfmetings(): { breedte: number; hoogte: number } {
    const vb = fixture.nativeElement.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
    return { breedte: vb[2], hoogte: vb[3] };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BlokStrookComponent] }).compileComponents();
    fixture = TestBed.createComponent(BlokStrookComponent);
  });

  afterEach(() => fixture.destroy());

  it('draws every block in the section', () => {
    opstel(2301, 2400);
    expect(fixture.nativeElement.querySelectorAll('g.blok').length).toBe(100);
  });

  it('turns the section so the road runs across, not diagonally', () => {
    opstel(2301, 2400);
    const { breedte, hoogte } = viewBoxAfmetings();

    // 100 blocks is ~17 m along a 6 m wide road, plus a shoulder either side.
    expect(breedte).toBeGreaterThan(hoogte * 1.7);
    expect(hoogte).toBeGreaterThan(6);
    expect(hoogte).toBeLessThan(14);
    expect(breedte).toBeGreaterThan(17);
    expect(breedte).toBeLessThan(28);
  });

  it('keeps blocks at roughly their real one metre across', () => {
    opstel(2301, 2400);

    const punte = fixture.nativeElement
      .querySelector('g.blok polygon')
      .getAttribute('points')
      .split(' ')
      .map((p: string) => p.split(',').map(Number));

    const xs = punte.map((p: number[]) => p[0]);
    const ys = punte.map((p: number[]) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.7);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.4);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.7);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1.4);
  });

  it('holds its orientation through the sharpest bend in the road', () => {
    // 2401-2460 is the right-hand turn, the worst case for a single rotation.
    opstel(2401, 2500);
    const { breedte, hoogte } = viewBoxAfmetings();
    expect(breedte).toBeGreaterThan(hoogte);
  });

  it('carries no aerial layer: the overview band is where the map lives', () => {
    opstel(2301, 2400);
    const svg = fixture.nativeElement.querySelector('svg.strook');
    expect(svg.querySelectorAll('image').length).toBe(0);
    // Solid fills, since there is nothing behind them worth seeing.
    const vry = svg.querySelector('g.blok.beskikbaar polygon');
    expect(Number(getComputedStyle(vry).fillOpacity)).toBe(1);
  });

  it('paints the four block states and hides the number on unavailable ones', () => {
    const squares: Square[] = [
      { id: 150, status: SquareStatus.NogNieBeginNie },
      { id: 210, status: SquareStatus.NogNieBeginNie, isSold: true },
      { id: 220, status: SquareStatus.NogNieBeginNie },
      { id: 230, status: SquareStatus.NogNieBeginNie },
    ];
    opstel(101, 300, squares, [220]);

    const blok = (id: number) => fixture.nativeElement.querySelector(`g.blok[aria-label^="Blok ${id},"]`);

    // 150 sits below the saleable range, so it is black, unlabelled and not focusable.
    expect(blok(150).classList).toContain('onbeskikbaar');
    expect(blok(150).querySelector('text')).toBeNull();
    expect(blok(150).getAttribute('tabindex')).toBeNull();

    expect(blok(210).classList).toContain('verkoop');
    expect(blok(210).querySelector('text').textContent.trim()).toBe('210');

    expect(blok(220).classList).toContain('gekies');
    expect(blok(220).querySelector('polyline.tiek')).not.toBeNull();

    expect(blok(230).classList).toContain('beskikbaar');
    expect(blok(230).getAttribute('tabindex')).toBe('0');
  });

  it('emits only for blocks that can actually be picked', () => {
    const squares: Square[] = [
      { id: 150, status: SquareStatus.NogNieBeginNie },
      { id: 210, status: SquareStatus.NogNieBeginNie, isSold: true },
      { id: 230, status: SquareStatus.NogNieBeginNie },
    ];
    opstel(101, 300, squares);

    const emitted: number[] = [];
    fixture.componentInstance.blokGekliek.subscribe(id => emitted.push(id));

    for (const id of [150, 210, 230]) {
      fixture.nativeElement.querySelector(`g.blok[aria-label^="Blok ${id},"]`).dispatchEvent(new Event('click'));
    }

    expect(emitted).toEqual([230]);
  });
});
