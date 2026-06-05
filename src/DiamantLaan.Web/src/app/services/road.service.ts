import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Square } from '../models/square';

@Injectable({ providedIn: 'root' })
export class RoadService {
  constructor(private http: HttpClient) {}

  getSquares() {
    return this.http.get<Square[]>('/api/road/squares');
  }

  getStats() {
    return this.http.get<{ progress: number; totalRaised: number }>('/api/road/stats');
  }
}
