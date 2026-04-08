import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-customer-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="about-page">
    <div class="about-hero">
      <div class="hero-badge">About SmartSure</div>
      <h1>Insurance That <span class="text-teal">Truly Protects</span></h1>
      <p>We believe everyone deserves simple, transparent, and affordable insurance coverage. SmartSure makes it easy to protect what matters most.</p>
    </div>

    <div class="features-grid">
      <div class="feature-card" *ngFor="let f of features">
        <div class="feature-icon" [style.background]="f.color + '22'" [style.color]="f.color">
          <span>{{ f.emoji }}</span>
        </div>
        <h3>{{ f.title }}</h3>
        <p>{{ f.desc }}</p>
      </div>
    </div>

    <div class="stats-strip">
      <div class="strip-stat" *ngFor="let s of stats">
        <div class="strip-value">{{ s.value }}</div>
        <div class="strip-label">{{ s.label }}</div>
      </div>
    </div>

    <div class="mission-block">
      <div class="mission-icon">🎯</div>
      <h2>Our Mission</h2>
      <p>To democratize insurance by removing complexity — so every Indian family can access protection for health, life, vehicle, property, and beyond. SmartSure is built on technology, trust, and transparency.</p>
    </div>

    <div class="contact-block">
      <h2>Get in Touch</h2>
      <div class="contact-cards">
        <div class="contact-card"><div class="cc-icon">📧</div><div><strong>Email Support</strong><p>support&#64;smartsure.in</p></div></div>
        <div class="contact-card"><div class="cc-icon">📞</div><div><strong>Call Us</strong><p>1800-XXX-XXXX (Toll Free)</p></div></div>
        <div class="contact-card"><div class="cc-icon">🕐</div><div><strong>Working Hours</strong><p>Mon–Sat, 9AM–6PM</p></div></div>
      </div>
    </div>

    <div class="cta-block">
      <h2>Ready to Get Protected?</h2>
      <a routerLink="/customer/plans" class="btn-teal">Browse Insurance Plans</a>
    </div>
  </div>`,
  styleUrl: './about.scss'
})
export class CustomerAbout {
  features = [
    { emoji: '⚡', title: 'Instant Policy', desc: 'Purchase and activate your policy in minutes with our streamlined digital process.', color: '#f59e0b' },
    { emoji: '🔒', title: 'Secure & Safe', desc: 'Bank-level encryption and JWT-secured APIs protect your data at all times.', color: '#06d6a0' },
    { emoji: '📋', title: 'Easy Claims', desc: 'File and track claims digitally with real-time status updates and email notifications.', color: '#00b4d8' },
    { emoji: '💰', title: 'Flexible Premiums', desc: 'Pay monthly, quarterly, or annually — choose the schedule that suits your budget.', color: '#a855f7' },
    { emoji: '📱', title: 'Always Accessible', desc: 'Manage your insurance portfolio from anywhere, anytime, on any device.', color: '#ef4444' },
    { emoji: '🤝', title: 'Trusted Support', desc: 'Dedicated support team ready to assist you through calls, emails and chat.', color: '#f77f00' },
  ];
  stats = [
    { value: '10,000+', label: 'Happy Customers' },
    { value: '₹500Cr+', label: 'Coverage Provided' },
    { value: '98%', label: 'Claim Approval Rate' },
    { value: '24/7', label: 'Customer Support' },
  ];
}
