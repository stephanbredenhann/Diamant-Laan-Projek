import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const PENDING_IDS_KEY = 'pendingSquareIds';
const GUEST_PURCHASE_KEY = 'guestPurchase';

export interface PayFastForm {
  actionUrl: string;
  fields: Record<string, string>;
}

/** Identifies a purchase made without an account. The token is a one-time bearer secret. */
export interface GuestPurchaseRef {
  purchaseId: number;
  token: string;
}

export interface GuestPurchase {
  id: number;
  amount: number;
  purchaseDate: string;
  paymentStatus: string;
  squares: number[];
  certificateName: string | null;
  email: string | null;
}

export interface PurchaseTransaction {
  id: number;
  purchaseDate: string;
  amount: number;
  squareCount: number;
  amountPerBlock: number;
  squareIds: number[];
  paymentStatus: string;
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

  /** The guest purchase this browser tab is busy with, if any. */
  get guestPurchase(): GuestPurchaseRef | null {
    const raw = sessionStorage.getItem(GUEST_PURCHASE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as GuestPurchaseRef;
      return parsed?.purchaseId && parsed?.token ? parsed : null;
    } catch {
      return null;
    }
  }

  set guestPurchase(ref: GuestPurchaseRef | null) {
    if (!ref) {
      sessionStorage.removeItem(GUEST_PURCHASE_KEY);
    } else {
      sessionStorage.setItem(GUEST_PURCHASE_KEY, JSON.stringify(ref));
    }
  }

  createPurchase(squareIds: number[]) {
    const body = { squareIds };
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

  createGuestPurchase(squareIds: number[], email?: string | null) {
    return this.http.post<{ purchaseId: number; token: string; amount: number; squareCount: number; paymentStatus: string }>(
      '/api/purchase/guest', { squareIds, email: email || null }
    );
  }

  getGuestPayFastForm(ref: GuestPurchaseRef) {
    return this.http.post<PayFastForm>(`/api/purchase/guest/${ref.purchaseId}/pay`, { token: ref.token });
  }

  getGuestPurchase(ref: GuestPurchaseRef) {
    return this.http.get<GuestPurchase>(
      `/api/purchase/guest/${ref.purchaseId}`, { params: { token: ref.token } }
    );
  }

  cancelGuestPurchase(ref: GuestPurchaseRef) {
    return this.http.post<{ purchaseId: number; paymentStatus: string }>(
      `/api/purchase/guest/${ref.purchaseId}/cancel`, { token: ref.token }
    );
  }

  setGuestCertificateName(ref: GuestPurchaseRef, name: string) {
    return this.http.post<{ certificateName: string }>(
      `/api/purchase/guest/${ref.purchaseId}/certificate-name`, { token: ref.token, name }
    );
  }

  /** Attaches a guest purchase to the account that is currently signed in. */
  claimGuestPurchase(ref: GuestPurchaseRef) {
    return this.http.post<{ purchaseId: number }>(
      `/api/purchase/guest/${ref.purchaseId}/claim`, { token: ref.token }
    );
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

  getMyTransactions() {
    return this.http.get<PurchaseTransaction[]>('/api/purchase/mine');
  }
}
