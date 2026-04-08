import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Types based on API_Endpoints_Reference.md ──────────────────────────────

export interface PolicyPurchaseRequest {
  policyTypeId: number;
  coverageAmount: number;
  paymentFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  startDate: string;          // yyyy-MM-dd
  nomineeName: string;
  nomineeRelation: string;
  customerAge: number;
}

export interface PolicyRenewalRequest {
  policyId: number;
  newStartDate: string;       // yyyy-MM-dd
}

export interface PremiumPaymentRequest {
  policyId: number;
  premiumId?: number;
  amount?: number;
  paymentMethod?: 'ONLINE' | 'NEFT' | 'CHEQUE' | 'CASH';
  paymentReference?: string;
}

export interface PremiumCalculationRequest {
  policyTypeId: number;
  coverageAmount: number;
  customerAge: number;
  paymentFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
}

export interface PremiumCalculationResponse {
  estimatedPremium: number;
  annualPremium: number;
  coverageAmount: number;
}

export interface PolicyStatusUpdateRequest {
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED';
  remarks: string;
}

export interface PolicyTypeRequest {
  name: string;
  category: 'LIFE' | 'HEALTH' | 'AUTO' | 'HOME' | 'TRAVEL' | 'BUSINESS';
  description: string;
  baseRate: number;
  minCoverage: number;
  maxCoverage: number;
  durationMonths?: number;
  // Legacy fields still accepted by form
  basePremium?: number;
  baseCoverageAmount?: number;
}

// ───────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class PolicyService {

  private policiesApi = environment.policiesApi;       // /api/policies
  private policyTypesApi = environment.policyTypesApi; // /api/policy-types

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════════════════
  // POLICY TYPES — /api/policy-types
  // ══════════════════════════════════════════════════════════════════════

  // GET /api/policy-types  (PUBLIC — active types for customer catalog)
  getActivePolicyTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.policyTypesApi}`);
  }

  // GET /api/policy-types/all  (ADMIN only — all including inactive)
  getPolicyTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.policyTypesApi}/all`);
  }

  // GET /api/policy-types/{id}  (PUBLIC)
  getPolicyTypeById(id: number): Observable<any> {
    return this.http.get<any>(`${this.policyTypesApi}/${id}`);
  }

  // GET /api/policy-types/category/{category}  (PUBLIC)
  getPolicyTypesByCategory(category: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.policyTypesApi}/category/${category}`);
  }

  // POST /api/policy-types  (ADMIN only)
  // Request Body: PolicyTypeRequest
  createPolicyType(policyType: PolicyTypeRequest): Observable<any> {
    return this.http.post<any>(`${this.policyTypesApi}`, policyType);
  }

  // PUT /api/policy-types/{id}  (ADMIN only)
  // Request Body: PolicyTypeRequest (full update)
  updatePolicyType(id: number, policyType: PolicyTypeRequest): Observable<any> {
    return this.http.put<any>(`${this.policyTypesApi}/${id}`, policyType);
  }

  // DELETE /api/policy-types/{id}  (ADMIN only — soft delete/discontinue)
  // Response: 200 plain text
  deletePolicyType(id: number): Observable<any> {
    return this.http.delete(`${this.policyTypesApi}/${id}`, { responseType: 'text' });
  }

  // ══════════════════════════════════════════════════════════════════════
  // POLICIES — /api/policies
  // ══════════════════════════════════════════════════════════════════════

  // POST /api/policies/purchase  (CUSTOMER only)
  // Customer ID is extracted from JWT by the backend — do not send it
  purchasePolicy(request: PolicyPurchaseRequest): Observable<any> {
    return this.http.post<any>(`${this.policiesApi}/purchase`, request);
  }

  // GET /api/policies/my  (CUSTOMER only, paginated)
  getMyPolicies(
    page = 0,
    size = 10,
    sortBy = 'createdAt',
    direction = 'desc'
  ): Observable<any> {
    return this.http.get<any>(
      `${this.policiesApi}/my?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`
    );
  }

  // GET /api/policies/{policyId}  (Any authenticated user)
  getPolicyById(policyId: number): Observable<any> {
    return this.http.get<any>(`${this.policiesApi}/${policyId}`);
  }

  // PUT /api/policies/{policyId}/cancel  (CUSTOMER only)
  cancelMyPolicy(policyId: number, reason?: string): Observable<any> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return this.http.put<any>(`${this.policiesApi}/${policyId}/cancel${params}`, {});
  }

  // POST /api/policies/renew  (CUSTOMER only)
  renewPolicy(request: PolicyRenewalRequest): Observable<any> {
    return this.http.post<any>(`${this.policiesApi}/renew`, request);
  }

  // POST /api/policies/premiums/pay  (CUSTOMER only)
  payPremium(request: PremiumPaymentRequest): Observable<any> {
    return this.http.post<any>(`${this.policiesApi}/premiums/pay`, request);
  }

  // GET /api/policies/{policyId}/premiums  (Any authenticated user)
  getPremiumsByPolicy(policyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.policiesApi}/${policyId}/premiums`);
  }

  // POST /api/policies/calculate-premium  (PUBLIC — no auth needed)
  calculatePremium(request: PremiumCalculationRequest): Observable<PremiumCalculationResponse> {
    return this.http.post<PremiumCalculationResponse>(
      `${this.policiesApi}/calculate-premium`,
      request
    );
  }

  // ── ADMIN POLICY ENDPOINTS ──────────────────────────────────────────────

  // GET /api/policies/admin/all  (ADMIN only, paginated)
  getAllPoliciesAdmin(
    page = 0,
    size = 20,
    sortBy = 'createdAt',
    direction = 'desc'
  ): Observable<any> {
    return this.http.get<any>(
      `${this.policiesApi}/admin/all?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`
    );
  }

  // PUT /api/policies/admin/{policyId}/status  (ADMIN only)
  // Request Body: { status, remarks }
  adminUpdatePolicyStatus(policyId: number, request: PolicyStatusUpdateRequest): Observable<any> {
    return this.http.put<any>(`${this.policiesApi}/admin/${policyId}/status`, request);
  }

  // GET /api/policies/admin/summary  (ADMIN only)
  getPolicySummary(): Observable<any> {
    return this.http.get<any>(`${this.policiesApi}/admin/summary`);
  }
}
