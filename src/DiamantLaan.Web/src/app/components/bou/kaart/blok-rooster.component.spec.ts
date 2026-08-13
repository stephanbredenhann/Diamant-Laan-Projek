import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Square, SquareStatus } from '../../../models/square';
import { BlokRoosterComponent } from './blok-rooster.component';

describe('BlokRoosterComponent', () => {
  let fixture: ComponentFixture<BlokRoosterComponent>;

  const squares: Square[] = [
    { id: 150, status: SquareStatus.NogNieBeginNie, isReserved: true },
    { id: 210, status: SquareStatus.NogNieBeginNie, isSold: true },
    { id: 220, status: SquareStatus.NogNieBeginNie },
    { id: 230, status: SquareStatus.NogNieBeginNie },
  ];

  function blok(id: number): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`button[aria-label^="Blok ${id},"]`);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BlokRoosterComponent] }).compileComponents();
    fixture = TestBed.createComponent(BlokRoosterComponent);
    fixture.componentRef.setInput('van', 101);
    fixture.componentRef.setInput('tot', 300);
    fixture.componentRef.setInput('squares', squares);
    fixture.componentRef.setInput('selectedIds', [220]);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders one button per block', () => {
    expect(fixture.nativeElement.querySelectorAll('button.blok').length).toBe(200);
  });

  it('agrees with the strip about what each block is', () => {
    expect(blok(150).classList).toContain('onbeskikbaar');
    expect(blok(210).classList).toContain('verkoop');
    expect(blok(220).classList).toContain('gekies');
    expect(blok(230).classList).toContain('beskikbaar');
  });

  it('disables what cannot be picked and emits only for what can', () => {
    expect(blok(150).disabled).toBe(true);
    expect(blok(210).disabled).toBe(true);
    expect(blok(230).disabled).toBe(false);

    const emitted: number[] = [];
    fixture.componentInstance.blokGekliek.subscribe(id => emitted.push(id));
    for (const id of [150, 210, 230]) blok(id).click();
    expect(emitted).toEqual([230]);
  });

  it('shows the number on every block a visitor could care about', () => {
    expect(blok(230).textContent!.trim()).toBe('230');
    expect(blok(210).textContent!.trim()).toBe('210');
    // Unavailable blocks carry no number, matching the map.
    expect(blok(150).querySelector('.nommer')).toBeNull();
  });

  it('keeps every tap target big enough to hit on a phone', () => {
    const styl = getComputedStyle(blok(230));
    expect(parseFloat(styl.minHeight)).toBeGreaterThanOrEqual(48);
  });
});
