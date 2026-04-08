import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthenticated()) {
      const role = this.authService.getRole();
      const isAdmin = role === 'ADMIN' || role === 'ROLE_ADMIN';
      const isCustomer = role === 'CUSTOMER' || role === 'ROLE_CUSTOMER';

      // Guard admin routes — redirect customers to their dashboard
      if (state.url.includes('/admin') && !isAdmin) {
        if (isCustomer) {
          this.router.navigate(['/customer/dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
        return false;
      }

      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
