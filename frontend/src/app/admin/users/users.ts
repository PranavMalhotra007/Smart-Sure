import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  isLoading = signal(true);
  users = signal<any[]>([]);
  filteredUsers = signal<any[]>([]);
  pagedUsers: any[] = [];
  uPage = 0;
  readonly uPageSize = 10;
  uTotalPages = 0;
  searchQuery = '';
  roleFilter = 'all';
  errorMsg = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // ── GET /api/admin/users ───────────────────────────────────────────────
  loadUsers() {
    this.isLoading.set(true);
    this.errorMsg = '';

    this.adminService.getAllUsers().subscribe({
      next: (res: any[]) => {
        this.users.set(res || []);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load users', err);
        this.errorMsg = 'Failed to load users. Please check your connection.';
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: any) {
    this.searchQuery = event.target.value;
    this.applyFilters();
  }

  setRoleFilter(role: string) {
    this.roleFilter = role;
    this.applyFilters();
  }

  applyFilters() {
    let base = this.users();

    if (this.roleFilter !== 'all') {
      base = base.filter(u => u.role === this.roleFilter);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      base = base.filter(u =>
        String(u.userId).includes(q) ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    this.filteredUsers.set(base);
    this.uPage = 0;
    this.updateUPage();
  }

  updateUPage() {
    this.uTotalPages = Math.ceil(this.filteredUsers().length / this.uPageSize);
    const start = this.uPage * this.uPageSize;
    this.pagedUsers = this.filteredUsers().slice(start, start + this.uPageSize);
  }

  goToUPage(p: number) {
    if (p < 0 || p >= this.uTotalPages) return;
    this.uPage = p;
    this.updateUPage();
  }

  get uPageNums(): number[] {
    return Array.from({ length: this.uTotalPages }, (_, i) => i);
  }

  // ── GET /api/admin/users/{userId} ─────────────────────────────────────
  getUserById(userId: number) {
    return this.adminService.getUserById(userId);
  }
}
