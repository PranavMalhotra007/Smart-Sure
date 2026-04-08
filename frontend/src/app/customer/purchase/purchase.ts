import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PolicyService } from '../../core/services/policy';

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

  today = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private policyService: PolicyService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.planId = Number(this.route.snapshot.queryParamMap.get('planId'));
    this.form = this.fb.group({
      coverageAmount: ['', [Validators.required, Validators.min(0)]],
      paymentFrequency: ['MONTHLY', Validators.required],
      startDate: [this.today, Validators.required],
      nomineeName: ['', Validators.required],
      nomineeRelation: ['', Validators.required],
      customerAge: ['', [Validators.required, Validators.min(18), Validators.max(80)]]
    });

    if (this.planId) {
      this.policyService.getPolicyTypeById(this.planId).subscribe({
        next: (p) => { this.ngZone.run(() => { this.plan = p; if (p.minCoverage) this.form.patchValue({ coverageAmount: p.minCoverage }); this.planLoading = false; this.cdr.detectChanges(); }); },
        error: () => { this.ngZone.run(() => { this.planLoading = false; this.cdr.detectChanges(); }); }
      });
    } else {
      this.planLoading = false;
    }
  }

  calculatePreview() {
    if (!this.planId || this.form.get('coverageAmount')?.invalid || this.form.get('customerAge')?.invalid) return;
    this.calcLoading = true;
    this.policyService.calculatePremium({
      policyTypeId: this.planId,
      coverageAmount: Number(this.form.value.coverageAmount),
      customerAge: Number(this.form.value.customerAge),
      paymentFrequency: this.form.value.paymentFrequency
    }).subscribe({
      next: (r) => { this.ngZone.run(() => { this.calcResult = r; this.calcLoading = false; this.cdr.detectChanges(); }); },
      error: () => { this.ngZone.run(() => { this.calcLoading = false; this.cdr.detectChanges(); }); }
    });
  }

  nextStep() {
    if (this.step === 1) { this.calculatePreview(); this.step = 2; }
    else if (this.step === 2) this.step = 3;
  }
  prevStep() { if (this.step > 1) this.step = (this.step - 1) as 1 | 2 | 3; }

  confirmPurchase() {
    if (this.form.invalid || !this.planId) return;
    this.submitLoading = true; this.submitError = '';
    const payload = {
      policyTypeId: this.planId,
      coverageAmount: Number(this.form.value.coverageAmount),
      paymentFrequency: this.form.value.paymentFrequency,
      startDate: this.form.value.startDate,
      nomineeName: this.form.value.nomineeName,
      nomineeRelation: this.form.value.nomineeRelation,
      customerAge: Number(this.form.value.customerAge)
    };
    this.policyService.purchasePolicy(payload).subscribe({
      next: (p) => { this.ngZone.run(() => { this.purchasedPolicy = p; this.submitLoading = false; this.step = 3; this.cdr.detectChanges(); }); },
      error: (e) => { this.ngZone.run(() => { this.submitError = e?.error?.message || 'Purchase failed. Please try again.'; this.submitLoading = false; this.cdr.detectChanges(); }); }
    });
  }

  formatCurrency(v: number) { if(!v)return'₹0'; return'₹'+Number(v).toLocaleString('en-IN'); }
  formatDate(d: string) { if(!d)return'—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
}
