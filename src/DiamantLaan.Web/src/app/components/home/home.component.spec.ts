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

    roadService.getStats.and.returnValue(of({
      progress: 50,
      totalRaised: 12345,
      totalSquares: 4200,
      saleableSquares: 4200,
      fundedSquares: 25,
      phases: { nogNieBeginNie: 4400, voorberei: 50, besigOmTeTeer: 25, klaarGeteer: 25 },
    }));
    settingsService.getHomeStatsSettings.and.returnValue(of({ showStatsSection: true, showTotalRaised: true }));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: RoadService, useValue: roadService },
        { provide: SettingsService, useValue: settingsService },
        { provide: AuthService, useValue: { currentUser } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load stats when settings allow', () => {
    expect(roadService.getStats).toHaveBeenCalled();
    expect(fixture.componentInstance.totalRaised).toBe(12345);
  });

  it('should survive settings errors', () => {
    settingsService.getHomeStatsSettings.and.returnValue(throwError(() => new Error('fail')));
    const f2 = TestBed.createComponent(HomeComponent);
    f2.detectChanges();
    expect(f2.componentInstance).toBeTruthy();
  });
});
