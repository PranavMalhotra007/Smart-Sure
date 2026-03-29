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
    private Double amount;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    private String remarks;
    private LocalDateTime paymentDate;
}
