package com.smartSure.paymentService.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RazorpayOrderRequest {
    private Long policyId;       // for policy purchase
    private Long premiumId;      // for premium payment
    private Long claimId;        // for claim disbursement
    private Double amount;       // in INR
    private String paymentFor;   // "POLICY_PURCHASE" | "PREMIUM_PAYMENT" | "CLAIM"
}
