import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit, OnDestroy {
  @Input() title: string = 'Dashboard';
  isHavOpen = false;
  isDark = false;

  private boundCloseHav: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {
    this.boundCloseHav = this.closeHav.bind(this);
  }

  ngOnInit(): void {
    this.themeService.isDark$.subscribe(d => (this.isDark = d));
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.boundCloseHav);
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.boundCloseHav);
    }
  }

  toggleHav(event: Event) {
    event.stopPropagation();
    this.isHavOpen = !this.isHavOpen;
  }

  closeHav() {
    this.isHavOpen = false;
  }

  toggleTheme() {
    this.themeService.toggle();
    this.isDark = this.themeService.isDark;
  }

  logout() {
    this.authService.logout();
  }
}
