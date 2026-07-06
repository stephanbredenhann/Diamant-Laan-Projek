import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const PENDING_IDS_KEY = 'pendingSquareIds';
const PENDING_AMOUNT_KEY = 'pendingAmountPerBlock';

export interface PayFastForm {
  actionUrl: string;
  fields: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private http: HttpClient) {}

  get pendingSquareIds(): number[] {
    const raw = sessionStorage.getItem(PENDING_IDS_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  set pendingSquareIds(ids: number[]) {
    if (ids.length === 0) {
      sessionStorage.removeItem(PENDING_IDS_KEY);
    } else {
      sessionStorage.setItem(PENDING_IDS_KEY, JSON.stringify(ids));
    }
  }

  get pendingAmountPerBlock(): number {
    const raw = sessionStorage.getItem(PENDING_AMOUNT_KEY);
    return raw ? Number(raw) : 500;
  }

  set pendingAmountPerBlock(amount: number) {
    sessionStorage.setItem(PENDING_AMOUNT_KEY, String(amount || 500));
  }

  createPurchase(squareIds: number[], amount?: number) {
    const body = { squareIds, amount };
    return this.http.post<{ purchaseId: number; amount: number; squareCount: number; paymentStatus: string }>(
      '/api/purchase', body
    );
  }

  getPayFastForm(purchaseId: number) {
    return this.http.post<PayFastForm>(`/api/purchase/${purchaseId}/pay`, {});
  }

  cancelPurchase(purchaseId: number) {
    return this.http.post<{ purchaseId: number; paymentStatus: string }>(`/api/purchase/${purchaseId}/cancel`, {});
  }

  getPurchase(id: number) {
    return this.http.get<{ id: number; amount: number; purchaseDate: string; paymentStatus: string; squares: number[] }>(`/api/purchase/${id}`);
  }

  simulateItn(purchaseId: number) {
    return this.http.post<{ purchaseId: number; paymentStatus: string }>('/api/payment/simulate-itn', { purchaseId });
  }

  getMySquares() {
    return this.http.get<{ id: number; status: number; imageCount?: number }[]>('/api/my-squares');
  }

  getMySummary() {
    return this.http.get<{ blockCount: number; totalSpent: number }>('/api/my-squares/summary');
  }
}
