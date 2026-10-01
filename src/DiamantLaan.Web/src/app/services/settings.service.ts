import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HomeStatsSettings } from '../models/site-settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private http: HttpClient) {}

  getHomeStatsSettings() {
    return this.http.get<HomeStatsSettings>('/api/settings/home-stats');
  }

  updateHomeStatsSettings(settings: HomeStatsSettings) {
    return this.http.put<HomeStatsSettings>('/api/admin/settings/home-stats', settings);
  }

  /** Whether the "Koop vir 'n Stadsbouer" path is offered at all. */
  getStadsbouersEnabled() {
    return this.http.get<{ enabled: boolean }>('/api/settings/stadsbouers');
  }

  setStadsbouersEnabled(enabled: boolean) {
    return this.http.put<{ enabled: boolean }>('/api/admin/settings/stadsbouers', { enabled });
  }
}
