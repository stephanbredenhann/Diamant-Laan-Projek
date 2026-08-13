import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FotoSliderComponent } from './foto-slider.component';

describe('FotoSliderComponent', () => {
  let fixture: ComponentFixture<FotoSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FotoSliderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FotoSliderComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('should swap between the Oewerpad photos', () => {
    expect(fixture.componentInstance.fotos.length).toBe(4);
    fixture.componentInstance.kies(1);
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector('.why-slider img.is-active') as HTMLImageElement;
    expect(active.src).toContain('oewerpad-lugfoto.jpg');
  });

  it('should step with the boxy nav buttons', () => {
    const next = fixture.nativeElement.querySelector('.why-nav.next') as HTMLButtonElement;
    next.click();
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector('.why-slider img.is-active') as HTMLImageElement;
    expect(active.src).toContain('oewerpad-lugfoto.jpg');
  });
});
