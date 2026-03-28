package com.smartSure.adminService.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PolicyTypeDTO {
    private Long id;
    private String name;
    private String category;
    private BigDecimal basePremium;
    private Integer termMonths;
    private String status;
}
