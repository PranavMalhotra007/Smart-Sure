import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin';
import { ClaimService } from '../../core/services/claim';

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './claims.html',
  styleUrl: './claims.scss'
})
export class Claims implements OnInit {
  claims: any[] = [];
  filteredClaims: any[] = [];
  pagedClaims: any[] = [];
  acPage = 0;
  readonly acPageSize = 10;
  acTotalPages = 0;
  activeTab = 'all';
  activeFilter = 'all';
  searchQuery = '';
  isLoading = true;

  underReviewCount = 0;

  // Selected claim + action modal
  selectedClaim: any = null;
  showActionModal = false;
  actionType: 'APPROVE' | 'REJECT' | 'REVIEW' | null = null;
  remarksInput = '';
  isActioning = false;
  actionError = '';
  actionSuccess = '';

  constructor(private adminService: AdminService,
              private claimService: ClaimService,
              private cdr: ChangeDetectorRef,
              private ngZone: NgZone) {}

  ngOnInit(): void {
    this.fetchClaims();
  }

  // ── GET /api/admin/claims ──────────────────────────────────────────────
  fetchClaims() {
    this.isLoading = true;

    this.adminService.getAllClaims().subscribe({
      next: (data: any[]) => {
        this.ngZone.run(() => {
          this.claims = data || [];
          this.underReviewCount = this.claims.filter(c => c.status === 'UNDER_REVIEW').length;
          this.applyFilters();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          console.warn('Could not reach backend, empty state shown');
          this.claims = [];
          this.underReviewCount = 0;
          this.applyFilters();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── Formatting helpers ─────────────────────────────────────────────────
  fmt(n: number) {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  fmtDate(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  badgeClass(s: string) {
    const map: Record<string, string> = {
      DRAFT: 'b-draft',
      SUBMITTED: 'b-submitted',
      PENDING: 'b-pending',
      UNDER_REVIEW: 'b-review',
      APPROVED: 'b-approved',
      REJECTED: 'b-rejected'
    };
    return map[s] || 'b-pending';
  }

  badgeLabel(s: string) {
    const map: Record<string, string> = {
      DRAFT: 'Draft',
      SUBMITTED: 'Submitted',
      PENDING: 'Pending',
      UNDER_REVIEW: 'Under Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return map[s] || s;
  }

  // ── Filtering / tabs ───────────────────────────────────────────────────
  switchTab(tab: string) {
    this.activeTab = tab;
    this.applyFilters();
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onSearch(event: any) {
    this.searchQuery = event.target.value;
    this.applyFilters();
  }

  applyFilters() {
    let base = this.activeTab === 'review'
      ? this.claims.filter(c => c.status === 'UNDER_REVIEW')
      : this.claims;

    if (this.activeFilter !== 'all') {
      base = base.filter(c => c.status === this.activeFilter);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      base = base.filter(c =>
        String(c.id ?? c.claimId ?? '').includes(q) ||
        (c.policy?.policyNumber && c.policy.policyNumber.toLowerCase().includes(q)) ||
        (c.customer?.firstName && c.customer.firstName.toLowerCase().includes(q))
      );
    }

    this.filteredClaims = base;
    this.acPage = 0;
    this.updateAcPage();
  }

  updateAcPage() {
    this.acTotalPages = Math.ceil(this.filteredClaims.length / this.acPageSize);
    const start = this.acPage * this.acPageSize;
    this.pagedClaims = this.filteredClaims.slice(start, start + this.acPageSize);
  }

  goToAcPage(p: number) {
    if (p < 0 || p >= this.acTotalPages) return;
    this.acPage = p;
    this.updateAcPage();
  }

  get acPageNums(): number[] {
    return Array.from({ length: this.acTotalPages }, (_, i) => i);
  }

  // ── Detail view ────────────────────────────────────────────────────────
  openDetail(claim: any) {
    this.selectedClaim = claim;
    this.actionError = '';
    this.actionSuccess = '';
  }

  goBack() {
    this.selectedClaim = null;
    this.closeActionModal();
  }

  // ── Admin Action Modal ──────────────────────────────────────────────────
  openAction(type: 'APPROVE' | 'REJECT' | 'REVIEW') {
    this.actionType = type;
    this.remarksInput = '';
    this.actionError = '';
    this.actionSuccess = '';
    this.showActionModal = true;
  }

  closeActionModal() {
    this.showActionModal = false;
    this.actionType = null;
    this.remarksInput = '';
    this.isActioning = false;
  }

  confirmAction() {
    if (!this.selectedClaim || !this.actionType) return;

    const claimId = this.selectedClaim.id ?? this.selectedClaim.claimId;
    this.isActioning = true;
    this.actionError = '';

    let request$;

    if (this.actionType === 'REVIEW') {
      // PUT /api/admin/claims/{claimId}/review  — no body needed
      request$ = this.adminService.markClaimUnderReview(claimId);
    } else if (this.actionType === 'APPROVE') {
      // PUT /api/admin/claims/{claimId}/approve  — { remarks }
      request$ = this.adminService.approveClaim(claimId, this.remarksInput);
    } else {
      // PUT /api/admin/claims/{claimId}/reject  — { remarks }
      request$ = this.adminService.rejectClaim(claimId, this.remarksInput);
    }

    request$.subscribe({
      next: (updated: any) => {
        this.ngZone.run(() => {
          // Update claim in local list
          const idx = this.claims.findIndex(
            c => (c.id ?? c.claimId) === claimId
          );
          if (idx !== -1) {
            this.claims[idx] = { ...this.claims[idx], ...updated };
            this.selectedClaim = this.claims[idx];
          }
          this.underReviewCount = this.claims.filter(c => c.status === 'UNDER_REVIEW').length;
          this.applyFilters();

          this.actionSuccess =
            this.actionType === 'APPROVE' ? 'Claim approved successfully.' :
            this.actionType === 'REJECT'  ? 'Claim rejected.' :
                                            'Claim moved to Under Review.';
          this.isActioning = false;
          this.closeActionModal();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.actionError =
            err?.error?.message || err?.error || 'Action failed. Please try again.';
          this.isActioning = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Whether the action buttons should show in the detail view
  canMarkReview(claim: any): boolean {
    return claim?.status === 'SUBMITTED';
  }

  canApproveOrReject(claim: any): boolean {
    return claim?.status === 'UNDER_REVIEW';
  }

  // ── Download document for UNDER_REVIEW claims ─────────────────────────
  downloadClaimFormFile(claim: any) {
    const id = claim.id ?? claim.claimId;
    this.claimService.downloadClaimForm(id).subscribe(blob => {
      this.claimService.triggerDownload(blob, `claim-${id}-form.pdf`);
    });
  }
  
  downloadAadhaarFile(claim: any) {
    const id = claim.id ?? claim.claimId;
    this.claimService.downloadAadhaar(id).subscribe(blob => {
      this.claimService.triggerDownload(blob, `claim-${id}-aadhaar.pdf`);
    });
  }

  downloadEvidenceFile(claim: any) {
    const id = claim.id ?? claim.claimId;
    this.claimService.downloadEvidence(id).subscribe(blob => {
      this.claimService.triggerDownload(blob, `claim-${id}-evidence.pdf`);
    });
  }

  hasDocument(claim: any): boolean {
    return !!(claim?.claimFormUploaded || claim?.aadhaarCardUploaded || claim?.evidencesUploaded);
  }
}
