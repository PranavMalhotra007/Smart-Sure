import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { CustomerGuard } from './core/guards/customer-guard';
import { Login } from './auth/login/login';
import { AdminLayout } from './admin/layout/admin-layout/admin-layout';
import { Dashboard } from './admin/dashboard/dashboard';
import { Claims } from './admin/claims/claims';
import { CustomerLayout } from './customer/layout/customer-layout/customer-layout';
import { CustomerDashboard } from './customer/dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register').then(m => m.Register)
  },

  // ── ADMIN routes ──────────────────────────────────────────────────────────
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'claims', component: Claims },
      { path: 'policies', loadComponent: () => import('./admin/policies/policies').then(m => m.AdminPolicies) },
      { path: 'policy-types', loadComponent: () => import('./admin/policy-types/policy-types').then(m => m.PolicyTypes) },
      { path: 'users', loadComponent: () => import('./admin/users/users').then(m => m.Users) },
    ]
  },

  // ── CUSTOMER routes ───────────────────────────────────────────────────────
  {
    path: 'customer',
    component: CustomerLayout,
    canActivate: [CustomerGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: CustomerDashboard },
      {
        path: 'plans',
        loadComponent: () => import('./customer/plans/plans').then(m => m.CustomerPlans)
      },
      {
        path: 'my-policies',
        loadComponent: () => import('./customer/my-policies/my-policies').then(m => m.CustomerMyPolicies)
      },
      {
        path: 'my-claims',
        loadComponent: () => import('./customer/my-claims/my-claims').then(m => m.MyClaims)
      },
      {
        path: 'file-claim',
        loadComponent: () => import('./customer/file-claim/file-claim').then(m => m.FileClaim)
      },
      {
        path: 'purchase',
        loadComponent: () => import('./customer/purchase/purchase').then(m => m.Purchase)
      },
      {
        path: 'premium-history',
        loadComponent: () => import('./customer/premium-history/premium-history').then(m => m.PremiumHistory)
      },
      {
        path: 'account',
        loadComponent: () => import('./customer/account/account').then(m => m.CustomerAccount)
      },
      {
        path: 'help',
        loadComponent: () => import('./customer/help/help').then(m => m.CustomerHelp)
      },
      {
        path: 'about',
        loadComponent: () => import('./customer/about/about').then(m => m.CustomerAbout)
      },
    ]
  },

  { path: '**', redirectTo: '/login' }
];
