import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AdminStatsComponent } from './admin-stats.component';

const emptyStats = {
  totalSquares: 4000,
  soldSquares: 0,
  totalRaised: 0,
  sponsorBaseline: 2_000_000,
  perStatus: [],
  dailySales: [],
  oraniaSquares: 0,
  outsiderSquares: 0,
  bewegingSquares: 0,
  nonBewegingSquares: 0
};

describe('AdminStatsComponent', () => {
  let fixture: ComponentFixture<AdminStatsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminStatsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideCharts(withDefaultRegisterables())
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminStatsComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function flushAll(stats: object = emptyStats) {
    http.expectOne('/api/admin/stats').flush(stats);
    http.expectOne('/api/admin/purchases').flush([]);
    http.expectOne('/api/admin/registered-no-purchase').flush([]);
    fixture.detectChanges();
  }

  it('creates and shows stats after the APIs respond', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.textContent).toContain('Laai statistieke');

    flushAll();

    expect(fixture.nativeElement.textContent).not.toContain('Laai statistieke');
    expect(fixture.nativeElement.textContent).toContain('Blokke verkoop');
    expect(fixture.nativeElement.querySelectorAll('canvas[baseChart]').length).toBe(5);
  });

  it('shows an error instead of going blank when stats fail to load', () => {
    fixture.detectChanges();

    http.expectOne('/api/admin/stats').flush({}, { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/admin/purchases').flush([]);
    http.expectOne('/api/admin/registered-no-purchase').flush([]);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.textContent).toContain('Kon nie statistieke laai nie.');
    expect(fixture.nativeElement.textContent).toContain('Blokke verkoop');
    expect(fixture.nativeElement.querySelectorAll('canvas[baseChart]').length).toBe(0);
  });
});
