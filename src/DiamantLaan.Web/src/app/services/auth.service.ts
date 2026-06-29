import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthResponse } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = '/api/auth';
  currentUser = signal<AuthResponse | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  register(firstName: string, lastName: string, email: string, password: string, phoneNumber: string, isOraniaResident: boolean) {
    return this.http.post<AuthResponse>(`${this.base}/register`, {
      firstName, lastName, email, password, phoneNumber, isOraniaResident
    }).pipe(tap(res => this.setSession(res)));
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password })
      .pipe(tap(res => this.setSession(res)));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/']);
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
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  }
}
