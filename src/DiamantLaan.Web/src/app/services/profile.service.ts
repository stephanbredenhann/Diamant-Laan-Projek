import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProfileResponse } from '../models/user';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private base = '/api/profile';

  constructor(private http: HttpClient) {}

  get() {
    return this.http.get<ProfileResponse>(this.base);
  }

  update(body: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    phoneCountryCode: string;
    receiveBlockProgressEmails: boolean;
  }) {
    return this.http.put<ProfileResponse>(this.base, body);
  }

  updateEmail(email: string, currentPassword: string) {
    return this.http.put<{ message: string; email: string }>(`${this.base}/email`, { email, currentPassword });
  }

  updatePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.http.put<{ message: string }>(`${this.base}/password`, {
      currentPassword, newPassword, confirmPassword
    });
  }
}
