import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from '../header/header';
import { SideMenu } from '../side-menu/side-menu';
import { AppFooter } from '../../../core/components/footer/footer';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, SideMenu, AppFooter],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayout {
  currentRoute = 'Dashboard';

  private readonly routeTitles: Record<string, string> = {
    'dashboard':    'Dashboard',
    'claims':       'Claims',
    'policy-types': 'Policy Types',
    'policies':     'All Policies',
    'users':        'Users',
  };

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.ngZone.run(() => {
        const url: string = event.urlAfterRedirects || '';
        const segment = url.split('/admin/')[1]?.split('?')[0]?.split('#')[0] || 'dashboard';
        this.currentRoute = this.routeTitles[segment] || 'Dashboard';
        this.cdr.detectChanges();
      });
    });
  }
}
