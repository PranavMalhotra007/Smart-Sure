import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Types based on API_Endpoints_Reference.md ──────────────────────────────

export interface ClaimRequest {
  policyId: number;
  amount: number;
}

export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface ClaimResponse {
  claimId: number;
  policyId: number;
  amount: number;
  status: ClaimStatus;
  createdAt: string;
  claimFormUploaded?: boolean;
  aadhaarUploaded?: boolean;
  evidenceUploaded?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ClaimService {

  private claimsApi = environment.claimsApi;  // /api/claims

  constructor(private http: HttpClient) {}

  // ── CUSTOMER CLAIM ENDPOINTS ───────────────────────────────────────────

  // POST /api/claims  (CUSTOMER only)
  // Creates a new DRAFT claim. Customer then uploads 3 docs before submitting.
  // Request Body: { policyId, amount }
  createClaim(request: ClaimRequest): Observable<ClaimResponse> {
    return this.http.post<ClaimResponse>(`${this.claimsApi}`, request);
  }

  // GET /api/claims/{id}  (CUSTOMER or ADMIN)
  getClaimById(id: number): Observable<ClaimResponse> {
    return this.http.get<ClaimResponse>(`${this.claimsApi}/${id}`);
  }

  // GET /api/claims/my  (CUSTOMER only — all claims for the logged-in customer)
  getMyClaims(): Observable<ClaimResponse[]> {
    return this.http.get<ClaimResponse[]>(`${this.claimsApi}/my`);
  }

  // DELETE /api/claims/{id}  (CUSTOMER only — only DRAFT claims)
  deleteClaim(id: number): Observable<void> {
    return this.http.delete<void>(`${this.claimsApi}/${id}`);
  }

  // GET /api/claims/{id}/policy  (CUSTOMER or ADMIN)
  // Fetches the associated policy details for this claim (via Feign → PolicyService)
  getPolicyForClaim(id: number): Observable<any> {
    return this.http.get<any>(`${this.claimsApi}/${id}/policy`);
  }

  // PUT /api/claims/{id}/submit  (CUSTOMER only)
  // All 3 docs must be uploaded first. Transitions: DRAFT → SUBMITTED → UNDER_REVIEW
  submitClaim(id: number): Observable<ClaimResponse> {
    return this.http.put<ClaimResponse>(`${this.claimsApi}/${id}/submit`, {});
  }

  // ── DOCUMENT UPLOAD ENDPOINTS (CUSTOMER only) ──────────────────────────
  // All use multipart/form-data with a single "file" field
  // Does NOT change claim status — call /submit after all 3 docs are uploaded.

  // POST /api/claims/{id}/upload/claim-form
  uploadClaimForm(id: number, file: File): Observable<ClaimResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ClaimResponse>(`${this.claimsApi}/${id}/upload/claim-form`, form);
  }

  // POST /api/claims/{id}/upload/claim-form/generate
  // Generates the PDF server-side from fields + digital signature image
  generateClaimFormPdf(
    id: number,
    policyNumber: string,
    dateClaimFiled: string,          // yyyy-MM-dd
    dateIncidentHappen: string,      // yyyy-MM-dd
    reasonForClaim: string,
    digitalSignature: File
  ): Observable<ClaimResponse> {
    const form = new FormData();
    form.append('policyNumber', policyNumber);
    form.append('dateClaimFiled', dateClaimFiled);
    form.append('dateIncidentHappen', dateIncidentHappen);
    form.append('reasonForClaim', reasonForClaim);
    form.append('digitalSignature', digitalSignature);
    return this.http.post<ClaimResponse>(
      `${this.claimsApi}/${id}/upload/claim-form/generate`,
      form
    );
  }

  // POST /api/claims/{id}/upload/aadhaar
  uploadAadhaar(id: number, file: File): Observable<ClaimResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ClaimResponse>(`${this.claimsApi}/${id}/upload/aadhaar`, form);
  }

  // POST /api/claims/{id}/upload/evidence
  uploadEvidence(id: number, file: File): Observable<ClaimResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ClaimResponse>(`${this.claimsApi}/${id}/upload/evidence`, form);
  }

  // ── DOCUMENT DOWNLOAD ENDPOINTS (CUSTOMER or ADMIN) ────────────────────
  // Returns binary blob — set responseType to 'blob' for file download

  // GET /api/claims/{id}/download/claim-form
  downloadClaimForm(id: number): Observable<Blob> {
    return this.http.get(`${this.claimsApi}/${id}/download/claim-form`, {
      responseType: 'blob'
    });
  }

  // GET /api/claims/{id}/download/aadhaar
  downloadAadhaar(id: number): Observable<Blob> {
    return this.http.get(`${this.claimsApi}/${id}/download/aadhaar`, {
      responseType: 'blob'
    });
  }

  // GET /api/claims/{id}/download/evidence
  downloadEvidence(id: number): Observable<Blob> {
    return this.http.get(`${this.claimsApi}/${id}/download/evidence`, {
      responseType: 'blob'
    });
  }

  // Helper: trigger browser file download from blob response
  triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // ── ADMIN CLAIM ENDPOINTS ──────────────────────────────────────────────

  // GET /api/claims  (ADMIN only)
  getAllClaims(): Observable<ClaimResponse[]> {
    return this.http.get<ClaimResponse[]>(`${this.claimsApi}`);
  }

  // GET /api/claims/under-review  (ADMIN only)
  getUnderReviewClaims(): Observable<ClaimResponse[]> {
    return this.http.get<ClaimResponse[]>(`${this.claimsApi}/under-review`);
  }

  // PUT /api/claims/{id}/status?next={APPROVED|REJECTED}  (ADMIN only)
  moveClaimToStatus(id: number, next: 'APPROVED' | 'REJECTED'): Observable<ClaimResponse> {
    return this.http.put<ClaimResponse>(
      `${this.claimsApi}/${id}/status?next=${next}`,
      {}
    );
  }
}
