import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PayFastForm } from './purchase.service';

export interface StraatfeesInfo {
  enabled: boolean;
  adultPrice: number;
  childPrice: number;
  maxPerOrder: number;
}

export interface StraatfeesTicket {
  name: string;
  adults: number;
  children: number;
  amount: number;
  ticketCode: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Failed';
  confirmedAt: string | null;
}

export interface StraatfeesAdminOrder {
  id: number;
  name: string;
  email: string;
  /** E.164, e.g. +27821234567, or null when the buyer gave none. */
  phone: string | null;
  adults: number;
  children: number;
  amount: number;
  ticketCode: string;
  status: string;
  payFastPaymentId: string | null;
  /** Null for a PayFast order; Cash, EFT or Card for one an admin recorded. */
  paymentMethod: string | null;
  createdAt: string;
  confirmedAt: string | null;
  ticketEmailSent: boolean;
}

export interface StraatfeesManualOrder {
  name: string;
  email: string;
  phoneNumber: string;
  phoneCountryCode: string;
  adults: number;
  children: number;
  paymentMethod: 'Cash' | 'EFT' | 'Card';
}

export interface StraatfeesAdminList {
  enabled: boolean;
  adultPrice: number;
  childPrice: number;
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

  /** The phone is optional: send an empty number for none. */
  order(name: string, email: string, phoneNumber: string, phoneCountryCode: string, adults: number, children: number) {
    return this.http.post<PayFastForm>('/api/straatfees/bestel', { name, email, phoneNumber, phoneCountryCode, adults, children });
  }

  ticket(code: string) {
    return this.http.get<StraatfeesTicket>(`/api/straatfees/kaartjie/${encodeURIComponent(code)}`);
  }

  adminList() {
    return this.http.get<StraatfeesAdminList>('/api/admin/straatfees');
  }

  /** Records a sale paid outside PayFast; it comes back confirmed. */
  adminCreate(order: StraatfeesManualOrder) {
    return this.http.post<StraatfeesAdminOrder>('/api/admin/straatfees/bestellings', order);
  }

  setEnabled(enabled: boolean) {
    return this.http.put<{ enabled: boolean }>('/api/admin/straatfees/aktief', { enabled })
      .pipe(tap(r => this.enabled.set(r.enabled)));
  }
}

/** "2 volwassenes en 1 kind": who a ticket lets in. Matches EmailTemplates.StraatfeesAdmits. */
export function toegang(adults: number, children: number): string {
  const dele: string[] = [];
  if (adults > 0) dele.push(adults === 1 ? '1 volwassene' : `${adults} volwassenes`);
  if (children > 0) dele.push(children === 1 ? '1 kind' : `${children} kinders`);
  return dele.join(' en ');
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
