package com.smartSure.claimService.service;

import com.smartSure.claimService.client.PolicyClient;
import com.smartSure.claimService.client.UserClient;
import com.smartSure.claimService.dto.ClaimRequest;
import com.smartSure.claimService.dto.ClaimResponse;
import com.smartSure.claimService.dto.PolicyDTO;
import com.smartSure.claimService.dto.UserResponseDto;
import com.smartSure.claimService.entity.Claim;
import com.smartSure.claimService.entity.FileData;
import com.smartSure.claimService.entity.Status;
import com.smartSure.claimService.exception.UnauthorizedAccessException;
import com.smartSure.claimService.exception.ClaimDeletionNotAllowedException;
import com.smartSure.claimService.exception.ClaimNotFoundException;
import com.smartSure.claimService.exception.DocumentNotUploadedException;
import com.smartSure.claimService.exception.InvalidStatusTransitionException;
import com.smartSure.claimService.messaging.ClaimDecisionEvent;
import com.smartSure.claimService.messaging.RabbitMQConfig;
import com.smartSure.claimService.repository.ClaimRepository;
import com.smartSure.claimService.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final PolicyClient    policyClient;
    private final UserClient      userClient;
    private final RabbitTemplate  rabbitTemplate;

    private boolean isAdmin() {
        String role = SecurityUtils.getCurrentRole();
        return "ROLE_ADMIN".equals(role);
    }

    private void assertPolicyBelongsToCurrentUser(PolicyDTO policy) {
        if (isAdmin()) return;

        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            throw new UnauthorizedAccessException();
        }

        if (policy == null || policy.getCustomerId() == null || !policy.getCustomerId().equals(currentUserId)) {
            throw new UnauthorizedAccessException("You can only access your own claims.");
        }
    }

    private void assertClaimBelongsToCurrentUser(Claim claim) {
        // For admins, allow all claim access.
        if (isAdmin()) return;

        PolicyDTO policy;
        try {
            policy = policyClient.getPolicyById(claim.getPolicyId());
        } catch (Exception e) {
            // If policy ownership is rejected upstream, treat it as unauthorized.
            throw new UnauthorizedAccessException("You can only access your own claims.");
        }
        assertPolicyBelongsToCurrentUser(policy);
    }

    // Customer submits/updates docs, admins view. Keep admin list consistent.
    @Caching(evict = {
            @CacheEvict(value = "allClaims", allEntries = true)
    })
    public ClaimResponse createClaim(ClaimRequest request) {
        PolicyDTO policy = policyClient.getPolicyById(request.getPolicyId());
        assertPolicyBelongsToCurrentUser(policy);

        if (policy.getStatus() != null && !"ACTIVE".equalsIgnoreCase(policy.getStatus())) {
            throw new IllegalStateException("Claims can only be created for ACTIVE policies. Current status: " + policy.getStatus());
        }

        java.math.BigDecimal claimAmount = request.getAmount();
        if (claimAmount == null) {
            throw new IllegalArgumentException("Claim amount is required.");
        }
        if (claimAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Claim amount must be greater than zero.");
        }

        java.math.BigDecimal available = policy.getLeftoverCoverageAmount() != null
                ? policy.getLeftoverCoverageAmount() : policy.getCoverageAmount();

        if (available == null) {
            throw new IllegalArgumentException("Policy coverage mapping issue: coverage information is unavailable.");
        }

        // Check if coverage is already exhausted
        if (available.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("You cannot file a claim for this policy because the leftover coverage amount is zero.");
        }

        // Check if claim amount exceeds leftover amount
        if (claimAmount.compareTo(available) > 0) {
            throw new IllegalArgumentException("The entered claim amount (" + claimAmount + ") is higher than the leftover amount in the policy (" + available + ").");
        }

        Claim claim = new Claim();
        claim.setPolicyId(request.getPolicyId());
        claim.setAmount(claimAmount);
        return toResponse(claimRepository.save(claim));
    }

    public ClaimResponse getClaimById(Long claimId) {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        return toResponse(claim);
    }

    @Cacheable(value = "allClaims")
    public List<ClaimResponse> getAllClaims() {
        return claimRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * GET /api/claims/my — Customer fetches all their own claims.
     * Uses the JWT userId to look up policy IDs via policyClient, then returns matching claims.
     */
    public List<ClaimResponse> getMyClaimsForCustomer() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            throw new UnauthorizedAccessException("User not authenticated.");
        }
        // Fetch all policy IDs that belong to this customer
        List<Long> policyIds;
        try {
            policyIds = policyClient.getMyPolicyIds(currentUserId);
        } catch (Exception e) {
            log.error("Failed to fetch policy IDs for user {}: {}", currentUserId, e.getMessage());
            policyIds = java.util.Collections.emptyList();
        }
        if (policyIds == null || policyIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return claimRepository.findByPolicyIdIn(policyIds)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ClaimResponse> getAllUnderReviewClaims() {
        return claimRepository.findByStatus(Status.UNDER_REVIEW).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public PolicyDTO getPolicyForClaim(Long claimId) {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        return policyClient.getPolicyById(claim.getPolicyId());
    }

    @Caching(evict = {
        @CacheEvict(value = "claims", key = "#claimId"),
        @CacheEvict(value = "allClaims", allEntries = true)
    })
    public void deleteClaim(Long claimId) {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        if (claim.getStatus() != Status.DRAFT) throw new ClaimDeletionNotAllowedException(claimId);
        claimRepository.deleteById(claimId);
    }

    // Customer submits after uploading all 3 docs — DRAFT → SUBMITTED → UNDER_REVIEW
    @Caching(evict = {
            @CacheEvict(value = "allClaims", allEntries = true)
    })
    public ClaimResponse submitClaim(Long claimId) {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        if (claim.getStatus() != Status.DRAFT)
            throw new InvalidStatusTransitionException(claim.getStatus().name(), Status.SUBMITTED.name());
        if (claim.getClaimForm() == null)   throw new DocumentNotUploadedException("Claim form", claimId);
        if (claim.getAadhaarCard() == null) throw new DocumentNotUploadedException("Aadhaar card", claimId);
        if (claim.getEvidences() == null)   throw new DocumentNotUploadedException("Evidence", claimId);

        claim.setStatus(claim.getStatus().moveTo(Status.SUBMITTED));
        claim.setStatus(claim.getStatus().moveTo(Status.UNDER_REVIEW));
        return toResponse(claimRepository.save(claim));
    }

    // Admin moves claim to APPROVED or REJECTED — publishes ClaimDecisionEvent via RabbitMQ
    @Caching(evict = {
        @CacheEvict(value = "claims", key = "#claimId"),
        @CacheEvict(value = "allClaims", allEntries = true)
    })
    @org.springframework.transaction.annotation.Transactional
    public ClaimResponse moveToStatus(Long claimId, Status nextStatus) {
        Claim claim = findOrThrow(claimId);
        claim.setStatus(claim.getStatus().moveTo(nextStatus));
        Claim saved = claimRepository.save(claim);

        if (nextStatus == Status.APPROVED || nextStatus == Status.REJECTED) {
            if (nextStatus == Status.APPROVED) {
                try {
                    if (claim.getAmount() == null || claim.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                        throw new IllegalArgumentException("Claim amount must be greater than zero.");
                    }
                    policyClient.deductCoverage(claim.getPolicyId(), claim.getAmount());
                } catch (Exception e) {
                    log.error("Failed to deduct coverage for claim {}: {}", claim.getId(), e.getMessage());
                    throw new IllegalStateException("Failed to deduct coverage: " + e.getMessage());
                }
            }
            publishDecisionEvent(saved, nextStatus);
        }
        return toResponse(saved);
    }

    @Caching(evict = {
            @CacheEvict(value = "allClaims", allEntries = true)
    })
    public ClaimResponse uploadClaimForm(Long claimId, MultipartFile file) throws IOException {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        claim.setClaimForm(toFileData(file));
        return toResponse(claimRepository.save(claim));
    }

    /**
     * Multipart-based claim-form PDF generation.
     * User sends claim fields + a digital-signature image; we generate and store the PDF in `claimForm`.
     */
    @Caching(evict = {
            @CacheEvict(value = "allClaims", allEntries = true)
    })
    public ClaimResponse uploadClaimFormFromMultipart(
            Long claimId,
            String policyNumber,
            LocalDate dateClaimFiled,
            LocalDate dateIncidentHappen,
            String reasonForClaim,
            MultipartFile digitalSignatureImage
    ) throws IOException {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);

        // Validate policy number matches the claim's associated policy (if policyNumber exists in policy).
        PolicyDTO policy = policyClient.getPolicyById(claim.getPolicyId());
        String expectedPolicyNumber = policy.getPolicyNumber();
        if (expectedPolicyNumber != null && policyNumber != null
                && !expectedPolicyNumber.equalsIgnoreCase(policyNumber.trim())) {
            throw new IllegalArgumentException("policyNumber does not match the claim's policy.");
        }

        String finalPolicyNumber = (expectedPolicyNumber != null) ? expectedPolicyNumber : policyNumber;

        if (digitalSignatureImage == null || digitalSignatureImage.isEmpty()) {
            throw new IllegalArgumentException("Digital signature image is required.");
        }

        byte[] signatureBytes = digitalSignatureImage.getBytes();

        ClaimFormPdfGenerator generator = new ClaimFormPdfGenerator();
        byte[] pdfBytes = generator.generateClaimFormPdf(
                finalPolicyNumber,
                dateClaimFiled,
                dateIncidentHappen,
                reasonForClaim,
                signatureBytes
        );

        // Store the generated PDF in the existing `claimForm` column.
        claim.setClaimForm(new FileData("claim_" + claimId + ".pdf", "application/pdf", pdfBytes));
        return toResponse(claimRepository.save(claim));
    }

    @Caching(evict = {
            @CacheEvict(value = "allClaims", allEntries = true)
    })
    public ClaimResponse uploadAadhaarCard(Long claimId, MultipartFile file) throws IOException {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        claim.setAadhaarCard(toFileData(file));
        return toResponse(claimRepository.save(claim));
    }

    @Caching(evict = {
            @CacheEvict(value = "allClaims", allEntries = true)
    })
    public ClaimResponse uploadEvidence(Long claimId, MultipartFile file) throws IOException {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        claim.setEvidences(toFileData(file));
        return toResponse(claimRepository.save(claim));
    }

    public FileData downloadClaimForm(Long claimId) {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        if (claim.getClaimForm() == null) throw new DocumentNotUploadedException("Claim form", claimId);
        return claim.getClaimForm();
    }

    public FileData downloadAadhaarCard(Long claimId) {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        if (claim.getAadhaarCard() == null) throw new DocumentNotUploadedException("Aadhaar card", claimId);
        return claim.getAadhaarCard();
    }

    public FileData downloadEvidence(Long claimId) {
        Claim claim = findOrThrow(claimId);
        assertClaimBelongsToCurrentUser(claim);
        if (claim.getEvidences() == null) throw new DocumentNotUploadedException("Evidence", claimId);
        return claim.getEvidences();
    }

    // Publish claim decision event — email is handled asynchronously by a listener (or notification service)
    private void publishDecisionEvent(Claim claim, Status decision) {
        try {
            PolicyDTO policy = policyClient.getPolicyById(claim.getPolicyId());
            UserResponseDto user = userClient.getUserById(policy.getUserId());

            ClaimDecisionEvent event = ClaimDecisionEvent.builder()
                    .claimId(claim.getId())
                    .policyId(claim.getPolicyId())
                    .decision(decision.name())
                    .amount(claim.getAmount())
                    .customerEmail(user.getEmail())
                    .customerName(user.getFirstName())
                    .decidedAt(LocalDateTime.now())
                    .build();

            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.CLAIM_DECISION_KEY, event);
            log.info("ClaimDecisionEvent published — claimId={}, decision={}", claim.getId(), decision);
        } catch (Exception e) {
            log.error("Failed to publish ClaimDecisionEvent for claim {}: {}", claim.getId(), e.getMessage());
        }
    }

    private Claim findOrThrow(Long claimId) {
        return claimRepository.findById(claimId).orElseThrow(() -> new ClaimNotFoundException(claimId));
    }

    private FileData toFileData(MultipartFile file) throws IOException {
        return new FileData(file.getOriginalFilename(), file.getContentType(), file.getBytes());
    }

    private ClaimResponse toResponse(Claim claim) {
        return new ClaimResponse(
                claim.getId(), claim.getPolicyId(), claim.getAmount(), claim.getStatus(),
                claim.getTimeOfCreation(),
                claim.getClaimForm() != null, claim.getAadhaarCard() != null, claim.getEvidences() != null
        );
    }
}
