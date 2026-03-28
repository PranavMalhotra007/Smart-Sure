package com.smartSure.claimService.dto;

import java.math.BigDecimal;

import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PolicyDTO {
    // Fields matching PolicyService's PolicyResponse exactly
    private Long id;
    private String policyNumber;
    private Long customerId;
    private BigDecimal coverageAmount;
    private BigDecimal premiumAmount;
    private String paymentFrequency;
    private String status;
    private String nomineeName;

    // Convenience accessors for backward compatibility
    public Long getPolicyID() { return id; }
    public BigDecimal getAmount() { return coverageAmount; }
    public Long getUserId() { return customerId; }
}
