package com.smartSure.adminService.messaging;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PremiumPaidEvent {
    private Long       premiumId;
    private Long       policyId;
    private String     policyNumber;
    private Long       customerId;
    private String     customerEmail;
    private String     customerName;
    private BigDecimal amount;
    private LocalDate  paidDate;
    private String     paymentMethod;
    private String     paymentReference;
    private LocalDateTime publishedAt;
}
