import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { PolicyService } from '../../core/services/policy';
import { ClaimService } from '../../core/services/claim';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class CustomerDashboard implements OnInit {
  userName = '';
  loading = true;
  stats = { totalPolicies: 0, activePolicies: 0, totalClaims: 0, pendingClaims: 0 };
  recentPolicies: any[] = [];
  recentClaims: any[] = [];

  quickActions = [
    { label: 'Buy a Plan', icon: 'shield-plus', route: '/customer/plans', color: '#00b4d8' },
    { label: 'File a Claim', icon: 'file-plus', route: '/customer/file-claim', color: '#f77f00' },
    { label: 'Pay Premium', icon: 'credit-card', route: '/customer/my-policies', color: '#06d6a0' },
    { label: 'My Account', icon: 'user', route: '/customer/account', color: '#a855f7' },
  ];

  constructor(
    private authService: AuthService,
    private policyService: PolicyService,
    private claimService: ClaimService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.authService.getUserInfo(userId).subscribe({
        next: (u) => {
          this.ngZone.run(() => {
            this.userName = u.firstName;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.userName = 'Customer';
            this.cdr.detectChanges();
          });
        }
      });
    }
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    forkJoin({
      policies: this.policyService.getMyPolicies(0, 5).pipe(catchError(() => of({ content: [], totalElements: 0 }))),
      claims: this.claimService.getMyClaims().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ policies, claims }) => {
        this.ngZone.run(() => {
          const policyList = policies?.content || [];
          const claimList = Array.isArray(claims) ? claims : [];

          this.stats.totalPolicies = policies?.totalElements || policyList.length;
          this.stats.activePolicies = policyList.filter((p: any) => p.status === 'ACTIVE').length;
          this.stats.totalClaims = claimList.length;
          this.stats.pendingClaims = claimList.filter((c: any) => ['DRAFT','SUBMITTED','UNDER_REVIEW'].includes(c.status)).length;
          this.recentPolicies = policyList.slice(0, 3);
          this.recentClaims = claimList.slice(0, 3);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string,string> = {
      ACTIVE: 'badge-success', APPROVED: 'badge-success',
      CANCELLED: 'badge-danger', REJECTED: 'badge-danger',
      EXPIRED: 'badge-warning', OVERDUE: 'badge-warning',
      DRAFT: 'badge-default', SUBMITTED: 'badge-info',
      UNDER_REVIEW: 'badge-info', CREATED: 'badge-default'
    };
    return map[status] || 'badge-default';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(v: number): string {
    if (v == null) return '₹0';
    return '₹' + Number(v).toLocaleString('en-IN');
  }
}
