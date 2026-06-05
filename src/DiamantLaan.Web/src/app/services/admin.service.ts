import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SquareStatus } from '../models/square';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  updateStatus(squareIds: number[], status: SquareStatus) {
    return this.http.put<any>('/api/admin/squares/status', {
      squareIds,
      status: Number(status)
    });
  }

  getPurchases() {
    return this.http.get<any[]>('/api/admin/purchases');
  }

  getStats() {
    return this.http.get<any>('/api/admin/stats');
  }
}
