import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  let fixture: ComponentFixture<AdminLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('points the Statistieke tab at /admin/stats', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('nav.admin-tabs a')) as HTMLAnchorElement[];
    const stats = links.find(a => a.textContent?.trim() === 'Statistieke');
    expect(stats).toBeTruthy();
    expect(stats!.getAttribute('href')).toBe('/admin/stats');
  });
});
