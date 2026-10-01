import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** A road builder someone can sponsor a block for. The email never leaves the admin side. */
export interface Stadsbouer {
  id: number;
  name: string;
  title: string | null;
  about: string | null;
  hasPhoto: boolean;
  /** Paid for already: the block belongs to this builder. */
  isSponsored: boolean;
  /** Held by a checkout someone is part-way through. Not selectable either. */
  isPending: boolean;
}

@Injectable({ providedIn: 'root' })
export class StadsbouerService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<Stadsbouer[]>('/api/stadsbouers');
  }

  /** Public and unauthenticated, so it goes straight into an <img src>. */
  fotoUrl(id: number) {
    return `/api/stadsbouers/${id}/foto`;
  }
}
