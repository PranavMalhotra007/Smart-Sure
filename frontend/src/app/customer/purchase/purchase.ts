import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PolicyService } from '../../core/services/policy';
import { PaymentService, PaymentResult } from '../../core/services/payment';

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './purchase.html',
  styleUrl: './purchase.scss'
})
export class Purchase implements OnInit {
  planId: number | null = null;
  plan: any = null;
  planLoading = true;

  form!: FormGroup;
  step: 1 | 2 | 3 = 1;

  calcResult: any = null;
  calcLoading = false;

  submitLoading = false;
  submitError = '';
  purchasedPolicy: any = null;

  // Payment state
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed' = 'idle';
  paymentMessage = '';
  paymentTxnId = '';

  today = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private policyService: PolicyService,
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.planId = Number(this.route.snapshot.queryParamMap.get('planId'));
    this.form = this.fb.group({
      coverageAmount:   ['', [Validators.required, Validators.min(0)]],
      paymentFrequency: ['MONTHLY', Validators.required],
      startDate:        [this.today, Validators.required],
      nomineeName:      ['', Validators.required],
      nomineeRelation:  ['', Validators.required],
      customerAge:      ['', [Validators.required, Validators.min(18), Validators.max(80)]]
    });

    if (this.planId) {
      this.policyService.getPolicyTypeById(this.planId).subscribe({
        next: (p) => {
          this.ngZone.run(() => {
            this.plan = p;
            if (p.minCoverage) this.form.patchValue({ coverageAmount: p.minCoverage });
            this.planLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: () => this.ngZone.run(() => { this.planLoading = false; this.cdr.detectChanges(); })
      });
    } else {
      this.planLoading = false;
    }
  }

  calculatePreview() {
    if (!this.planId || this.form.get('coverageAmount')?.invalid || this.form.get('customerAge')?.invalid) return;
    this.calcLoading = true;
    this.policyService.calculatePremium({
      policyTypeId:     this.planId,
      coverageAmount:   Number(this.form.value.coverageAmount),
      customerAge:      Number(this.form.value.customerAge),
      paymentFrequency: this.form.value.paymentFrequency
    }).subscribe({
      next: (r) => this.ngZone.run(() => { this.calcResult = r; this.calcLoading = false; this.cdr.detectChanges(); }),
      error: ()  => this.ngZone.run(() => { this.calcLoading = false; this.cdr.detectChanges(); })
    });
  }

  nextStep() {
    if (this.step === 1) { this.calculatePreview(); this.step = 2; }
    else if (this.step === 2) this.step = 3;
  }
  prevStep() { if (this.step > 1) this.step = (this.step - 1) as 1 | 2 | 3; }

  // ── Main entry: Open Razorpay then purchase if paid ────────────────────────
  async confirmPurchase() {
    if (this.form.invalid || !this.planId) return;

    this.submitLoading = true;
    this.submitError = '';
    this.paymentStatus = 'processing';
    this.paymentMessage = '';
    this.cdr.detectChanges();

    // Calculate amount from preview or use coverage for estimation
    const amount = this.calcResult?.estimatedPremium ?? Number(this.form.value.coverageAmount) * 0.001;

    try {
      // Step 1: Create Razorpay order
      const order = await this.paymentService.createOrder({
        policyId: this.planId,
        amount,
        paymentFor: 'POLICY_PURCHASE'
      }).toPromise();

      if (!order) {
        this.handlePaymentFailed('Could not initiate payment. Please try again.');
        return;
      }

      // Step 2: Open Razorpay modal
      const result: PaymentResult = await this.paymentService.openRazorpayCheckout(
        order,
        { policyId: this.planId, amount, paymentFor: 'POLICY_PURCHASE' }
      );

      this.ngZone.run(async () => {
        if (result.status === 'SUCCESS') {
          // Step 3: Purchase policy on backend
          await this.doPurchasePolicy(result);
        } else {
          this.handlePaymentFailed(result.message || 'Payment failed. Policy not purchased.');
        }
      });

    } catch (err: any) {
      this.ngZone.run(() => {
        this.handlePaymentFailed(err?.message || 'Payment initiation failed.');
      });
    }
  }

  private doPurchasePolicy(paymentResult: PaymentResult) {
    if (!this.planId) return;
    const payload = {
      policyTypeId:     this.planId as number,
      coverageAmount:   Number(this.form.value.coverageAmount),
      paymentFrequency: this.form.value.paymentFrequency,
      startDate:        this.form.value.startDate,
      nomineeName:      this.form.value.nomineeName,
      nomineeRelation:  this.form.value.nomineeRelation,
      customerAge:      Number(this.form.value.customerAge)
    };

    this.policyService.purchasePolicy(payload).subscribe({
      next: (p) => {
        this.ngZone.run(() => {
          this.purchasedPolicy   = p;
          this.paymentStatus     = 'success';
          this.paymentTxnId      = paymentResult.razorpayPaymentId || paymentResult.transactionId || '';
          this.paymentMessage    = 'Payment successful! Your policy has been activated.';
          this.submitLoading     = false;
          this.step              = 3;
          this.cdr.detectChanges();
        });
      },
      error: (e) => {
        this.ngZone.run(() => {
          // Payment was captured but policy creation failed
          this.paymentStatus  = 'success';   // show payment success
          this.paymentMessage = 'Payment successful, but policy activation had an issue. Please contact support with Payment ID: ' + (paymentResult.razorpayPaymentId || '');
          this.submitLoading  = false;
          this.step           = 3;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private handlePaymentFailed(message: string) {
    this.paymentStatus  = 'failed';
    this.paymentMessage = message;
    this.submitLoading  = false;
    this.submitError    = message;
    this.cdr.detectChanges();
  }

  formatCurrency(v: number) { if (!v) return '₹0'; return '₹' + Number(v).toLocaleString('en-IN'); }
  formatDate(d: string)      { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
}
