import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-customer-help',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './help.html',
  styleUrl: './help.scss'
})
export class CustomerHelp {
  activeIndex: number | null = null;

  faqs = [
    { q: 'How do I purchase an insurance plan?', a: 'Navigate to "Plans" in the top menu. Browse or search for a plan, click "Buy Now" and fill in the required details like coverage amount, nominee, and start date.' },
    { q: 'How do I file a claim?', a: 'Go to "File a Claim" from the dashboard or menu. Select your active policy, enter the claim amount, and upload 3 required documents: Claim Form, Aadhaar Card, and Evidence. Then submit your claim.' },
    { q: 'What are the 3 required documents for a claim?', a: 'You need to upload: (1) Claim Form – which can be generated digitally with your signature, (2) Aadhaar Card – your government ID proof, (3) Evidence – photos, bills, FIR copy, or any supporting document.' },
    { q: 'How long does claim processing take?', a: 'After submission, your claim enters "Under Review" status. Our team typically processes claims within 7–15 business days. You will be notified by email of the decision.' },
    { q: 'How do I pay my premium?', a: 'Go to "My Policies", click on the policy, and you will see the premium schedule. Click "Pay Premium" and select the installment you want to pay.' },
    { q: 'Can I cancel my policy?', a: 'Yes. Go to "My Policies", open the policy and click "Cancel Policy". Note that you can only cancel ACTIVE or CREATED policies. Expired policies cannot be cancelled.' },
    { q: 'How do I renew an expired policy?', a: 'Go to "My Policies", open the expired policy and click "Renew". Select a new start date and confirm renewal. A new policy will be created.' },
    { q: 'What is the premium calculator?', a: 'On the Plans page, click "Calculate Premium" on any plan. Enter your age, desired coverage, and payment frequency to get an estimate without committing to purchase.' },
    { q: 'How do I update my account details?', a: 'Click your name in the top right and go to "Account Details". You can update your personal info and address from there.' },
    { q: 'What payment methods are accepted?', a: 'We accept online payments (UPI, Net Banking, Cards), NEFT/RTGS transfers, and cheque. Select your method when paying a premium installment.' },
  ];

  toggle(i: number) { this.activeIndex = this.activeIndex === i ? null : i; }
}
