import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PolicyService } from '../../core/services/policy';
import { PaymentService } from '../../core/services/payment';
import { forkJoin, map, switchMap, of, catchError } from 'rxjs';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-history.html',
  styleUrl: './payment-history.scss'
})
export class PaymentHistory implements OnInit {
  loading = true;
  history: any[] = [];

  constructor(
    private policyService: PolicyService,
    private paymentService: PaymentService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loading = true;
    this.policyService.getMyPolicies(0, 1000).pipe(
      switchMap(res => {
        const policies = res?.content || [];
        if (policies.length === 0) return of([]);

        // 1. Map policies to a "payment" record indicating policy purchase
        const policyPurchases = policies
          .filter((p: any) => p.status === 'ACTIVE' || p.status === 'EXPIRED') // assumed paid if active/expired
          .map((p: any) => ({
            type: 'Policy Purchase',
            policyNumber: p.policyNumber,
            policyTypeName: p.policyTypeName,
            amount: p.premiumAmount,
            paidDate: p.startDate, // approximate date of payment
            status: 'PAID',
            reference: p.paymentReference || p.id
          }));

        // 2. Fetch all premiums for these policies
        const reqs = policies.map((p: any) => 
          this.policyService.getPremiumsByPolicy(p.id).pipe(
            map(premiums => premiums.map((pr: any) => ({ 
              type: 'Premium Payment',
              policyNumber: p.policyNumber, 
              policyTypeName: p.policyTypeName,
              amount: pr.amount,
              paidDate: pr.paidDate,
              status: pr.status,
              reference: pr.paymentReference || pr.id
            }))),
            catchError(() => of([]))
          )
        );

        return forkJoin(reqs).pipe(
          map(premiumResults => {
            const flatPremiums = [].concat(...(premiumResults as any[])).filter((pr: any) => pr.status === 'PAID');
            return [...policyPurchases, ...flatPremiums];
          })
        );
      })
    ).subscribe({
      next: (combined: any[]) => {
        this.ngZone.run(() => {
          // Sort overall by paid date descending
          combined.sort((a: any, b: any) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());
          this.history = combined;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.history = [];
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
