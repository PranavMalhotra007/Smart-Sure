package com.smartSure.paymentService.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RazorpayOrderResponse {
    private String razorpayOrderId;
    private String currency;
    private Long   amount;        // in paise
    private String keyId;         // public key sent to frontend
    private Long   policyId;
    private Long   premiumId;
    private Long   claimId;
    private String paymentFor;
}
