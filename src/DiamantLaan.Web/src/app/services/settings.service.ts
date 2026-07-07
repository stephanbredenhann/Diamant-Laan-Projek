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
}
