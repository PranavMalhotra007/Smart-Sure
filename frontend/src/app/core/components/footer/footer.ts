import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class AppFooter {
  @Input() variant: 'admin' | 'customer' = 'customer';
  year = new Date().getFullYear();
}
