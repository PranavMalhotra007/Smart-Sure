package com.smartSure.PolicyService.dto.policytype;

import lombok.*;

import java.math.BigDecimal;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PolicyTypeResponse implements Serializable {

    private Long id;
    private String name;
    private String description;
    private String category;
    private BigDecimal basePremium;
    private BigDecimal maxCoverageAmount;
    private BigDecimal deductibleAmount;
    private Integer termMonths;
    private Integer minAge;
    private Integer maxAge;
    private String status;
    private String coverageDetails;
    private String createdAt;
}