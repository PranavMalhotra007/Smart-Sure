import { Component, OnInit, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.scss'
})
export class SideMenu implements OnInit {
  pendingClaims = signal(0);
  totalPolicies = signal(0);
  totalUsers = signal(0);

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.adminService.getDashboardStats().subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          this.pendingClaims.set(res.pendingClaims || 0);
          this.totalPolicies.set(res.totalPolicies || 0);
          this.totalUsers.set(res.totalUsers || 0);
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }
}
