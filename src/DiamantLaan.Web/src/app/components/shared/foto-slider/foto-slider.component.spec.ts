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

  it('should swap between the two Oewerpad photos', () => {
    expect(fixture.componentInstance.fotos.length).toBe(2);
    fixture.componentInstance.kies(1);
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector('.why-slider img.is-active') as HTMLImageElement;
    expect(active.src).toContain('oewerpad-lugfoto.jpg');
  });
});
