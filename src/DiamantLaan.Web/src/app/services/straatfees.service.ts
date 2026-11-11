import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PayFastForm } from './purchase.service';

export interface StraatfeesInfo {
  enabled: boolean;
  ticketPrice: number;
  maxPerOrder: number;
}

export interface StraatfeesTicket {
  name: string;
  quantity: number;
  amount: number;
  ticketCode: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Failed';
  confirmedAt: string | null;
}

export interface StraatfeesAdminOrder {
  id: number;
  name: string;
  email: string;
  quantity: number;
  amount: number;
  ticketCode: string;
  status: string;
  payFastPaymentId: string | null;
  createdAt: string;
  confirmedAt: string | null;
  ticketEmailSent: boolean;
}

export interface StraatfeesAdminList {
  enabled: boolean;
  ticketPrice: number;
  orders: StraatfeesAdminOrder[];
}

@Injectable({ providedIn: 'root' })
export class StraatfeesService {
  private http = inject(HttpClient);

  /** Last known on/off state, so the navbar link can follow the admin toggle without refetching. */
  readonly enabled = signal(false);

  info(): Observable<StraatfeesInfo> {
    return this.http.get<StraatfeesInfo>('/api/straatfees/info').pipe(tap(i => this.enabled.set(i.enabled)));
  }

  order(name: string, email: string, quantity: number) {
    return this.http.post<PayFastForm>('/api/straatfees/bestel', { name, email, quantity });
  }

  ticket(code: string) {
    return this.http.get<StraatfeesTicket>(`/api/straatfees/kaartjie/${encodeURIComponent(code)}`);
  }

  adminList() {
    return this.http.get<StraatfeesAdminList>('/api/admin/straatfees');
  }

  setEnabled(enabled: boolean) {
    return this.http.put<{ enabled: boolean }>('/api/admin/straatfees/aktief', { enabled })
      .pipe(tap(r => this.enabled.set(r.enabled)));
  }
}

/** Same hidden-form handoff the block checkout uses. */
export function postToPayFast(form: PayFastForm) {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = form.actionUrl;
  f.style.display = 'none';
  for (const [key, value] of Object.entries(form.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    f.appendChild(input);
  }
  document.body.appendChild(f);
  f.submit();
  document.body.removeChild(f);
}
