package com.smartSure.PolicyService.service;

import com.smartSure.PolicyService.dto.policytype.PolicyTypeRequest;
import com.smartSure.PolicyService.dto.policytype.PolicyTypeResponse;
import com.smartSure.PolicyService.entity.PolicyType;
import com.smartSure.PolicyService.exception.PolicyTypeNotFoundException;
import com.smartSure.PolicyService.mapper.PolicyTypeMapper;
import com.smartSure.PolicyService.repository.PolicyTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PolicyTypeServiceTest {

    @Mock
    private PolicyTypeRepository policyTypeRepository;

    @Mock
    private PolicyTypeMapper policyTypeMapper;

    @InjectMocks
    private PolicyTypeService policyTypeService;

    private PolicyType policyType;
    private PolicyTypeRequest request;
    private PolicyTypeResponse response;

    @BeforeEach
    void setUp() {
        policyType = PolicyType.builder()
                .id(1L)
                .name("Health Basic")
                .minAge(18)
                .maxAge(60)
                .status(PolicyType.PolicyTypeStatus.ACTIVE)
                .category(PolicyType.InsuranceCategory.HEALTH)
                .build();

        request = PolicyTypeRequest.builder()
                .name("Health Basic")
                .minAge(18)
                .maxAge(60)
                .category(PolicyType.InsuranceCategory.HEALTH)
                .build();

        response = PolicyTypeResponse.builder()
                .id(1L)
                .name("Health Basic")
                .minAge(18)
                .maxAge(60)
                .category("HEALTH")
                .status("ACTIVE")
                .build();
    }

    @Test
    void getPolicyTypeById_NormalCase_Found() {
        when(policyTypeRepository.findById(1L)).thenReturn(Optional.of(policyType));
        when(policyTypeMapper.toResponse(policyType)).thenReturn(response);

        PolicyTypeResponse result = policyTypeService.getPolicyTypeById(1L);

        assertNotNull(result);
        assertEquals("Health Basic", result.getName());
    }

    @Test
    void getPolicyTypeById_ExceptionCase_NotFound() {
        when(policyTypeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(PolicyTypeNotFoundException.class, () -> policyTypeService.getPolicyTypeById(99L));
    }

    @Test
    void createPolicyType_NormalCase_Success() {
        when(policyTypeRepository.existsByName(request.getName())).thenReturn(false);
        when(policyTypeRepository.save(any(PolicyType.class))).thenReturn(policyType);
        when(policyTypeMapper.toResponse(policyType)).thenReturn(response);

        PolicyTypeResponse result = policyTypeService.createPolicyType(request);

        assertNotNull(result);
        assertEquals("Health Basic", result.getName());
        verify(policyTypeRepository).save(any(PolicyType.class));
    }

    @Test
    void createPolicyType_BoundaryCase_SameAges() {
        request.setMinAge(30);
        request.setMaxAge(30);
        
        when(policyTypeRepository.existsByName(request.getName())).thenReturn(false);
        when(policyTypeRepository.save(any(PolicyType.class))).thenReturn(policyType);
        when(policyTypeMapper.toResponse(policyType)).thenReturn(response);

        assertDoesNotThrow(() -> policyTypeService.createPolicyType(request));
    }

    @Test
    void createPolicyType_ExceptionCase_AlreadyExists() {
        when(policyTypeRepository.existsByName(request.getName())).thenReturn(true);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> policyTypeService.createPolicyType(request));
        assertTrue(exception.getMessage().contains("already exists"));
        verify(policyTypeRepository, never()).save(any());
    }

    @Test
    void createPolicyType_ExceptionCase_InvalidAgeRange() {
        request.setMinAge(60);
        request.setMaxAge(18); // Min > Max

        when(policyTypeRepository.existsByName(request.getName())).thenReturn(false);

        Exception exception = assertThrows(IllegalArgumentException.class, () -> policyTypeService.createPolicyType(request));
        assertEquals("Min age cannot be greater than max age", exception.getMessage());
        verify(policyTypeRepository, never()).save(any());
    }

    @Test
    void updatePolicyType_NormalCase_Success() {
        when(policyTypeRepository.findById(1L)).thenReturn(Optional.of(policyType));
        when(policyTypeRepository.save(any(PolicyType.class))).thenReturn(policyType);
        when(policyTypeMapper.toResponse(policyType)).thenReturn(response);

        PolicyTypeResponse result = policyTypeService.updatePolicyType(1L, request);

        assertNotNull(result);
        verify(policyTypeRepository).save(policyType);
    }

    @Test
    void deletePolicyType_NormalCase_Success() {
        when(policyTypeRepository.findById(1L)).thenReturn(Optional.of(policyType));

        policyTypeService.deletePolicyType(1L);

        assertEquals(PolicyType.PolicyTypeStatus.DISCONTINUED, policyType.getStatus());
        verify(policyTypeRepository).save(policyType);
    }
}
