import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { RoadService } from '../../services/road.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let roadService: jasmine.SpyObj<RoadService>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let currentUser = signal<{ id: number } | null>(null);

  beforeEach(async () => {
    roadService = jasmine.createSpyObj('RoadService', ['getStats']);
    settingsService = jasmine.createSpyObj('SettingsService', ['getHomeStatsSettings']);
    currentUser = signal(null);

    roadService.getStats.and.returnValue(of({ progress: 50, totalRaised: 12345 }));
    settingsService.getHomeStatsSettings.and.returnValue(of({ showStatsSection: true, showTotalRaised: true }));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: RoadService, useValue: roadService },
        { provide: SettingsService, useValue: settingsService },
        { provide: AuthService, useValue: { currentUser } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders the stats section when showStatsSection is true', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.stats-section')).toBeTruthy();
  });

  it('hides the stats section when showStatsSection is false', () => {
    settingsService.getHomeStatsSettings.and.returnValue(of({ showStatsSection: false, showTotalRaised: true }));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.stats-section')).toBeFalsy();
    expect(roadService.getStats).not.toHaveBeenCalled();
  });

  it('shows the total raised stat when showTotalRaised is true', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const labels = Array.from(compiled.querySelectorAll('.stat-label')).map(e => e.textContent?.trim());
    expect(labels).toContain('Ingesamel');
  });

  it('hides the total raised stat when showTotalRaised is false', () => {
    settingsService.getHomeStatsSettings.and.returnValue(of({ showStatsSection: true, showTotalRaised: false }));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const labels = Array.from(compiled.querySelectorAll('.stat-label')).map(e => e.textContent?.trim());
    expect(labels).not.toContain('Ingesamel');
    expect(labels).toContain('Voltooi');
    expect(labels).toContain('Per m²');
  });

  it('falls back to defaults when settings fail to load', () => {
    settingsService.getHomeStatsSettings.and.returnValue(throwError(() => new Error('load failed')));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.stats-section')).toBeTruthy();
  });

  it('links Begin Bou to register when logged out', () => {
    currentUser.set(null);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.pill-cta') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('/registreer');
  });

  it('links Begin Bou to kaart when logged in', () => {
    currentUser.set({ id: 1 });
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.pill-cta') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('/kaart');
  });
});
