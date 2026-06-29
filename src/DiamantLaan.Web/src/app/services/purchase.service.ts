import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  pendingSquareIds: number[] = [];
  pendingAmountPerBlock = 500;

  constructor(private http: HttpClient) {}

  createPurchase(squareIds: number[], amount?: number) {
    const body: { squareIds: number[]; amount?: number } = { squareIds };
    if (amount != null) body.amount = amount;
    return this.http.post<{ purchaseId: number; amount: number; squareCount: number }>(
      '/api/purchase', body
    );
  }

  getPurchase(id: number) {
    return this.http.get<any>(`/api/purchase/${id}`);
  }

  getMySquares() {
    return this.http.get<any[]>('/api/my-squares');
  }
}
