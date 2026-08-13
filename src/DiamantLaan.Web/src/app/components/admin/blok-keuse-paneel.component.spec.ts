import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlokKeusePaneelComponent } from './blok-keuse-paneel.component';

describe('BlokKeusePaneelComponent', () => {
  let fixture: ComponentFixture<BlokKeusePaneelComponent>;
  let komponent: BlokKeusePaneelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BlokKeusePaneelComponent] }).compileComponents();
    fixture = TestBed.createComponent(BlokKeusePaneelComponent);
    komponent = fixture.componentInstance;
    fixture.componentRef.setInput('maxBlockId', 4200);
    fixture.detectChanges();
  });

  it('parses a mixed list and emits the ids plus a fly-to target', () => {
    const bygevoeg: number[][] = [];
    const gevlieg: number[] = [];
    komponent.addIds.subscribe(ids => bygevoeg.push(ids));
    komponent.flyTo.subscribe(id => gevlieg.push(id));

    komponent.invoer = '3, 1-2, 10';
    komponent.voegBy();

    expect(bygevoeg).toEqual([[1, 2, 3, 10]]);
    expect(gevlieg).toEqual([1]);
    // The box empties on success, ready for the next range.
    expect(komponent.invoer).toBe('');
    expect(komponent.fout()).toBe('');
  });

  it('shows an error and emits nothing for bad input', () => {
    let emitted = false;
    komponent.addIds.subscribe(() => (emitted = true));

    komponent.invoer = '9999';
    komponent.voegBy();

    expect(emitted).toBe(false);
    expect(komponent.fout()).toBeTruthy();
    // The bad text stays put so the admin can correct it.
    expect(komponent.invoer).toBe('9999');
  });

  it('collapses the selection into ranges for the chips', () => {
    fixture.componentRef.setInput('selectedIds', [1, 2, 3, 7]);
    fixture.detectChanges();

    expect(komponent.reekse()).toEqual([{ van: 1, tot: 3 }, { van: 7, tot: 7 }]);
  });

  it('renders one removable chip per range', () => {
    fixture.componentRef.setInput('selectedIds', [1, 2, 3, 7]);
    fixture.detectChanges();

    const verwyder: { van: number; tot: number }[] = [];
    komponent.removeRange.subscribe(r => verwyder.push(r));

    const chips: HTMLButtonElement[] =
      Array.from(fixture.nativeElement.querySelectorAll('.reeks-blokkie'));
    expect(chips.map(c => c.querySelector('.reeks-nommer')!.textContent!.trim())).toEqual(['1-3', '7']);

    chips[0].click();
    expect(verwyder).toEqual([{ van: 1, tot: 3 }]);
  });
});
