import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

// ── Types based on API_Endpoints_Reference.md ──────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'ADMIN';  // API expects: "CUSTOMER" or "ADMIN" (not ROLE_ prefix)
}

export interface AuthResponse {
  token: string;
  role: string;
  userId: number;
}

export interface UserRequest {
  firstName: string;
  lastName: string;
  phone?: number;
  dateOfBirth?: string;    // yyyy-MM-dd
  gender?: string;
}

export interface UserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: number;
  dateOfBirth?: string;
  gender?: string;
}

export interface AddressRequest {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AddressResponse {
  addressId: number;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ───────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private authApi = environment.authApi;    // /api/auth
  private userApi = environment.userApi;    // /user

  constructor(private http: HttpClient, private router: Router) {}

  // ── AUTH ENDPOINTS: POST /api/auth/register ────────────────────────────
  register(userData: RegisterRequest): Observable<string> {
    return this.http.post<string>(`${this.authApi}/register`, userData, {
      responseType: 'text' as 'json'
    });
  }

  // ── AUTH ENDPOINTS: POST /api/auth/login ──────────────────────────────
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authApi}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          this.storeSession(response);
        }
      })
    );
  }

  private storeSession(response: AuthResponse): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    localStorage.setItem('auth_token', response.token);
    
    // Decode token to grab role and 'sub' (which matches userId based on backend JwtUtil)
    const decoded = this.decodeToken(response.token);
    
    if (decoded?.sub) {
      localStorage.setItem('user_id', decoded.sub);
    } else if (response.userId) {
      localStorage.setItem('user_id', String(response.userId));
    }

    if (decoded?.role) {
      localStorage.setItem('user_role', decoded.role);
    } else if (response.role) {
      localStorage.setItem('user_role', response.role);
    }
  }

  logout() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_id');
      localStorage.clear();
      sessionStorage.clear();
    }
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  getRole(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('user_role');
    }
    return null;
  }

  getUserId(): number | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const id = localStorage.getItem('user_id');
      if (id) return Number(id);

      // Fallback: decode token and get 'sub'
      const token = this.getToken();
      if (token) {
        const decoded = this.decodeToken(token);
        if (decoded?.sub) return Number(decoded.sub);
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const decoded = this.decodeToken(token);
    if (decoded?.exp) {
      if (Date.now() >= decoded.exp * 1000) {
        this.logout();
        return false;
      }
      return true;
    }
    return false;
  }

  isAdmin(): boolean {
    const role = this.getRole();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  }

  decodeToken(token: string): any {
    try {
      if (typeof window === 'undefined') return null;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64).split('').map(c =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  // ── USER ENDPOINTS: GET /user/profile ─────────────────────────────────
  getProfile(): Observable<string> {
    return this.http.get<string>(`${this.userApi}/profile`, {
      responseType: 'text' as 'json'
    });
  }

  // ── USER ENDPOINTS: POST /user/addInfo/{userId} ───────────────────────
  addUserInfo(userId: number, data: UserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.userApi}/addInfo/${userId}`, data);
  }

  // ── USER ENDPOINTS: GET /user/getInfo/{userId} ────────────────────────
  getUserInfo(userId: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.userApi}/getInfo/${userId}`);
  }

  // ── USER ENDPOINTS: PUT /user/update/{userId} ─────────────────────────
  updateUser(userId: number, data: UserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.userApi}/update/${userId}`, data);
  }

  // ── USER ENDPOINTS: DELETE /user/delete/{userId} ──────────────────────
  deleteUser(userId: number): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.userApi}/delete/${userId}`);
  }

  // ── USER ENDPOINTS: POST /user/addAddress/{userId} ────────────────────
  addAddress(userId: number, data: AddressRequest): Observable<AddressResponse> {
    return this.http.post<AddressResponse>(`${this.userApi}/addAddress/${userId}`, data);
  }

  // ── USER ENDPOINTS: GET /user/getAddress/{userId} ─────────────────────
  getAddress(userId: number): Observable<AddressResponse> {
    return this.http.get<AddressResponse>(`${this.userApi}/getAddress/${userId}`);
  }

  // ── USER ENDPOINTS: PUT /user/updateAddress/{userId} ──────────────────
  updateAddress(userId: number, data: AddressRequest): Observable<AddressResponse> {
    return this.http.put<AddressResponse>(`${this.userApi}/updateAddress/${userId}`, data);
  }

  // ── USER ENDPOINTS: DELETE /user/deleteAddress/{userId} ───────────────
  deleteAddress(userId: number): Observable<AddressResponse> {
    return this.http.delete<AddressResponse>(`${this.userApi}/deleteAddress/${userId}`);
  }

  // ── USER ENDPOINTS: GET /user/getAll (Admin only, paginated) ──────────
  getAllUsers(
    page = 0,
    size = 5,
    sortBy = 'userId',
    direction = 'asc'
  ): Observable<PageResponse<UserResponse>> {
    return this.http.get<PageResponse<UserResponse>>(
      `${this.userApi}/getAll?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`
    );
  }

  // ── USER ENDPOINTS: PUT /user/changePassword/{userId} ─────────────────
  changePassword(userId: number, data: ChangePasswordRequest): Observable<string> {
    return this.http.put<string>(`${this.userApi}/changePassword/${userId}`, data, {
      responseType: 'text' as 'json'
    });
  }
}
