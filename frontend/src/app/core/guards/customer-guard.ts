import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({ providedIn: 'root' })
export class CustomerGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }
    const role = this.authService.getRole();
    if (role !== 'CUSTOMER' && role !== 'ROLE_CUSTOMER') {
      // Admin trying to access customer section
      this.router.navigate(['/admin/dashboard']);
      return false;
    }
    return true;
  }
}
