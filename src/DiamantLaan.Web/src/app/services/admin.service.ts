import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AdminProgressImage, SquareStatus } from '../models/square';

export type PaymentMethod = 'EFT' | 'Cash' | 'Card' | 'Bitcoin' | 'PayPal';

/** Methods where an admin can attach a PDF proof of payment. */
export const PROOF_METHODS: PaymentMethod[] = ['EFT', 'Bitcoin', 'PayPal'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFT: 'EFT',
  Cash: 'Kontant',
  Card: 'Kaart',
  Bitcoin: 'Bitcoin',
  PayPal: 'PayPal'
};

export interface AdminTransaction {
  id: number;
  purchaseDate: string;
  amount: number;
  squareCount: number;
  amountPerBlock: number;
  squareIds: number[];
  paymentStatus: string;
  userName?: string;
  userEmail?: string;
  payFastPaymentId?: string | null;
  purchaseSource: 'PayFast' | 'TelefonieseAankoop';
  hasProof?: boolean;
  paymentMethod?: PaymentMethod | null;
}

export interface ImageConflictResult {
  conflictingSquareIds: number[];
  totalSelected: number;
}

export interface UploadProgressImageResult {
  id: number;
  status: number;
  squareCount: number;
  caption?: string;
  replacedCount?: number;
  skippedCount?: number;
}

export interface KiesVirMyOffset {
  /** Inclusive lowest block "Kies vir my" hands out first. 0 = normal lowest-first. */
  offset: number;
  availableAtOrAboveOffset: number;
}

export interface UndoLastSummary {
  statusChangeCount: number;
  hasPhoto: boolean;
  willCancelEmails: boolean;
}

export interface UndoLastInfo {
  available: boolean;
  expiresAt?: string | null;
  summary?: UndoLastSummary | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  updateStatus(squareIds: number[], status: SquareStatus, undoBatchId?: string) {
    return this.http.put<any>('/api/admin/squares/status', {
      squareIds,
      status: Number(status),
      undoBatchId: undoBatchId || undefined
    });
  }

  /** Holds blocks back from public sale, or releases them again. */
  reserveSquares(squareIds: number[], reserved: boolean) {
    return this.http.put<{ updated: number }>('/api/admin/squares/reserve', { squareIds, reserved });
  }

  getUndoLast() {
    return this.http.get<UndoLastInfo>('/api/admin/squares/undo-last');
  }

  undoLast() {
    return this.http.post<{ message: string }>('/api/admin/squares/undo-last', {});
  }

  getPurchases() {
    return this.http.get<any[]>('/api/admin/purchases');
  }

  getCertificateSummary(userId: string) {
    return this.http.get<{
      ownerName: string;
      /** False when the buyer split their blocks, so each one prints its own name. */
      sameForAll: boolean;
      squares: { id: number; purchaseDate?: string | null; ownerName: string }[];
    }>(`/api/admin/users/${encodeURIComponent(userId)}/certificate-summary`);
  }

  getTransactions() {
    return this.http.get<AdminTransaction[]>(`/api/admin/transactions?_=${Date.now()}`, {
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      })
    });
  }

  /** Permanent: releases the blocks too. The admin's own password is re-checked server-side. */
  deleteTransaction(id: number, password: string) {
    return this.http.post(`/api/admin/transactions/${id}/delete`, { password });
  }

  getKiesVirMyOffset() {
    return this.http.get<KiesVirMyOffset>('/api/admin/settings/kies-offset');
  }

  setKiesVirMyOffset(offset: number) {
    return this.http.put<KiesVirMyOffset>('/api/admin/settings/kies-offset', { offset });
  }

  getStats() {
    return this.http.get<any>('/api/admin/stats');
  }

  getRegisteredNoPurchase() {
    return this.http.get<any[]>('/api/admin/registered-no-purchase');
  }

  makeAdmin(email: string) {
    return this.http.post<any>('/api/admin/users/make-admin', { email });
  }

  manualPurchase(formData: FormData) {
    return this.http.post<any>('/api/admin/manual-purchase', formData);
  }

  getProofOfPayment(id: number) {
    return this.http.get(`/api/admin/purchases/${id}/proof`, { responseType: 'blob' });
  }

  uploadProofOfPayment(id: number, file: File) {
    const formData = new FormData();
    formData.append('proofOfPayment', file);
    return this.http.post<{ hasProof: boolean }>(`/api/admin/purchases/${id}/proof`, formData);
  }

  deleteProofOfPayment(id: number) {
    return this.http.delete<{ hasProof: boolean }>(`/api/admin/purchases/${id}/proof`);
  }

  checkImageConflicts(squareIds: number[], status: SquareStatus) {
    let params = new HttpParams().set('status', String(status));
    for (const id of squareIds) {
      params = params.append('squareIds', String(id));
    }
    return this.http.get<ImageConflictResult>('/api/admin/squares/images/conflicts', { params });
  }

  getProgressImages() {
    return this.http.get<AdminProgressImage[]>('/api/admin/squares/images');
  }

  uploadProgressImage(formData: FormData, replaceExisting = false, undoBatchId?: string) {
    if (replaceExisting) {
      formData.append('replaceExisting', 'true');
    }
    if (undoBatchId) {
      formData.append('undoBatchId', undoBatchId);
    }
    return this.http.post<UploadProgressImageResult>('/api/admin/squares/images', formData);
  }

  replaceProgressImage(id: number, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.put<{ id: number; message: string }>(`/api/admin/squares/images/${id}`, formData);
  }

  deleteProgressImage(id: number) {
    return this.http.delete<any>(`/api/admin/squares/images/${id}`);
  }
}
