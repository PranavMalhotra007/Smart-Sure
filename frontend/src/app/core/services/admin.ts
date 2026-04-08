import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Types based on API_Endpoints_Reference.md ──────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  totalPolicies: number;
  activePolicies: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
}

export interface ClaimStatusUpdateRequest {
  remarks: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: number;
  actorId: number;
  details: string;
  timestamp: string;
}

// ───────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private adminApi = environment.adminApi;  // /api/admin

  constructor(private http: HttpClient) {}

  // ── DASHBOARD ──────────────────────────────────────────────────────────
  // GET /api/admin/dashboard-stats
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.adminApi}/dashboard-stats`);
  }

  // ── CLAIMS ─────────────────────────────────────────────────────────────
  // GET /api/admin/claims
  getAllClaims(): Observable<any[]> {
    return this.http.get<any[]>(`${this.adminApi}/claims`);
  }

  // Alias kept for existing dashboard usage (same endpoint)
  getRecentClaims(): Observable<any[]> {
    return this.getAllClaims();
  }

  // GET /api/admin/claims/under-review
  getUnderReviewClaims(): Observable<any[]> {
    return this.http.get<any[]>(`${this.adminApi}/claims/under-review`);
  }

  // GET /api/admin/claims/{claimId}
  getClaimById(claimId: number): Observable<any> {
    return this.http.get<any>(`${this.adminApi}/claims/${claimId}`);
  }

  // PUT /api/admin/claims/{claimId}/review   (SUBMITTED → UNDER_REVIEW)
  // Request: no body; admin ID extracted from JWT by backend
  markClaimUnderReview(claimId: number): Observable<any> {
    return this.http.put<any>(`${this.adminApi}/claims/${claimId}/review`, {});
  }

  // PUT /api/admin/claims/{claimId}/approve   (UNDER_REVIEW → APPROVED)
  // Request Body: { remarks: string }
  approveClaim(claimId: number, remarks: string): Observable<any> {
    const body: ClaimStatusUpdateRequest = { remarks };
    return this.http.put<any>(`${this.adminApi}/claims/${claimId}/approve`, body);
  }

  // PUT /api/admin/claims/{claimId}/reject   (UNDER_REVIEW → REJECTED)
  // Request Body: { remarks: string }
  rejectClaim(claimId: number, remarks: string): Observable<any> {
    const body: ClaimStatusUpdateRequest = { remarks };
    return this.http.put<any>(`${this.adminApi}/claims/${claimId}/reject`, body);
  }

  // ── POLICIES ───────────────────────────────────────────────────────────
  // GET /api/admin/policies
  getAllPolicies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.adminApi}/policies`);
  }

  // GET /api/admin/policies/{policyId}
  getPolicyById(policyId: number): Observable<any> {
    return this.http.get<any>(`${this.adminApi}/policies/${policyId}`);
  }

  // PUT /api/admin/policies/{policyId}/cancel
  // Query Param: reason (optional string)
  cancelPolicy(policyId: number, reason?: string): Observable<any> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return this.http.put<any>(`${this.adminApi}/policies/${policyId}/cancel${params}`, {});
  }

  // ── USERS ──────────────────────────────────────────────────────────────
  // GET /api/admin/users
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.adminApi}/users`);
  }

  // GET /api/admin/users/{userId}
  getUserById(userId: number): Observable<any> {
    return this.http.get<any>(`${this.adminApi}/users/${userId}`);
  }

  // ── AUDIT LOGS ─────────────────────────────────────────────────────────
  // GET /api/admin/audit-logs
  getAllAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.adminApi}/audit-logs`);
  }

  // GET /api/admin/audit-logs/recent?limit={limit}
  getRecentActivity(limit: number = 10): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.adminApi}/audit-logs/recent?limit=${limit}`);
  }

  // GET /api/admin/audit-logs/{entity}/{id}
  // entity: "CLAIM" | "POLICY"
  getEntityAuditHistory(entity: 'CLAIM' | 'POLICY', id: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.adminApi}/audit-logs/${entity}/${id}`);
  }

  // GET /api/admin/audit-logs/range?from={from}&to={to}
  // from/to: ISO DateTime strings e.g. "2025-01-01T00:00:00"
  getAuditLogsByDateRange(from: string, to: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(
      `${this.adminApi}/audit-logs/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
  }

  // ── POLICY TYPES (via Policy Service, Admin-only) ──────────────────────
  // GET /api/policy-types/all  (Admin: includes inactive)
  getAllPolicyTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.policyTypesApi}/all`);
  }
}
