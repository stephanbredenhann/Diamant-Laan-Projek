import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = '/api/auth';
  currentUser = signal<AuthResponse | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string,
    phoneNumber: string,
    phoneCountryCode: string,
    isOraniaResident: boolean,
    isOraniaBewegingMember: boolean
  ) {
    return this.http.post<AuthResponse>(`${this.base}/register`, {
      firstName, lastName, email, password, confirmPassword, phoneNumber, phoneCountryCode, isOraniaResident, isOraniaBewegingMember
    }, { withCredentials: true }).pipe(tap(res => this.setSession(res)));
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }, { withCredentials: true })
      .pipe(tap(res => this.setSession(res)));
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(email: string, otp: string, newPassword: string, confirmPassword: string) {
    return this.http.post<{ message: string }>(`${this.base}/reset-password`, {
      email, otp, newPassword, confirmPassword
    });
  }

  completeRequiredPasswordChange(newPassword: string, confirmPassword: string) {
    return this.http.post<AuthResponse>(`${this.base}/complete-required-password-change`, {
      newPassword, confirmPassword
    }, { withCredentials: true }).pipe(tap(res => this.setSession(res)));
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/refresh`, {}, { withCredentials: true })
      .pipe(tap(res => this.setSession(res)));
  }

  logout(callApi = true) {
    if (callApi) {
      this.http.post(`${this.base}/logout`, {}, { withCredentials: true }).subscribe({ error: () => {} });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  updateSessionUser(partial: Partial<AuthResponse>) {
    const current = this.currentUser();
    if (!current) return;
    const updated = { ...current, ...partial };
    localStorage.setItem('user', JSON.stringify(updated));
    this.currentUser.set(updated);
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.roles?.includes('Admin') ?? false;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    this.currentUser.set(res);
  }

  private loadUser(): AuthResponse | null {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!stored || !token) return null;
    try { return JSON.parse(stored); } catch { return null; }
  }
}
