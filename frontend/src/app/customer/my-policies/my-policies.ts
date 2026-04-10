import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PolicyService } from '../../core/services/policy';
import { PaymentService, PaymentResult } from '../../core/services/payment';

@Component({
  selector: 'app-customer-my-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './my-policies.html',
  styleUrl: './my-policies.scss'
})
export class CustomerMyPolicies implements OnInit {
  loading = true;
  policies: any[] = [];
  selectedPolicy: any = null;
  premiums: any[] = [];
  premiumsLoading = false;
  filterStatus = '';
  page = 0; size = 10; total = 0; totalPages = 0;

  // Pay premium modal
  payModalOpen      = false;
  payLoading        = false;
  paySuccess        = '';
  payError          = '';
  pendingPremiums: any[] = [];
  selectedPremium: any = null;

  // Payment result state
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed' = 'idle';
  paymentMessage    = '';
  paymentTxnId      = '';

  // Cancel modal
  cancelModalOpen   = false;
  cancelReason      = '';
  cancelLoading     = false;
  cancelError       = '';

  // Renew modal
  renewModalOpen    = false;
  renewForm!: FormGroup;
  renewLoading      = false;
  renewError        = '';

  constructor(
    private policyService: PolicyService,
    private paymentService: PaymentService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.renewForm = this.fb.group({ newStartDate: ['', Validators.required] });
    this.loadPolicies();
  }

  loadPolicies() {
    this.loading = true;
    this.policyService.getMyPolicies(this.page, this.size).subscribe({
      next: (res) => this.ngZone.run(() => {
        this.policies   = res?.content || [];
        this.total      = res?.totalElements || 0;
        this.totalPages = res?.totalPages || 1;
        this.loading    = false;
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => { this.loading = false; this.cdr.detectChanges(); })
    });
  }

  selectPolicy(p: any) {
    this.selectedPolicy = p;
    this.premiums = [];
    this.premiumsLoading = true;
    this.policyService.getPremiumsByPolicy(p.id).subscribe({
      next: (premiums) => this.ngZone.run(() => {
        const now        = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const filtered   = premiums.filter((pr: any) => {
          if (pr.status === 'PAID') return false;
          if (pr.status !== 'PENDING' && pr.status !== 'OVERDUE') return false;
          if (!pr.dueDate) return true;
          return new Date(pr.dueDate) <= endOfMonth;
        });
        this.premiums        = filtered;
        this.pendingPremiums = filtered;
        this.selectedPremium = filtered.length > 0 ? filtered[0] : null;
        this.premiumsLoading = false;
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => { this.premiumsLoading = false; this.cdr.detectChanges(); })
    });
  }

  closeDetail() { this.selectedPolicy = null; this.premiums = []; }

  // ── Pay Premium with Razorpay ──────────────────────────────────────────────

  openPayModal() {
    this.paySuccess      = '';
    this.payError        = '';
    this.paymentStatus   = 'idle';
    this.paymentMessage  = '';
    this.paymentTxnId    = '';
    this.selectedPremium = this.pendingPremiums.length > 0 ? this.pendingPremiums[0] : null;
    this.payModalOpen    = true;
  }

  selectPremiumToPlay(pr: any) { this.selectedPremium = pr; }

  async payWithRazorpay() {
    if (!this.selectedPremium || !this.selectedPolicy) return;

    this.payLoading     = true;
    this.payError       = '';
    this.paymentStatus  = 'processing';
    this.paymentMessage = '';
    this.cdr.detectChanges();

    const amount    = this.selectedPremium.amount;
    const premiumId = this.selectedPremium.id;
    const policyId  = this.selectedPolicy.id;

    try {
      // Step 1: Create Razorpay order
      const order = await this.paymentService.createOrder({
        policyId,
        premiumId,
        amount,
        paymentFor: 'PREMIUM_PAYMENT'
      }).toPromise();

      if (!order) {
        this.ngZone.run(() => {
          this.paymentStatus  = 'failed';
          this.paymentMessage = 'Could not initiate payment. Please try again.';
          this.payError       = this.paymentMessage;
          this.payLoading     = false;
          this.cdr.detectChanges();
        });
        return;
      }

      // Step 2: Open Razorpay checkout modal
      const result: PaymentResult = await this.paymentService.openRazorpayCheckout(
        order,
        { policyId, premiumId, amount, paymentFor: 'PREMIUM_PAYMENT' }
      );

      this.ngZone.run(() => {
        if (result.status === 'SUCCESS') {
          // Step 3: Record premium payment in PolicyService backend
          this.policyService.payPremium({
            policyId,
            premiumId,
            paymentMethod: 'NET_BANKING',
            paymentReference: result.razorpayPaymentId || result.transactionId
          } as any).subscribe({
            next: () => this.ngZone.run(() => {
              this.paymentStatus  = 'success';
              this.paymentTxnId   = result.razorpayPaymentId || result.transactionId || '';
              this.paymentMessage = 'Premium paid successfully!';
              this.paySuccess     = 'Premium paid successfully!';
              this.payLoading     = false;
              this.cdr.detectChanges();
              setTimeout(() => this.ngZone.run(() => {
                this.payModalOpen = false;
                this.paymentStatus = 'idle';
                this.selectPolicy(this.selectedPolicy);
                this.cdr.detectChanges();
              }), 2500);
            }),
            error: (e: any) => this.ngZone.run(() => {
              // Payment captured in Razorpay but backend sync failed
              this.paymentStatus  = 'success';
              this.paymentTxnId   = result.razorpayPaymentId || '';
              this.paymentMessage = 'Payment received by gateway. Backend sync pending. Contact support if needed. Payment ID: ' + result.razorpayPaymentId;
              this.paySuccess     = this.paymentMessage;
              this.payLoading     = false;
              this.cdr.detectChanges();
            })
          });
        } else {
          this.paymentStatus  = 'failed';
          this.paymentMessage = result.message || 'Payment failed. Please try again.';
          this.payError       = this.paymentMessage;
          this.payLoading     = false;
          this.cdr.detectChanges();
        }
      });

    } catch (err: any) {
      this.ngZone.run(() => {
        this.paymentStatus  = 'failed';
        this.paymentMessage = err?.message || 'Payment initiation failed.';
        this.payError       = this.paymentMessage;
        this.payLoading     = false;
        this.cdr.detectChanges();
      });
    }
  }

  // ── Cancel Policy ──────────────────────────────────────────────────────────

  openCancelModal() { this.cancelReason = ''; this.cancelError = ''; this.cancelModalOpen = true; }

  cancelPolicy() {
    this.cancelLoading = true; this.cancelError = '';
    this.policyService.cancelMyPolicy(this.selectedPolicy.id, this.cancelReason).subscribe({
      next: ()    => this.ngZone.run(() => { this.cancelLoading = false; this.cancelModalOpen = false; this.closeDetail(); this.loadPolicies(); }),
      error: (err) => this.ngZone.run(() => { this.cancelLoading = false; this.cancelError = err?.error?.message || 'Cancellation failed.'; this.cdr.detectChanges(); })
    });
  }

  // ── Renew Policy ───────────────────────────────────────────────────────────

  openRenewModal() { this.renewForm.reset(); this.renewError = ''; this.renewModalOpen = true; }

  submitRenew() {
    if (this.renewForm.invalid) return;
    this.renewLoading = true; this.renewError = '';
    this.policyService.renewPolicy({ policyId: this.selectedPolicy.id, newStartDate: this.renewForm.value.newStartDate } as any).subscribe({
      next: ()    => this.ngZone.run(() => { this.renewLoading = false; this.renewModalOpen = false; this.closeDetail(); this.loadPolicies(); }),
      error: (err) => this.ngZone.run(() => { this.renewLoading = false; this.renewError = err?.error?.message || 'Renewal failed.'; this.cdr.detectChanges(); })
    });
  }

  fileClaimForPolicy() {
    this.router.navigate(['/customer/file-claim'], { queryParams: { policyId: this.selectedPolicy.id } });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getStatusClass(s: string): string {
    const m: Record<string,string> = { ACTIVE:'badge-success', APPROVED:'badge-success', CANCELLED:'badge-danger', REJECTED:'badge-danger', EXPIRED:'badge-warning', OVERDUE:'badge-warning', DRAFT:'badge-default', SUBMITTED:'badge-info', UNDER_REVIEW:'badge-info', CREATED:'badge-default', PAID:'badge-success', PENDING:'badge-warning', WAIVED:'badge-default' };
    return m[s] || 'badge-default';
  }
  getPolicyIcon(status: string): string {
    const m: Record<string,string> = { ACTIVE:'🟢', CANCELLED:'🔴', EXPIRED:'⚪', CREATED:'🔵', DRAFT:'⚫' };
    return m[status] || '📋';
  }
  formatDate(d: string): string { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
  formatCurrency(v: number): string { if (v == null) return '₹0'; return '₹' + Number(v).toLocaleString('en-IN'); }
  prevPage() { if (this.page > 0) { this.page--; this.loadPolicies(); } }
  nextPage() { if (this.page < this.totalPages - 1) { this.page++; this.loadPolicies(); } }
}
