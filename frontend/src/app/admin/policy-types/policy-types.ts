import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PolicyService } from '../../core/services/policy';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-policy-types',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './policy-types.html',
  styleUrl: './policy-types.scss'
})
export class PolicyTypes implements OnInit {
  policyTypes: any[] = [];
  isLoading = true;
  showAddModal = false;
  showEditModal = false;
  editingId: number | null = null;
  isSubmitting = false;
  errorMsg = '';
  successMsg = '';

  form: FormGroup;

  constructor(
    private policyService: PolicyService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    // Field names must exactly match the backend PolicyTypeRequest DTO:
    // name, description, category, basePremium, maxCoverageAmount,
    // deductibleAmount, termMonths, minAge, maxAge, coverageDetails
    this.form = this.fb.group({
      name:              ['', Validators.required],
      description:       [''],
      category:          ['LIFE', Validators.required],
      basePremium:       [null, [Validators.required, Validators.min(0.01)]],
      maxCoverageAmount: [null, [Validators.required, Validators.min(1000)]],
      deductibleAmount:  [0,    [Validators.required, Validators.min(0)]],
      termMonths:        [12,   [Validators.required, Validators.min(1)]],
      minAge:            [null],
      maxAge:            [null],
      coverageDetails:   [''],
    });
  }

  ngOnInit() {
    this.loadTypes();
  }

  // ── GET /api/policy-types/all  (ADMIN — includes inactive) ────────────
  loadTypes() {
    this.isLoading = true;
    this.policyService.getPolicyTypes().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.policyTypes = res;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Failed to load policy types', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  openAddModal() {
    this.showAddModal = true;
    this.showEditModal = false;
    this.editingId = null;
    this.form.reset({
      category: 'LIFE',
      basePremium: null,
      maxCoverageAmount: null,
      deductibleAmount: 0,
      termMonths: 12,
      minAge: null,
      maxAge: null,
    });
    this.errorMsg = '';
    this.successMsg = '';
  }

  openEditModal(pt: any) {
    this.editingId = pt.id;
    this.showEditModal = true;
    this.showAddModal = false;
    this.form.patchValue({
      name:              pt.name,
      description:       pt.description || '',
      category:          pt.category || 'LIFE',
      basePremium:       pt.basePremium ?? pt.baseRate ?? null,
      maxCoverageAmount: pt.maxCoverageAmount ?? pt.maxCoverage ?? null,
      deductibleAmount:  pt.deductibleAmount ?? 0,
      termMonths:        pt.termMonths ?? pt.durationMonths ?? 12,
      minAge:            pt.minAge ?? null,
      maxAge:            pt.maxAge ?? null,
      coverageDetails:   pt.coverageDetails || '',
    });
    this.errorMsg = '';
    this.successMsg = '';
  }

  closeModal() {
    this.showAddModal = false;
    this.showEditModal = false;
    this.editingId = null;
  }

  // ── POST /api/policy-types  (ADMIN) ───────────────────────────────────
  onAddSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';

    // Send only the fields the backend DTO expects
    const payload = this.buildPayload();

    this.policyService.createPolicyType(payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.successMsg = 'Policy type created successfully.';
          this.closeModal();
          this.loadTypes();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          const raw = err?.error;
          this.errorMsg = (typeof raw === 'string' ? raw : (raw?.message || raw?.error)) || 'Failed to create policy type.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── PUT /api/policy-types/{id}  (ADMIN) ───────────────────────────────
  onEditSubmit() {
    if (this.form.invalid || !this.editingId) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMsg = '';

    const payload = this.buildPayload();

    this.policyService.updatePolicyType(this.editingId, payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.successMsg = 'Policy type updated successfully.';
          this.closeModal();
          this.loadTypes();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          const raw = err?.error;
          this.errorMsg = (typeof raw === 'string' ? raw : (raw?.message || raw?.error)) || 'Failed to update policy type.';
          this.isSubmitting = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ── DELETE /api/policy-types/{id}  (ADMIN — soft discontinue) ─────────
  deleteType(id: number) {
    if (confirm('Are you sure you want to discontinue this policy type? Existing policies will not be affected.')) {
      this.policyService.deletePolicyType(id).subscribe({
        next: () => this.loadTypes(),
        error: (err) => console.error('Error discontinuing policy type', err)
      });
    }
  }

  // Builds the payload matching the backend PolicyTypeRequest fields exactly
  private buildPayload(): any {
    const v = this.form.value;
    return {
      name:              v.name,
      description:       v.description || '',
      category:          v.category,
      basePremium:       Number(v.basePremium),
      maxCoverageAmount: Number(v.maxCoverageAmount),
      deductibleAmount:  Number(v.deductibleAmount ?? 0),
      termMonths:        Number(v.termMonths),
      minAge:            v.minAge ? Number(v.minAge) : null,
      maxAge:            v.maxAge ? Number(v.maxAge) : null,
      coverageDetails:   v.coverageDetails || '',
    };
  }

  // For display in card — policy type field mapping from backend response
  getDisplayRate(pt: any): string | null {
    if (pt.basePremium != null) return '₹' + Number(pt.basePremium).toLocaleString('en-IN');
    return null;
  }

  getDisplayMax(pt: any): string | null {
    if (pt.maxCoverageAmount != null) return '₹' + Number(pt.maxCoverageAmount).toLocaleString('en-IN');
    return null;
  }

  isActive(pt: any): boolean {
    return pt.status === 'ACTIVE' || pt.active === true;
  }
}
