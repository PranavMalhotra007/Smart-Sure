import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-customer-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class CustomerHeader implements OnInit {
  userName = '';
  showProfileMenu = false;
  mobileNavOpen = false;
  isDark = false;

  navLinks = [
    { label: 'Dashboard', route: '/customer/dashboard', icon: 'grid' },
    { label: 'Plans', route: '/customer/plans', icon: 'shield' },
    { label: 'My Policies', route: '/customer/my-policies', icon: 'file-text' },
    { label: 'My Claims', route: '/customer/my-claims', icon: 'alert-circle' },
    { label: 'Help', route: '/customer/help', icon: 'help-circle' },
    { label: 'About', route: '/customer/about', icon: 'info' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.themeService.isDark$.subscribe(d => {
      this.isDark = d;
      this.cdr.markForCheck();
    });

    const userId = this.authService.getUserId();
    if (userId) {
      this.authService.getUserInfo(userId).subscribe({
        next: (user) => {
          this.ngZone.run(() => {
            this.userName = `${user.firstName} ${user.lastName}`;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.userName = 'Customer';
            this.cdr.detectChanges();
          });
        }
      });
    }
  }

  toggleProfile() { this.showProfileMenu = !this.showProfileMenu; }
  toggleMobileNav() { this.mobileNavOpen = !this.mobileNavOpen; }
  closeMenus() { this.showProfileMenu = false; this.mobileNavOpen = false; }

  toggleTheme() {
    this.themeService.toggle();
    this.isDark = this.themeService.isDark;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
