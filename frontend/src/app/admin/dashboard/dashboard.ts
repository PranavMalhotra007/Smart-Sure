import { Component, OnInit, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  isLoading = signal(true);

  totalClaims = signal(0);
  underReview = signal(0);
  totalPolicies = signal(0);
  totalUsers = signal(0);

  recentClaims = signal<any[]>([]);
  activities = signal<any[]>([]);

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  // Keep old property for backward compat with dashboard.html
  get stats() {
    return {
      claims: this.totalClaims(),
      underReview: this.underReview(),
      policies: this.totalPolicies(),
      users: this.totalUsers()
    };
  }

  loadDashboardData() {
    this.isLoading.set(true);

    forkJoin({
      stats: this.adminService.getDashboardStats().pipe(
        catchError((err: any) => {
          console.error('Failed to load stats', err);
          return of(null);
        })
      ),
      claims: this.adminService.getRecentClaims().pipe(
        catchError((err: any) => {
          console.error('Failed to load claims', err);
          return of([]);
        })
      ),
      activities: this.adminService.getRecentActivity(4).pipe(
        catchError((err: any) => {
          console.error('Failed to load activities', err);
          return of([]);
        })
      )
    }).subscribe(({ stats, claims, activities }: any) => {
      this.ngZone.run(() => {
        this.totalClaims.set(stats?.totalClaims || 0);
        this.underReview.set(stats?.pendingClaims || 0);
        this.totalPolicies.set(stats?.totalPolicies || 0);
        this.totalUsers.set(stats?.totalUsers || 0);

        this.recentClaims.set(
          (claims || []).slice(0, 4).map((claim: any) => ({
            id: '#C-' + String(claim.id).padStart(4, '0'),
            name: claim.customer?.firstName
              ? `${claim.customer.firstName} ${claim.customer.lastName || ''}`.trim()
              : (claim.customerId ? `User ${claim.customerId}` : 'Customer'),
            status: claim.status,
            statusClass: this.getStatusClass(claim.status),
            date: claim.createdAt
              ? new Date(claim.createdAt).toLocaleDateString()
              : (claim.timeOfCreation ? new Date(claim.timeOfCreation).toLocaleDateString() : '-')
          }))
        );

        this.activities.set(
          (activities || []).map((log: any) => ({
            event: `${log.action || log.event || ''} — ${log.details || log.reason || ''}`.trim(),
            time: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
            color: this.getActivityColor(log.action || log.event || '')
          }))
        );

        this.isLoading.set(false);
        this.cdr.detectChanges();
      });
    });
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'UNDER_REVIEW': return 'rv';
      case 'APPROVED': return 'ap';
      case 'REJECTED': return 'rj';
      case 'SUBMITTED': return 'sb';
      default: return 'rv';
    }
  }

  private getActivityColor(action: string): string {
    if (action.includes('REJECT') || action.includes('CANCEL')) return '#E24B4A';
    if (action.includes('APPROVE') || action.includes('PURCHASE')) return '#639922';
    return '#534AB7';
  }
}
