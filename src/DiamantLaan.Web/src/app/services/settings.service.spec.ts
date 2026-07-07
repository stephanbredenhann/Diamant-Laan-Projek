import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SettingsService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(SettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getHomeStatsSettings fetches from public endpoint', () => {
    const mock = { showStatsSection: false, showTotalRaised: true };

    service.getHomeStatsSettings().subscribe(result => {
      expect(result).toEqual(mock);
    });

    const req = http.expectOne('/api/settings/home-stats');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('updateHomeStatsSettings sends PUT to admin endpoint', () => {
    const payload = { showStatsSection: true, showTotalRaised: false };
    const mock = { ...payload };

    service.updateHomeStatsSettings(payload).subscribe(result => {
      expect(result).toEqual(mock);
    });

    const req = http.expectOne('/api/admin/settings/home-stats');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(mock);
  });
});
