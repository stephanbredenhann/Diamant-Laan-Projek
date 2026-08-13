import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const PENDING_IDS_KEY = 'pendingSquareIds';
const GUEST_PURCHASE_KEY = 'guestPurchase';
const BOU_AANTAL_KEY = 'bouAantal';

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

export interface ShareLink {
  url: string;
  path: string;
}

/** The names printed on this account's certificates: the summary sheet plus one per block. */
export interface CertificateNames {
  sameForAll: boolean;
  summaryName: string;
  blocks: { squareId: number; name: string }[];
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

  /**
   * How many square metres the donor chose in step 1 of the /bou wizard.
   * The map reads this to decide whether it is being shown as an optional
   * wizard step (banner + step bar) or as the standalone map page.
   */
  get bouAantal(): number | null {
    const raw = sessionStorage.getItem(BOU_AANTAL_KEY);
    const n = raw ? Math.floor(Number(raw)) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  set bouAantal(count: number | null) {
    if (count == null || count < 1) {
      sessionStorage.removeItem(BOU_AANTAL_KEY);
    } else {
      sessionStorage.setItem(BOU_AANTAL_KEY, String(count));
    }
  }

  /**
   * Wipes every trace of an in-flight build. Call this at each terminal point of
   * the flow — paid, claimed, cancelled, abandoned. Without it the wizard state
   * outlives the purchase and the map keeps claiming to be "Stap 2 van 4".
   */
  clearBouVloei() {
    this.pendingSquareIds = [];
    this.guestPurchase = null;
    this.bouAantal = null;
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

  createGuestPurchase(squareIds: number[], email: string) {
    return this.http.post<{ purchaseId: number; token: string; amount: number; squareCount: number; paymentStatus: string }>(
      '/api/purchase/guest', { squareIds, email }
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

  getCertificateNames() {
    return this.http.get<CertificateNames>('/api/my-squares/certificate-names');
  }

  /** Saves the whole form in one go and answers with the names as they now stand. */
  saveCertificateNames(names: CertificateNames) {
    return this.http.put<CertificateNames>('/api/my-squares/certificate-names', names);
  }

  getShareLink() {
    return this.http.get<ShareLink>('/api/my-squares/share-link');
  }

  createShareLink() {
    return this.http.post<ShareLink>('/api/my-squares/share-link', {});
  }

  deleteShareLink() {
    return this.http.delete<void>('/api/my-squares/share-link');
  }

  getMyTransactions() {
    return this.http.get<PurchaseTransaction[]>('/api/purchase/mine');
  }
}
