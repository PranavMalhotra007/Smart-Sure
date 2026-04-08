import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  registerForm: FormGroup;
  isLoading = false;
  errorMsg = '';
  successMsg = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    // API expects: "CUSTOMER" or "ADMIN" — NOT the "ROLE_" prefix (Spring internal only)
    const payload = {
      ...this.registerForm.value,
      role: 'CUSTOMER'
    };

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMsg = 'Registration successful! You can now log in.';
        this.registerForm.reset();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg =
          err?.error?.message ||
          err?.error?.Error ||
          err?.error ||
          'Registration failed. Please try again.';
      }
    });
  }
}
