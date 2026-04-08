import { Component, ChangeDetectorRef, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMsg = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit() {
    // Force a change detection pass to ensure UI is interactive in zoneless mode
    this.cdr.detectChanges();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMsg = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          const role = this.authService.getRole();

          if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
            this.router.navigate(['/admin/dashboard']);
          } else if (role === 'CUSTOMER' || role === 'ROLE_CUSTOMER') {
            this.router.navigate(['/customer/dashboard']);
          } else {
            this.errorMsg = 'Unknown role. Please contact support.';
            this.authService.logout();
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          const raw = err?.error;
          if (typeof raw === 'string') {
            this.errorMsg = raw;
          } else {
            this.errorMsg =
              raw?.message ||
              raw?.Error ||
              err?.message ||
              'Invalid credentials. Please try again.';
          }
          this.cdr.detectChanges();
        });
      }
    });
  }
}
