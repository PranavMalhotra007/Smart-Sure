import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  userId: number | null = null;
  hasAddress = false;
  activeTab: 'profile' | 'address' | 'security' = 'profile';

  profileLoading = false;
  profileSuccess = '';
  profileError = '';
  addressLoading = false;
  addressSuccess = '';
  addressError = '';

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
      lastName: ['', Validators.required],
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
    this.authService.updateUser(this.userId, this.profileForm.value).subscribe({
      next: () => { this.ngZone.run(() => { this.profileSuccess = 'Profile updated successfully!'; this.profileLoading = false; this.cdr.detectChanges(); setTimeout(() => { this.ngZone.run(() => { this.profileSuccess = ''; this.cdr.detectChanges(); }); }, 3000); }); },
      error: (e) => { this.ngZone.run(() => { this.profileError = e?.error?.message || 'Update failed.'; this.profileLoading = false; this.cdr.detectChanges(); }); }
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
}
