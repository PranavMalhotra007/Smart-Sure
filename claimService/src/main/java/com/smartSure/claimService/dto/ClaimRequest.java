package com.smartSure.claimService.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class ClaimRequest {
    private Long policyId;
    private BigDecimal amount;
}
