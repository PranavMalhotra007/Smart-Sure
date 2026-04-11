import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PolicyService } from '../../core/services/policy';
import { AdminService } from '../../core/services/admin';

@Component({
  selector: 'app-admin-policies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './policies.html',
  styleUrl: './policies.scss'
})
export class AdminPolicies implements OnInit {
  policies: any[] = [];
  filteredPolicies: any[] = [];
  pagedPolicies: any[] = [];
  apPage = 0;
  readonly apPageSize = 10;
  apTotalPages = 0;
  isLoading = true;
  searchQuery = '';
  activeFilter = 'all';

  selectedPolicy: any = null;
  isCancelling = false;
  cancelReason = '';
  showCancelModal = false;
  actionError = '';
  actionSuccess = '';

  constructor(
    private policyService: PolicyService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadPolicies();
  }

  loadPolicies() {
    this.isLoading = true;
    // Use admin endpoint that returns all policies
    this.policyService.getAllPoliciesAdmin(0, 100).subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          const content = res?.content || res || [];
          this.policies = content;
          this.applyFilters();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.policies = [];
          this.filteredPolicies = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilters() {
    let base = this.policies;
    if (this.activeFilter !== 'all') {
      base = base.filter(p => p.status === this.activeFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      base = base.filter(p =>
        (p.policyNumber || '').toLowerCase().includes(q) ||
        String(p.customerId || '').includes(q) ||
        (p.policyType?.name || '').toLowerCase().includes(q)
      );
    }
    this.filteredPolicies = base;
    this.apPage = 0;
    this.updateApPage();
  }

  updateApPage() {
    this.apTotalPages = Math.ceil(this.filteredPolicies.length / this.apPageSize);
    const start = this.apPage * this.apPageSize;
    this.pagedPolicies = this.filteredPolicies.slice(start, start + this.apPageSize);
  }

  goToApPage(p: number) {
    if (p < 0 || p >= this.apTotalPages) return;
    this.apPage = p;
    this.updateApPage();
  }

  get apPageNums(): number[] {
    return Array.from({ length: this.apTotalPages }, (_, i) => i);
  }

  setFilter(f: string) { this.activeFilter = f; this.applyFilters(); }
  onSearch(e: any) { this.searchQuery = e.target.value; this.applyFilters(); }

  openDetail(p: any) {
    this.selectedPolicy = p;
    this.actionError = '';
    this.actionSuccess = '';
  }

  goBack() {
    this.selectedPolicy = null;
    this.showCancelModal = false;
  }

  openCancelModal() {
    this.cancelReason = '';
    this.actionError = '';
    this.showCancelModal = true;
  }

  closeCancelModal() { this.showCancelModal = false; }

  confirmCancel() {
    if (!this.selectedPolicy) return;
    this.isCancelling = true;
    this.actionError = '';

    const policyId = this.selectedPolicy.id ?? this.selectedPolicy.policyId;
    this.adminService.cancelPolicy(policyId, this.cancelReason).subscribe({
      next: (updated: any) => {
        this.ngZone.run(() => {
          const idx = this.policies.findIndex(p => (p.id ?? p.policyId) === policyId);
          if (idx !== -1) {
            this.policies[idx] = { ...this.policies[idx], ...updated };
            this.selectedPolicy = this.policies[idx];
          }
          this.applyFilters();
          this.actionSuccess = 'Policy cancelled successfully.';
          this.isCancelling = false;
          this.showCancelModal = false;
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          const raw = err?.error;
          this.actionError = (typeof raw === 'string' ? raw : raw?.message) || 'Failed to cancel policy.';
          this.isCancelling = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Helpers
  fmt(n: any) { return '₹' + Number(n).toLocaleString('en-IN'); }
  fmtDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusClass(s: string) {
    const m: Record<string, string> = {
      ACTIVE: 'b-active', CREATED: 'b-created',
      EXPIRED: 'b-expired', CANCELLED: 'b-cancelled'
    };
    return m[s] || 'b-created';
  }

  canCancel(p: any): boolean {
    return p?.status === 'ACTIVE' || p?.status === 'CREATED';
  }

  countByStatus(s: string) {
    return s === 'all' ? this.policies.length : this.policies.filter(p => p.status === s).length;
  }
}
