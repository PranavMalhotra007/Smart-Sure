package com.smartSure.paymentService.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String transactionId;
    private Long policyId;
    private Long claimId;
    private Long premiumId;
    private Double amount;

    // Razorpay-specific fields
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private String paymentFor;   // POLICY_PURCHASE | PREMIUM_PAYMENT | CLAIM

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    private String remarks;
    private LocalDateTime paymentDate;
}
