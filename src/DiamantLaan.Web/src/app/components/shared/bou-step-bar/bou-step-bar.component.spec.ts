import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BouStepBarComponent } from './bou-step-bar.component';

describe('BouStepBarComponent', () => {
  let fixture: ComponentFixture<BouStepBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BouStepBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BouStepBarComponent);
    fixture.componentInstance.active = 2;
    fixture.detectChanges();
  });

  it('is a progress rail, not a set of links', () => {
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(0);
    expect(fixture.nativeElement.querySelector('[aria-current="step"]').textContent).toContain('Kies jou blokkie');
  });
});
