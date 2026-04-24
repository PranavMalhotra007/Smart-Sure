package com.smartSure.paymentService.service;

import com.smartSure.paymentService.dto.PaymentResult;
import com.smartSure.paymentService.entity.Payment;
import com.smartSure.paymentService.entity.PaymentStatus;
import com.smartSure.paymentService.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void processPolicyPayment_NormalCase_Success() {
        // Arrange
        Long policyId = 100L;
        Double amount = 50000.0; // Under 100000

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = i.getArgument(0);
            p.setId(1L);
            return p;
        });

        // Act
        PaymentResult result = paymentService.processPolicyPayment(policyId, amount);

        // Assert
        assertNotNull(result);
        assertEquals(policyId, result.getPolicyId());
        assertEquals("SUCCESS", result.getStatus());
        assertEquals("POLICY_PURCHASE", result.getPaymentFor());
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    void processPolicyPayment_BoundaryCase_LimitExceeded() {
        // Arrange
        Long policyId = 100L;
        Double amount = 100000.0; // Exactly at limit, so success becomes false since condition is amount < 100000

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        PaymentResult result = paymentService.processPolicyPayment(policyId, amount);

        // Assert
        assertNotNull(result);
        assertEquals(policyId, result.getPolicyId());
        assertEquals("FAILED", result.getStatus());
        assertEquals("Limit exceeded", result.getMessage());
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    void processClaimDisbursement_NormalCase_Success() {
        // Arrange
        Long claimId = 50L;
        Double amount = 15000.0;

        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        PaymentResult result = paymentService.processClaimDisbursement(claimId, amount);

        // Assert
        assertNotNull(result);
        assertEquals(claimId, result.getClaimId());
        assertEquals("SUCCESS", result.getStatus());
        assertEquals("CLAIM", result.getPaymentFor());
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    void getPaymentByTransactionId_NormalCase_Found() {
        // Arrange
        String txnId = "txn-123";
        Payment payment = Payment.builder()
                .id(1L)
                .transactionId(txnId)
                .amount(100.0)
                .build();
        when(paymentRepository.findByTransactionId(txnId)).thenReturn(Optional.of(payment));

        // Act
        Payment result = paymentService.getPaymentByTransactionId(txnId);

        // Assert
        assertNotNull(result);
        assertEquals(txnId, result.getTransactionId());
        verify(paymentRepository, times(1)).findByTransactionId(txnId);
    }

    @Test
    void getPaymentByTransactionId_ExceptionCase_NotFound() {
        // Arrange
        String txnId = "txn-999";
        when(paymentRepository.findByTransactionId(txnId)).thenReturn(Optional.empty());

        // Act
        Payment result = paymentService.getPaymentByTransactionId(txnId);

        // Assert
        assertNull(result);
        verify(paymentRepository, times(1)).findByTransactionId(txnId);
    }
}
