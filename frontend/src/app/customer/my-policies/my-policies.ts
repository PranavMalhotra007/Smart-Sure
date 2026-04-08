import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PolicyService } from '../../core/services/policy';

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
  payModalOpen = false;
  payForm!: FormGroup;
  payLoading = false;
  paySuccess = '';
  payError = '';
  pendingPremiums: any[] = [];

  // Cancel modal
  cancelModalOpen = false;
  cancelReason = '';
  cancelLoading = false;
  cancelError = '';

  // Renew modal
  renewModalOpen = false;
  renewForm!: FormGroup;
  renewLoading = false;
  renewError = '';

  constructor(
    private policyService: PolicyService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.payForm = this.fb.group({ premiumId: ['', Validators.required], paymentMethod: ['ONLINE', Validators.required], paymentReference: [''] });
    this.renewForm = this.fb.group({ newStartDate: ['', Validators.required] });
    this.loadPolicies();
  }

  loadPolicies() {
    this.loading = true;
    this.policyService.getMyPolicies(this.page, this.size).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.policies = res?.content || [];
          this.total = res?.totalElements || 0;
          this.totalPages = res?.totalPages || 1;
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

  selectPolicy(p: any) {
    this.selectedPolicy = p;
    this.premiums = [];
    this.premiumsLoading = true;
    this.policyService.getPremiumsByPolicy(p.id).subscribe({
      next: (premiums) => {
        this.ngZone.run(() => {
          // Filter for pending/overdue premiums that are due ON OR BEFORE end of current month
          const now = new Date();
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          
          const filtered = premiums.filter((pr: any) => {
            if (pr.status === 'PAID') return false; // Paid goes to history
            if (pr.status !== 'PENDING' && pr.status !== 'OVERDUE') return false;
            if (!pr.dueDate) return true;
            return new Date(pr.dueDate) <= endOfMonth;
          });

          this.premiums = filtered;
          this.pendingPremiums = filtered;
          this.premiumsLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.premiumsLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }
  closeDetail() { this.selectedPolicy = null; this.premiums = []; }

  openPayModal() {
    this.payForm.reset({ paymentMethod: 'ONLINE', paymentReference: '' });
    if (this.pendingPremiums.length > 0) this.payForm.patchValue({ premiumId: this.pendingPremiums[0].id });
    this.paySuccess = ''; this.payError = '';
    this.payModalOpen = true;
  }

  submitPayment() {
    if (this.payForm.invalid) return;
    this.payLoading = true; this.payError = '';
    const { premiumId, paymentMethod, paymentReference } = this.payForm.value;
    this.policyService.payPremium({ policyId: this.selectedPolicy.id, premiumId: Number(premiumId), paymentMethod, paymentReference } as any).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.payLoading = false; this.paySuccess = 'Payment successful!';
          this.cdr.detectChanges();
          setTimeout(() => { 
            this.ngZone.run(() => {
              this.payModalOpen = false; this.selectPolicy(this.selectedPolicy); 
              this.cdr.detectChanges();
            });
          }, 1800);
        });
      },
      error: (err) => { 
        this.ngZone.run(() => {
          this.payLoading = false; this.payError = err?.error?.message || 'Payment failed.'; 
          this.cdr.detectChanges();
        });
      }
    });
  }

  openCancelModal() { this.cancelReason = ''; this.cancelError = ''; this.cancelModalOpen = true; }
  cancelPolicy() {
    this.cancelLoading = true; this.cancelError = '';
    this.policyService.cancelMyPolicy(this.selectedPolicy.id, this.cancelReason).subscribe({
      next: () => { this.ngZone.run(() => { this.cancelLoading = false; this.cancelModalOpen = false; this.closeDetail(); this.loadPolicies(); }); },
      error: (err) => { this.ngZone.run(() => { this.cancelLoading = false; this.cancelError = err?.error?.message || 'Cancellation failed.'; this.cdr.detectChanges(); }); }
    });
  }

  openRenewModal() {
    this.renewForm.reset(); this.renewError = ''; this.renewModalOpen = true;
  }
  submitRenew() {
    if (this.renewForm.invalid) return;
    this.renewLoading = true; this.renewError = '';
    this.policyService.renewPolicy({ policyId: this.selectedPolicy.id, newStartDate: this.renewForm.value.newStartDate } as any).subscribe({
      next: () => { this.ngZone.run(() => { this.renewLoading = false; this.renewModalOpen = false; this.closeDetail(); this.loadPolicies(); }); },
      error: (err) => { this.ngZone.run(() => { this.renewLoading = false; this.renewError = err?.error?.message || 'Renewal failed.'; this.cdr.detectChanges(); }); }
    });
  }

  fileClaimForPolicy() {
    this.router.navigate(['/customer/file-claim'], { queryParams: { policyId: this.selectedPolicy.id } });
  }

  getStatusClass(s: string): string {
    const m: Record<string,string> = { ACTIVE:'badge-success',APPROVED:'badge-success',CANCELLED:'badge-danger',REJECTED:'badge-danger',EXPIRED:'badge-warning',OVERDUE:'badge-warning',DRAFT:'badge-default',SUBMITTED:'badge-info',UNDER_REVIEW:'badge-info',CREATED:'badge-default',PAID:'badge-success',PENDING:'badge-warning',WAIVED:'badge-default' };
    return m[s] || 'badge-default';
  }
  formatDate(d: string): string { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
  formatCurrency(v: number): string { if(v==null)return '₹0'; return '₹'+Number(v).toLocaleString('en-IN'); }
  prevPage() { if(this.page>0){this.page--;this.loadPolicies();} }
  nextPage() { if(this.page<this.totalPages-1){this.page++;this.loadPolicies();} }
}
