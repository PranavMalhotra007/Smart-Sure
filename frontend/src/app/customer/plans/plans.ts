import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PolicyService } from '../../core/services/policy';

@Component({
  selector: 'app-customer-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './plans.html',
  styleUrl: './plans.scss'
})
export class CustomerPlans implements OnInit {
  loading = true;
  allPlans: any[] = [];
  filteredPlans: any[] = [];
  pagedPlans: any[] = [];
  currentPage = 0;
  readonly pageSize = 9;
  totalPages = 0;
  searchQuery = '';
  selectedCategory = '';
  calculatorOpen = false;
  calcForm = { policyTypeId: 0, coverageAmount: 500000, customerAge: 30, paymentFrequency: 'MONTHLY' as 'MONTHLY'|'QUARTERLY'|'ANNUAL' };
  calcResult: any = null;
  calcLoading = false;

  categories = ['LIFE','HEALTH','VEHICLE','PROPERTY','HOME','TRAVEL','BUSINESS','AUTO'];

  categoryIcons: Record<string,string> = {
    LIFE:'❤️', HEALTH:'🏥', VEHICLE:'🚗', PROPERTY:'🏠',
    HOME:'🏡', TRAVEL:'✈️', BUSINESS:'💼', AUTO:'🚘'
  };
  categoryColors: Record<string,string> = {
    LIFE:'#ef4444', HEALTH:'#06d6a0', VEHICLE:'#f77f00',
    PROPERTY:'#a855f7', HOME:'#3b82f6', TRAVEL:'#00b4d8', BUSINESS:'#6366f1', AUTO:'#f59e0b'
  };

  constructor(
    private policyService: PolicyService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.policyService.getActivePolicyTypes().subscribe({
      next: (plans: any) => { 
        this.ngZone.run(() => {
          this.allPlans = Array.isArray(plans) ? plans : (plans?.content || [plans] || []);
          this.applyFilter(); this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilter() {
    let list = this.allPlans;
    if (this.selectedCategory) list = list.filter(p => p.category === this.selectedCategory);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    this.filteredPlans = list;
    this.currentPage = 0;
    this.updatePage();
  }

  updatePage() {
    this.totalPages = Math.ceil(this.filteredPlans.length / this.pageSize);
    const start = this.currentPage * this.pageSize;
    this.pagedPlans = this.filteredPlans.slice(start, start + this.pageSize);
  }

  goToPage(p: number) {
    if (p < 0 || p >= this.totalPages) return;
    this.currentPage = p;
    this.updatePage();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  clearFilters() { this.searchQuery = ''; this.selectedCategory = ''; this.applyFilter(); }

  openCalculator(plan: any) {
    this.calcForm.policyTypeId = plan.id;
    this.calcForm.coverageAmount = plan.maxCoverageAmount || 500000;
    this.calcResult = null;
    this.calculatorOpen = true;
  }
  closeCalculator() { this.calculatorOpen = false; this.calcResult = null; }

  calculatePremium() {
    this.calcLoading = true;
    this.policyService.calculatePremium(this.calcForm as any).subscribe({
      next: (r) => { 
        this.ngZone.run(() => {
          this.calcResult = r; this.calcLoading = false; 
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.calcLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  formatCurrency(v: number): string {
    if (!v) return '₹0';
    return '₹' + Number(v).toLocaleString('en-IN');
  }
}
