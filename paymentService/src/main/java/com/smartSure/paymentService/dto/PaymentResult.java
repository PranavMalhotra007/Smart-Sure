package com.smartSure.paymentService.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResult {
    private String transactionId;
    private Long policyId;
    private Long claimId;
    private String status;
    private String message;
}
