import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClaimService } from '../../core/services/claim';
import { PolicyService } from '../../core/services/policy';
import { AuthService } from '../../core/services/auth';

type Step = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-file-claim',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './file-claim.html',
  styleUrl: './file-claim.scss'
})
export class FileClaim implements OnInit {
  step: Step = 1;
  claimForm!: FormGroup;
  policies: any[] = [];
  claimId: number | null = null;
  submittedClaim: any = null;

  // Files
  claimFormFile: File | null = null;
  aadhaarFile: File | null = null;
  evidenceFile: File | null = null;
  claimFormUploaded = false;
  aadhaarUploaded = false;
  evidenceUploaded = false;

  loading = false;
  uploadingClaimForm = false;
  uploadingAadhaar = false;
  uploadingEvidence = false;
  submitting = false;
  error = '';

  // Digital signature mode
  useGenerateForm = false;
  generateForm!: FormGroup;
  signatureFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private claimService: ClaimService,
    private policyService: PolicyService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.claimForm = this.fb.group({
      policyId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]]
    });

    this.claimForm.get('policyId')?.valueChanges.subscribe(pid => this.updateAmountValidator(pid));
    
    this.generateForm = this.fb.group({
      policyNumber: ['', Validators.required],
      dateClaimFiled: ['', Validators.required],
      dateIncidentHappen: ['', Validators.required],
      reasonForClaim: ['', Validators.required]
    });

    // Initial load
    this.loadPoliciesAndPreFill();

    const cId = this.route.snapshot.queryParamMap.get('claimId');
    if (cId) {
      this.loadDraftClaim(Number(cId));
    }
    // If no claimId param: always start a fresh new claim (do NOT auto-resume drafts)
  }

  loadPoliciesAndPreFill() {
    this.policyService.getMyPolicies(0, 50).subscribe({
      next: res => {
        this.ngZone.run(() => {
          this.policies = (res?.content || []).filter((p: any) => p.status === 'ACTIVE' && (p.leftoverCoverageAmount ?? p.coverageAmount) > 0);
          
          // Pre-fill policyId from query params
          const pid = this.route.snapshot.queryParamMap.get('policyId');
          if (pid) {
            this.claimForm.patchValue({ policyId: pid });
            this.updateAmountValidator(pid);
          }
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  updateAmountValidator(pid: any) {
    const p = this.policies.find((pol: any) => pol.id == pid);
    if (p) {
      const leftover = p.leftoverCoverageAmount ?? p.coverageAmount;
      this.claimForm.get('amount')?.setValidators([Validators.required, Validators.min(1), Validators.max(leftover)]);
      this.claimForm.get('amount')?.updateValueAndValidity();
    } else {
      this.claimForm.get('amount')?.setValidators([Validators.required, Validators.min(1)]);
      this.claimForm.get('amount')?.updateValueAndValidity();
    }
  }

  get selectedPolicy() {
    return this.policies.find(p => p.id == this.claimForm.get('policyId')?.value);
  }

  loadDraftClaim(id: number) {
    this.loading = true;
    this.claimService.getClaimById(id).subscribe({
      next: (claim) => {
        this.ngZone.run(() => {
          this.claimId = claim.claimId || (claim as any).id;
          this.claimFormUploaded = !!claim.claimFormUploaded;
          this.aadhaarUploaded = !!claim.aadhaarUploaded;
          this.evidenceUploaded = !!claim.evidenceUploaded;
          this.step = 2; // Auto-resume from step 2
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

  createClaim() {
    if (this.claimForm.invalid) return;
    this.loading = true; this.error = '';
    const { policyId, amount } = this.claimForm.value;
    this.claimService.createClaim({ policyId: Number(policyId), amount: Number(amount) }).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.claimId = res.claimId || (res as any).id;
          this.loading = false;
          this.step = 2;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err?.error?.message || 'Failed to create claim.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  onFileSelect(event: Event, type: 'claimForm' | 'aadhaar' | 'evidence') {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (type === 'claimForm') this.claimFormFile = f;
    else if (type === 'aadhaar') this.aadhaarFile = f;
    else this.evidenceFile = f;
  }

  onSignatureSelect(event: Event) {
    this.signatureFile = (event.target as HTMLInputElement).files?.[0] || null;
  }

  uploadClaimForm() {
    if (!this.claimId) return;
    if (this.useGenerateForm) {
      if (this.generateForm.invalid || !this.signatureFile) { this.error = 'Please fill all claim form fields and upload signature.'; return; }
      this.uploadingClaimForm = true; this.error = '';
      const { policyNumber, dateClaimFiled, dateIncidentHappen, reasonForClaim } = this.generateForm.value;
      this.claimService.generateClaimFormPdf(this.claimId, policyNumber, dateClaimFiled, dateIncidentHappen, reasonForClaim, this.signatureFile!).subscribe({
        next: () => { this.ngZone.run(() => { this.claimFormUploaded = true; this.uploadingClaimForm = false; this.cdr.detectChanges(); }); },
        error: (e) => { this.ngZone.run(() => { this.error = e?.error?.message || 'Upload failed.'; this.uploadingClaimForm = false; this.cdr.detectChanges(); }); }
      });
    } else {
      if (!this.claimFormFile) { this.error = 'Please select a file.'; return; }
      this.uploadingClaimForm = true; this.error = '';
      this.claimService.uploadClaimForm(this.claimId, this.claimFormFile).subscribe({
        next: () => { this.ngZone.run(() => { this.claimFormUploaded = true; this.uploadingClaimForm = false; this.cdr.detectChanges(); }); },
        error: (e) => { this.ngZone.run(() => { this.error = e?.error?.message || 'Upload failed.'; this.uploadingClaimForm = false; this.cdr.detectChanges(); }); }
      });
    }
  }

  uploadAadhaar() {
    if (!this.claimId || !this.aadhaarFile) { this.error = 'Please select Aadhaar file.'; return; }
    this.uploadingAadhaar = true; this.error = '';
    this.claimService.uploadAadhaar(this.claimId, this.aadhaarFile).subscribe({
      next: () => { this.ngZone.run(() => { this.aadhaarUploaded = true; this.uploadingAadhaar = false; this.cdr.detectChanges(); }); },
      error: (e) => { this.ngZone.run(() => { this.error = e?.error?.message || 'Upload failed.'; this.uploadingAadhaar = false; this.cdr.detectChanges(); }); }
    });
  }

  uploadEvidence() {
    if (!this.claimId || !this.evidenceFile) { this.error = 'Please select evidence file.'; return; }
    this.uploadingEvidence = true; this.error = '';
    this.claimService.uploadEvidence(this.claimId, this.evidenceFile).subscribe({
      next: () => { this.ngZone.run(() => { this.evidenceUploaded = true; this.uploadingEvidence = false; this.cdr.detectChanges(); }); },
      error: (e) => { this.ngZone.run(() => { this.error = e?.error?.message || 'Upload failed.'; this.uploadingEvidence = false; this.cdr.detectChanges(); }); }
    });
  }

  submitClaim() {
    if (!this.claimId || !this.claimFormUploaded || !this.aadhaarUploaded || !this.evidenceUploaded) {
      this.error = 'Please upload all 3 required documents first.'; return;
    }
    this.submitting = true; this.error = '';
    this.claimService.submitClaim(this.claimId).subscribe({
      next: (res) => { this.ngZone.run(() => { this.submittedClaim = res; this.submitting = false; this.step = 4; this.cdr.detectChanges(); }); },
      error: (e) => { this.ngZone.run(() => { this.error = e?.error?.message || 'Submission failed.'; this.submitting = false; this.cdr.detectChanges(); }); }
    });
  }

  get canProceedStep3() { return this.claimFormUploaded && this.aadhaarUploaded && this.evidenceUploaded; }
  formatDate(d: string) { if(!d)return'—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
  formatCurrency(v: number) { if(v==null)return'₹0'; return'₹'+Number(v).toLocaleString('en-IN'); }
}
