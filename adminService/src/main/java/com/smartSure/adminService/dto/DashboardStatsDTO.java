package com.smartSure.adminService.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsDTO {
    private long totalClaims;
    private long pendingClaims;
    private long totalPolicies;
    private long totalUsers;
}
