import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClaimService } from '../../core/services/claim';

@Component({
  selector: 'app-my-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-claims.html',
  styleUrl: './my-claims.scss'
})
export class MyClaims implements OnInit {
  loading = true;
  claims: any[] = [];
  filteredClaims: any[] = [];
  pagedClaims: any[] = [];
  claimPage = 0;
  readonly claimPageSize = 10;
  claimTotalPages = 0;
  selectedClaim: any = null;
  filterStatus = '';
  error = '';

  // Delete
  deleteLoading = false;
  deleteError = '';

  statuses = ['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED'];

  constructor(
    private claimService: ClaimService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() { this.loadClaims(); }

  loadClaims() {
    this.loading = true;
    this.claimService.getMyClaims().subscribe({
      next: (claims) => {
        this.ngZone.run(() => {
          this.claims = claims;
          this.applyFilter();
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err?.error?.message || 'Failed to load claims.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilter() {
    this.filteredClaims = this.filterStatus
      ? this.claims.filter(c => c.status === this.filterStatus)
      : [...this.claims];
    this.claimPage = 0;
    this.updateClaimsPage();
  }

  updateClaimsPage() {
    this.claimTotalPages = Math.ceil(this.filteredClaims.length / this.claimPageSize);
    const start = this.claimPage * this.claimPageSize;
    this.pagedClaims = this.filteredClaims.slice(start, start + this.claimPageSize);
  }

  goToClaimPage(p: number) {
    if (p < 0 || p >= this.claimTotalPages) return;
    this.claimPage = p;
    this.updateClaimsPage();
  }

  get claimPageNums(): number[] {
    return Array.from({ length: this.claimTotalPages }, (_, i) => i);
  }

  countByStatus(s: string): number {
    return this.claims.filter(c => c.status === s).length;
  }

  selectClaim(c: any) { this.selectedClaim = c; this.deleteError = ''; }
  closeDetail() { this.selectedClaim = null; }

  deleteClaim(id: number) {
    if (!confirm('Delete this draft claim?')) return;
    this.deleteLoading = true; this.deleteError = '';
    this.claimService.deleteClaim(id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.deleteLoading = false;
          this.closeDetail();
          this.loadClaims();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.deleteLoading = false;
          this.deleteError = err?.error?.message || 'Delete failed.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  getStatusClass(s: string): string {
    const m: Record<string,string> = {ACTIVE:'badge-success',APPROVED:'badge-success',CANCELLED:'badge-danger',REJECTED:'badge-danger',EXPIRED:'badge-warning',OVERDUE:'badge-warning',DRAFT:'badge-default',SUBMITTED:'badge-info',UNDER_REVIEW:'badge-info',CREATED:'badge-default',PAID:'badge-success',PENDING:'badge-warning',WAIVED:'badge-default'};
    return m[s] || 'badge-default';
  }

  getStatusDescription(s: string): string {
    const d: Record<string,string> = {
      DRAFT: 'Claim created. Upload all 3 documents to proceed.',
      SUBMITTED: 'Documents submitted. Awaiting review.',
      UNDER_REVIEW: 'Our team is reviewing your claim.',
      APPROVED: 'Your claim has been approved!',
      REJECTED: 'Your claim was not approved.'
    };
    return d[s] || s;
  }

  formatDate(d: string): string { if(!d)return'—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  formatCurrency(v: number): string { if(v==null)return'₹0'; return'₹'+Number(v).toLocaleString('en-IN'); }
}
