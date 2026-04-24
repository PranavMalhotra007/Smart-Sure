import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPwd = control.get('newPassword')?.value;
  const confirmPwd = control.get('confirmPassword')?.value;
  return newPwd && confirmPwd && newPwd !== confirmPwd ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-customer-account',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './account.html',
  styleUrl: './account.scss'
})
export class CustomerAccount implements OnInit {
  loading = true;
  profileForm!: FormGroup;
  addressForm!: FormGroup;
  passwordForm!: FormGroup;
  userId: number | null = null;
  hasAddress = false;
  activeTab: 'profile' | 'address' | 'security' = 'profile';

  profileLoading = false;
  profileSuccess = '';
  profileError = '';
  addressLoading = false;
  addressSuccess = '';
  addressError = '';
  passwordLoading = false;
  passwordSuccess = '';
  passwordError = '';

  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.userId = this.authService.getUserId();
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: [''],
      phone: [''],
      dateOfBirth: [''],
      gender: ['']
    });
    this.addressForm = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      pincode: ['', Validators.required],
      country: ['India', Validators.required]
    });
    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(8)]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    );

    if (this.userId) {
      const u$ = this.authService.getUserInfo(this.userId).pipe(catchError(() => of(null)));
      const a$ = this.authService.getAddress(this.userId).pipe(catchError(() => of(null)));

      forkJoin([u$, a$]).subscribe({
        next: ([u, a]) => {
          this.ngZone.run(() => {
            this.loading = false;
            this.cdr.detectChanges();

            if (u) {
              this.profileForm.patchValue({
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                phone: u.phone || '',
                dateOfBirth: u.dateOfBirth || '',
                gender: u.gender || ''
              });
            }
            if (a) {
              this.addressForm.patchValue({
                street: a.street || '',
                city: a.city || '',
                state: a.state || '',
                pincode: a.pincode || '',
                country: a.country || 'India'
              });
              this.hasAddress = true;
            } else {
              this.hasAddress = false;
            }
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
    } else {
      this.loading = false;
    }
  }

  saveProfile() {
    if (this.profileForm.invalid || !this.userId) return;
    this.profileLoading = true; this.profileError = ''; this.profileSuccess = '';

    const raw = this.profileForm.value;
    const payload: any = {
      firstName: raw.firstName,
      lastName: raw.lastName || undefined,
      phone: raw.phone ? Number(raw.phone) : undefined,
      dateOfBirth: raw.dateOfBirth || undefined,
      gender: raw.gender || undefined
    };

    this.authService.updateUser(this.userId, payload).subscribe({
      next: () => { this.ngZone.run(() => { this.profileSuccess = 'Profile updated successfully!'; this.profileLoading = false; this.cdr.detectChanges(); setTimeout(() => { this.ngZone.run(() => { this.profileSuccess = ''; this.cdr.detectChanges(); }); }, 3000); }); },
      error: (e) => { this.ngZone.run(() => { this.profileError = e?.error?.message || e?.error || 'Update failed. Please try again.'; this.profileLoading = false; this.cdr.detectChanges(); }); }
    });
  }

  saveAddress() {
    if (this.addressForm.invalid || !this.userId) return;
    this.addressLoading = true; this.addressError = ''; this.addressSuccess = '';
    const obs = this.hasAddress
      ? this.authService.updateAddress(this.userId, this.addressForm.value)
      : this.authService.addAddress(this.userId, this.addressForm.value);
    obs.subscribe({
      next: () => { this.ngZone.run(() => { this.hasAddress = true; this.addressSuccess = 'Address saved!'; this.addressLoading = false; this.cdr.detectChanges(); setTimeout(() => { this.ngZone.run(() => { this.addressSuccess = ''; this.cdr.detectChanges(); }); }, 3000); }); },
      error: (e) => { this.ngZone.run(() => { this.addressError = e?.error?.message || 'Save failed.'; this.addressLoading = false; this.cdr.detectChanges(); }); }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid || !this.userId) return;
    this.passwordLoading = true; this.passwordError = ''; this.passwordSuccess = '';
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    this.authService.changePassword(this.userId, { currentPassword, newPassword, confirmPassword }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.passwordSuccess = 'Password changed! Logging you out...';
          this.passwordLoading = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.authService.logout();
          }, 2000);
        });
      },
      error: (e) => {
        this.ngZone.run(() => {
          this.passwordError = e?.error?.message || e?.error || 'Password change failed. Please check your current password.';
          this.passwordLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }
}
