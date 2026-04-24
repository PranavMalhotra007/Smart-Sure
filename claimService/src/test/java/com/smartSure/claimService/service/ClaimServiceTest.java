package com.smartSure.claimService.service;

import com.smartSure.claimService.client.PolicyClient;
import com.smartSure.claimService.client.UserClient;
import com.smartSure.claimService.dto.ClaimRequest;
import com.smartSure.claimService.dto.ClaimResponse;
import com.smartSure.claimService.dto.PolicyDTO;
import com.smartSure.claimService.entity.Claim;
import com.smartSure.claimService.entity.Status;
import com.smartSure.claimService.exception.UnauthorizedAccessException;
import com.smartSure.claimService.exception.ClaimNotFoundException;
import com.smartSure.claimService.exception.InvalidStatusTransitionException;
import com.smartSure.claimService.repository.ClaimRepository;
import com.smartSure.claimService.util.SecurityUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClaimServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private PolicyClient policyClient;

    @Mock
    private UserClient userClient;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private ClaimService claimService;

    private MockedStatic<SecurityUtils> securityUtilsMock;

    private Claim claim;
    private PolicyDTO policyDTO;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);

        claim = new Claim();
        claim.setId(1L);
        claim.setPolicyId(10L);
        claim.setAmount(new BigDecimal("500"));
        claim.setStatus(Status.DRAFT);

        policyDTO = new PolicyDTO();
        policyDTO.setId(10L);
        policyDTO.setCustomerId(100L);
        policyDTO.setStatus("ACTIVE");
        policyDTO.setCoverageAmount(new BigDecimal("10000"));
        policyDTO.setLeftoverCoverageAmount(new BigDecimal("10000"));
    }

    @AfterEach
    void tearDown() {
        securityUtilsMock.close();
    }

    @Test
    void createClaim_NormalCase_Success() {
        securityUtilsMock.when(SecurityUtils::getCurrentRole).thenReturn("ROLE_USER");
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(100L);

        when(policyClient.getPolicyById(10L)).thenReturn(policyDTO);
        when(claimRepository.save(any(Claim.class))).thenReturn(claim);

        ClaimRequest request = new ClaimRequest();
        request.setPolicyId(10L);
        request.setAmount(new BigDecimal("500"));

        ClaimResponse response = claimService.createClaim(request);

        assertNotNull(response);
        assertEquals(new BigDecimal("500"), response.getAmount());
    }

    @Test
    void createClaim_BoundaryCase_ExactLeftoverAmount() {
        securityUtilsMock.when(SecurityUtils::getCurrentRole).thenReturn("ROLE_USER");
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(100L);

        when(policyClient.getPolicyById(10L)).thenReturn(policyDTO);
        when(claimRepository.save(any(Claim.class))).thenReturn(claim);

        ClaimRequest request = new ClaimRequest();
        request.setPolicyId(10L);
        request.setAmount(new BigDecimal("10000"));

        ClaimResponse response = claimService.createClaim(request);

        assertNotNull(response);
    }

    @Test
    void createClaim_ExceptionCase_AmountExceedsLeftover() {
        securityUtilsMock.when(SecurityUtils::getCurrentRole).thenReturn("ROLE_USER");
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(100L);

        when(policyClient.getPolicyById(10L)).thenReturn(policyDTO);

        ClaimRequest request = new ClaimRequest();
        request.setPolicyId(10L);
        request.setAmount(new BigDecimal("15000"));

        Exception ex = assertThrows(IllegalArgumentException.class, () -> claimService.createClaim(request));
        assertTrue(ex.getMessage().contains("higher than the leftover amount"));
    }

    @Test
    void getClaimById_ExceptionCase_Unauthorized() {
        securityUtilsMock.when(SecurityUtils::getCurrentRole).thenReturn("ROLE_USER");
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(999L); // Different user

        when(claimRepository.findById(1L)).thenReturn(Optional.of(claim));
        when(policyClient.getPolicyById(10L)).thenReturn(policyDTO);

        assertThrows(UnauthorizedAccessException.class, () -> claimService.getClaimById(1L));
    }

    @Test
    void submitClaim_ExceptionCase_MissingDocuments() {
        securityUtilsMock.when(SecurityUtils::getCurrentRole).thenReturn("ROLE_USER");
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(100L);

        when(claimRepository.findById(1L)).thenReturn(Optional.of(claim));
        when(policyClient.getPolicyById(10L)).thenReturn(policyDTO);

        // Claim has no documents attached yet
        assertThrows(RuntimeException.class, () -> claimService.submitClaim(1L));
    }

    @Test
    void deleteClaim_NormalCase_Success() {
        securityUtilsMock.when(SecurityUtils::getCurrentRole).thenReturn("ROLE_ADMIN");

        when(claimRepository.findById(1L)).thenReturn(Optional.of(claim));

        assertDoesNotThrow(() -> claimService.deleteClaim(1L));
        verify(claimRepository).deleteById(1L);
    }

    @Test
    void moveToStatus_NormalCase_RejectClaim() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(claim));
        when(claimRepository.save(any())).thenReturn(claim);

        ClaimResponse response = claimService.moveToStatus(1L, Status.REJECTED);

        assertNotNull(response);
        assertEquals(Status.REJECTED, claim.getStatus());
    }
}
