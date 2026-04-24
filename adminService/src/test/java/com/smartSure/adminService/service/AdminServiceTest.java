package com.smartSure.adminService.service;

import com.smartSure.adminService.dto.ClaimDTO;
import com.smartSure.adminService.dto.DashboardStatsDTO;
import com.smartSure.adminService.dto.PolicyDTO;
import com.smartSure.adminService.dto.PolicyStatusUpdateRequest;
import com.smartSure.adminService.dto.UserDTO;
import com.smartSure.adminService.feign.ClaimFeignClient;
import com.smartSure.adminService.feign.PolicyFeignClient;
import com.smartSure.adminService.feign.UserFeignClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private ClaimFeignClient claimFeignClient;

    @Mock
    private PolicyFeignClient policyFeignClient;

    @Mock
    private UserFeignClient userFeignClient;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AdminService adminService;

    private ClaimDTO claimDTO;
    private PolicyDTO policyDTO;
    private UserDTO userDTO;

    @BeforeEach
    void setUp() {
        claimDTO = new ClaimDTO();
        claimDTO.setId(1L);
        claimDTO.setPolicyId(10L);
        claimDTO.setStatus("SUBMITTED");

        policyDTO = new PolicyDTO();
        policyDTO.setId(10L);
        policyDTO.setCustomerId(100L);

        userDTO = new UserDTO();
        userDTO.setUserId(100L);
    }

    @Test
    void getClaimById_NormalCase_WithEnrichment() {
        when(claimFeignClient.getClaimById(1L)).thenReturn(claimDTO);
        when(policyFeignClient.getPolicyById(10L)).thenReturn(policyDTO);
        when(userFeignClient.getUserById(100L)).thenReturn(userDTO);

        ClaimDTO result = adminService.getClaimById(1L);

        assertNotNull(result);
        assertEquals(policyDTO, result.getPolicy());
        assertEquals(userDTO, result.getCustomer());
    }

    @Test
    void getClaimById_ExceptionCase_FeignClientFails() {
        when(claimFeignClient.getClaimById(1L)).thenReturn(claimDTO);
        when(policyFeignClient.getPolicyById(10L)).thenThrow(new RuntimeException("Policy Service Down"));

        // Enrichment should fail silently and return claim as is
        ClaimDTO result = adminService.getClaimById(1L);

        assertNotNull(result);
        assertNull(result.getPolicy());
        assertNull(result.getCustomer());
    }

    @Test
    void approveClaim_NormalCase_Success() {
        when(claimFeignClient.updateClaimStatus(1L, "APPROVED")).thenReturn(claimDTO);
        when(auditLogService.log(anyLong(), anyString(), anyString(), anyLong(), anyString())).thenReturn(new com.smartSure.adminService.entity.AuditLog());

        // Exception mock for enrichment to safely skip it
        when(policyFeignClient.getPolicyById(anyLong())).thenThrow(new RuntimeException("Skip Enrichment"));

        ClaimDTO result = adminService.approveClaim(999L, 1L, "Looks good");

        assertNotNull(result);
        verify(claimFeignClient).updateClaimStatus(1L, "APPROVED");
        verify(auditLogService).log(999L, "APPROVE_CLAIM", "Claim", 1L, "Looks good");
    }

    @Test
    void markUnderReview_BoundaryCase_AlreadyUnderReview() {
        claimDTO.setStatus("UNDER_REVIEW");
        when(claimFeignClient.getClaimById(1L)).thenReturn(claimDTO);

        // Enrichment skip
        when(policyFeignClient.getPolicyById(anyLong())).thenThrow(new RuntimeException("Skip Enrichment"));

        ClaimDTO result = adminService.markUnderReview(999L, 1L);

        assertNotNull(result);
        verify(claimFeignClient, never()).updateClaimStatus(anyLong(), anyString());
        verify(auditLogService).log(999L, "MARK_UNDER_REVIEW", "Claim", 1L, "Claim already under review");
    }

    @Test
    void cancelPolicy_NormalCase_Success() {
        when(policyFeignClient.updatePolicyStatus(eq(10L), any(PolicyStatusUpdateRequest.class))).thenReturn(policyDTO);
        when(auditLogService.log(anyLong(), anyString(), anyString(), anyLong(), anyString())).thenReturn(new com.smartSure.adminService.entity.AuditLog());

        PolicyDTO result = adminService.cancelPolicy(999L, 10L, "Customer requested");

        assertNotNull(result);
        verify(policyFeignClient).updatePolicyStatus(eq(10L), any(PolicyStatusUpdateRequest.class));
        verify(auditLogService).log(999L, "CANCEL_POLICY", "Policy", 10L, "Customer requested");
    }

    @Test
    void getDashboardStats_NormalCase_Success() {
        when(claimFeignClient.getAllClaims()).thenReturn(Collections.singletonList(claimDTO));
        when(claimFeignClient.getUnderReviewClaims()).thenReturn(Collections.emptyList());
        com.smartSure.adminService.dto.PolicyPageResponseDTO policyResponse = new com.smartSure.adminService.dto.PolicyPageResponseDTO();
        policyResponse.setTotalElements(1L);
        when(policyFeignClient.getAllPolicies()).thenReturn(policyResponse);
        
        com.smartSure.adminService.dto.PageResponseDTO<UserDTO> pageResponse = new com.smartSure.adminService.dto.PageResponseDTO<>();
        pageResponse.setTotalElements(5L);
        when(userFeignClient.getAllUsers(1000)).thenReturn(pageResponse);

        DashboardStatsDTO stats = adminService.getDashboardStats();

        assertEquals(1, stats.getTotalClaims());
        assertEquals(0, stats.getPendingClaims());
        assertEquals(1, stats.getTotalPolicies());
        assertEquals(5, stats.getTotalUsers());
    }

    @Test
    void getDashboardStats_ExceptionCase_ServicesDown() {
        when(claimFeignClient.getAllClaims()).thenThrow(new RuntimeException("Claim Down"));
        when(claimFeignClient.getUnderReviewClaims()).thenThrow(new RuntimeException("Claim Down"));
        when(policyFeignClient.getAllPolicies()).thenThrow(new RuntimeException("Policy Down"));
        when(userFeignClient.getAllUsers(1000)).thenThrow(new RuntimeException("Auth Down"));

        DashboardStatsDTO stats = adminService.getDashboardStats();

        assertEquals(0, stats.getTotalClaims());
        assertEquals(0, stats.getPendingClaims());
        assertEquals(0, stats.getTotalPolicies());
        assertEquals(0, stats.getTotalUsers());
    }
}
