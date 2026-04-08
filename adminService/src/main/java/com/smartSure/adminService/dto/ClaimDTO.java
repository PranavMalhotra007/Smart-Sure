package com.smartSure.adminService.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.smartSure.adminService.dto.PolicyDTO;
import com.smartSure.adminService.dto.UserDTO;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClaimDTO {
    private Long id;
    private Long policyId;
    private BigDecimal amount;
    private String status;
    private LocalDateTime timeOfCreation;
    private boolean claimFormUploaded;
    private boolean aadhaarCardUploaded;
    private boolean evidencesUploaded;

    // Enriched fields for admin UI.
    private PolicyDTO policy;
    private UserDTO customer;
}
