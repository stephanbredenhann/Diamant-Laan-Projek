import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private http: HttpClient) {}

  createPurchase(squareIds: number[]) {
    return this.http.post<{ purchaseId: number; amount: number; squareCount: number }>(
      '/api/purchase', { squareIds }
    );
  }

  getPurchase(id: number) {
    return this.http.get<any>(`/api/purchase/${id}`);
  }

  getMySquares() {
    return this.http.get<any[]>('/api/my-squares');
  }
}
