import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Square } from '../models/square';

/** Public headline numbers for the home and progress pages. */
export interface RoadStats {
  /** Percentage of the road that is fully tarred. */
  progress: number;
  totalRaised: number;
  totalSquares: number;
  /** Squares inside the saleable range — the denominator for funding. */
  saleableSquares: number;
  fundedSquares: number;
  phases: {
    nogNieBeginNie: number;
    voorberei: number;
    besigOmTeTeer: number;
    klaarGeteer: number;
  };
}

const API_BASE = isDevMode() ? 'http://localhost:5000' : '';

@Injectable({ providedIn: 'root' })
export class RoadService {
  private base = `${API_BASE}/api/road`;

  constructor(private http: HttpClient) {}

  getSquares() {
    return this.http.get<Square[]>(`${this.base}/squares`);
  }

  getStats() {
    return this.http.get<RoadStats>(`${this.base}/stats`);
  }

  pickSquares(count: number): Observable<{ squareIds: number[] }> {
    return this.http.get<{ squareIds: number[] }>(`${this.base}/pick-squares`, {
      params: { count },
    });
  }
}
