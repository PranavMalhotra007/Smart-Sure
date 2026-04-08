package com.smartSure.adminService.service;

import com.smartSure.adminService.dto.ClaimDTO;
import com.smartSure.adminService.dto.PolicyDTO;
import com.smartSure.adminService.dto.PolicyStatusUpdateRequest;
import com.smartSure.adminService.dto.UserDTO;
import com.smartSure.adminService.entity.AuditLog;
import com.smartSure.adminService.feign.ClaimFeignClient;
import com.smartSure.adminService.feign.PolicyFeignClient;
import com.smartSure.adminService.feign.UserFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.smartSure.adminService.dto.DashboardStatsDTO;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final ClaimFeignClient claimFeignClient;
    private final PolicyFeignClient policyFeignClient;
    private final UserFeignClient userFeignClient;
    private final AuditLogService auditLogService;

    private ClaimDTO enrichClaimForAdmin(ClaimDTO claim) {
        if (claim == null) return null;

        try {
            PolicyDTO policy = policyFeignClient.getPolicyById(claim.getPolicyId());
            claim.setPolicy(policy);

            if (policy != null && policy.getCustomerId() != null) {
                UserDTO customer = userFeignClient.getUserById(policy.getCustomerId());
                claim.setCustomer(customer);
            }
        } catch (Exception e) {
            // Best-effort enrichment: admin can still see basic claim fields.
            log.warn("Failed to enrich claimId={} policyId={}: {}", claim.getId(), claim.getPolicyId(), e.getMessage());
        }

        return claim;
    }

    // ==================== CLAIM MANAGEMENT ====================

    // Get all claims — full admin view
    public List<ClaimDTO> getAllClaims() {
        List<ClaimDTO> claims = claimFeignClient.getAllClaims();
        return claims.stream().map(this::enrichClaimForAdmin).toList();
    }

    // Get claims pending admin review
    public List<ClaimDTO> getUnderReviewClaims() {
        return claimFeignClient.getUnderReviewClaims().stream().map(this::enrichClaimForAdmin).toList();
    }

    @Cacheable(value = "admin_claim", key = "#claimId")
    public ClaimDTO getClaimById(Long claimId) {
        return enrichClaimForAdmin(claimFeignClient.getClaimById(claimId));
    }

    // Approve a claim — updates status in claimService and logs the action
    public ClaimDTO approveClaim(Long adminId, Long claimId, String remarks) {
        ClaimDTO updated = claimFeignClient.updateClaimStatus(claimId, "APPROVED");
        auditLogService.log(adminId, "APPROVE_CLAIM", "Claim", claimId, remarks);
        return enrichClaimForAdmin(updated);
    }

    // Reject a claim — updates status in claimService and logs the action
    public ClaimDTO rejectClaim(Long adminId, Long claimId, String remarks) {
        ClaimDTO updated = claimFeignClient.updateClaimStatus(claimId, "REJECTED");
        auditLogService.log(adminId, "REJECT_CLAIM", "Claim", claimId, remarks);
        return enrichClaimForAdmin(updated);
    }

    // Move claim to UNDER_REVIEW — kept for backward compatibility
    // NOTE: With the new submit flow, claims arrive at UNDER_REVIEW automatically
    // after customer calls /submit. This method is now a no-op if claim is already UNDER_REVIEW.
    public ClaimDTO markUnderReview(Long adminId, Long claimId) {
        ClaimDTO claim = claimFeignClient.getClaimById(claimId);
        // Only attempt transition if claim is still in SUBMITTED state
        if ("SUBMITTED".equals(claim.getStatus())) {
            ClaimDTO updated = claimFeignClient.updateClaimStatus(claimId, "UNDER_REVIEW");
            auditLogService.log(adminId, "MARK_UNDER_REVIEW", "Claim", claimId, "Claim moved to under review");
            return enrichClaimForAdmin(updated);
        }
        // Already UNDER_REVIEW — just log and return current state
        auditLogService.log(adminId, "MARK_UNDER_REVIEW", "Claim", claimId, "Claim already under review");
        return enrichClaimForAdmin(claim);
    }

    // ==================== POLICY MANAGEMENT ====================

    // Get all policies
    @Cacheable(value = "admin_policies")
    public List<PolicyDTO> getAllPolicies() {
        return policyFeignClient.getAllPolicies().getContent();
    }

    // Get a single policy by ID — passes admin flag so policyService skips ownership check
    @Cacheable(value = "admin_policy", key = "#policyId")
    public PolicyDTO getPolicyById(Long policyId) {
        return policyFeignClient.getPolicyById(policyId);
    }

    // Cancel a policy — uses admin status update endpoint with CANCELLED status
    public PolicyDTO cancelPolicy(Long adminId, Long policyId, String reason) {
        PolicyStatusUpdateRequest req = new PolicyStatusUpdateRequest("CANCELLED", reason);
        PolicyDTO updated = policyFeignClient.updatePolicyStatus(policyId, req);
        auditLogService.log(adminId, "CANCEL_POLICY", "Policy", policyId, reason);
        return updated;
    }

    // ==================== USER MANAGEMENT ====================

    // Get all users
    public List<UserDTO> getAllUsers() {
        return userFeignClient.getAllUsers(1000).getContent();
    }

    // Get a single user by ID
    public UserDTO getUserById(Long userId) {
        return userFeignClient.getUserById(userId);
    }

    // ==================== DASHBOARD STATS ====================

    public DashboardStatsDTO getDashboardStats() {
        long totalClaims = 0;
        long pendingClaims = 0;
        long totalPolicies = 0;
        long totalUsers = 0;

        try { totalClaims = claimFeignClient.getAllClaims().size(); }
        catch (Exception e) { log.error("Admin dashboard could not reach ClaimService: {}", e.getMessage()); }

        try { pendingClaims = claimFeignClient.getUnderReviewClaims().size(); }
        catch (Exception e) { log.error("Admin dashboard could not reach ClaimService (pending): {}", e.getMessage()); }

        try { totalPolicies = policyFeignClient.getAllPolicies().getTotalElements(); }
        catch (Exception e) { log.error("Admin dashboard could not reach PolicyService: {}", e.getMessage()); }

        try { 
            totalUsers = userFeignClient.getAllUsers(1000).getTotalElements(); 
        }
        catch (Exception e) { 
            log.error("Admin dashboard could not reach AuthService: {}", e.getMessage()); 
        }

        return DashboardStatsDTO.builder()
            .totalClaims(totalClaims)
            .pendingClaims(pendingClaims)
            .totalPolicies(totalPolicies)
            .totalUsers(totalUsers)
            .build();
    }

    // ==================== AUDIT LOGS ====================

    // Get recent activity feed — for admin dashboard
    public List<AuditLog> getRecentActivity(int limit) {
        return auditLogService.getRecentLogs(limit);
    }

    // Get full audit trail for a specific claim or policy
    public List<AuditLog> getEntityHistory(String entity, Long id) {
        return auditLogService.getLogsByEntityAndId(entity, id);
    }
}
