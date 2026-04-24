import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PolicyService } from '../../core/services/policy';
import { forkJoin, map, switchMap, of, catchError } from 'rxjs';

@Component({
  selector: 'app-premium-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './premium-history.html',
  styleUrl: './premium-history.scss'
})
export class PremiumHistory implements OnInit {
  loading = true;
  history: any[] = [];

  constructor(
    private policyService: PolicyService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loading = true;
    this.policyService.getMyPolicies(0, 1000).pipe(
      switchMap(res => {
        const policies = res?.content || [];
        if (policies.length === 0) return of([]);
        const reqs = policies.map((p: any) => 
          this.policyService.getPremiumsByPolicy(p.id).pipe(
            map(premiums => premiums.map((pr: any) => ({ ...pr, policyNumber: p.policyNumber, policyTypeName: p.policyType?.name || 'Insurance Policy' }))),
            catchError(() => of([]))
          )
        );
        return forkJoin(reqs);
      })
    ).subscribe({
      next: (results: any) => {
        this.ngZone.run(() => {
          let flat = [].concat(...results);
          // Only show paid premiums
          flat = flat.filter((pr: any) => pr.status === 'PAID');
          // Sort by paid date descending
          flat.sort((a: any, b: any) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());
          this.history = flat;
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

  formatDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(v: number) {
    if (!v) return '₹0';
    return '₹' + Number(v).toLocaleString('en-IN');
  }
}
