import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AdminProgressImage, SquareStatus } from '../models/square';

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

  getTransactions() {
    return this.http.get<AdminTransaction[]>('/api/admin/transactions');
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

  uploadProgressImage(formData: FormData, replaceExisting = false) {
    if (replaceExisting) {
      formData.append('replaceExisting', 'true');
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
