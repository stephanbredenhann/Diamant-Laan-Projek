import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Square } from '../models/square';

@Injectable({ providedIn: 'root' })
export class RoadService {
  constructor(private http: HttpClient) {}

  getSquares() {
    return this.http.get<Square[]>('/api/road/squares');
  }
}
