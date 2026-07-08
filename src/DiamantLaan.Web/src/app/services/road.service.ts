import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Square } from '../models/square';

const API_BASE = isDevMode() ? 'http://localhost:5000' : '';

@Injectable({ providedIn: 'root' })
export class RoadService {
  private base = `${API_BASE}/api/road`;

  constructor(private http: HttpClient) {}

  getSquares() {
    return this.http.get<Square[]>(`${this.base}/squares`);
  }

  getStats() {
    return this.http.get<{ progress: number; totalRaised: number }>(`${this.base}/stats`);
  }

  pickSquares(count: number): Observable<{ squareIds: number[] }> {
    return this.http.get<{ squareIds: number[] }>(`${this.base}/pick-squares`, {
      params: { count },
    });
  }
}
