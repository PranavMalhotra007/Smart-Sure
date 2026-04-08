import { Component, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CustomerHeader } from '../header/header';
import { AppFooter } from '../../../core/components/footer/footer';
import { filter } from 'rxjs';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, CustomerHeader, AppFooter],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerLayout {
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    });
  }
}
