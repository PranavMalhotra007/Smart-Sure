package com.smartSure.paymentService.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RazorpayVerifyRequest {
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private Long   policyId;
    private Long   premiumId;
    private Long   claimId;
    private Double amount;
    private String paymentFor;   // "POLICY_PURCHASE" | "PREMIUM_PAYMENT"
}
