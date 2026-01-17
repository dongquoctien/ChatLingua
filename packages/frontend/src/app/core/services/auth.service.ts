import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  nickname: string | null;
  bio: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  avatar?: string | null;
  nickname?: string | null;
  bio?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface WelcomeGift {
  type: 'egg';
  name: string;
  description: string;
  imageUrl?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  welcomeGifts?: WelcomeGift[];
  isNewUser?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'chatlingua_token';
  private readonly USER_KEY = 'chatlingua_user';

  private currentUserSignal = signal<User | null>(this.getStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        return throwError(() => error.error?.error || 'Login failed');
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        return throwError(() => error.error?.error || 'Registration failed');
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      })
    );
  }

  updateProfile(data: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/auth/profile`, data).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError(error => {
        return throwError(() => error.error?.error || 'Failed to update profile');
      })
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${environment.apiUrl}/auth/password`, data).pipe(
      catchError(error => {
        return throwError(() => error.error?.error || 'Failed to change password');
      })
    );
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUserSignal.set(response.user);
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }
}
