package com.smartSure.paymentService.service;

import com.smartSure.paymentService.dto.PaymentResult;
import com.smartSure.paymentService.entity.Payment;
import com.smartSure.paymentService.entity.PaymentStatus;
import com.smartSure.paymentService.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

    public PaymentResult processPolicyPayment(Long policyId, Double amount) {
        log.info("Processing payment for policy: {}, amount: {}", policyId, amount);
        
        // Simulation logic
        boolean success = amount < 100000; // Simulated fraud/limit check
        
        Payment payment = Payment.builder()
                .transactionId(UUID.randomUUID().toString())
                .policyId(policyId)
                .amount(amount)
                .status(success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED)
                .remarks(success ? "Policy payment successful" : "Insufficient funds / Limit exceeded")
                .paymentDate(LocalDateTime.now())
                .build();
        
        paymentRepository.save(payment);
        
        return PaymentResult.builder()
                .transactionId(payment.getTransactionId())
                .policyId(policyId)
                .status(payment.getStatus().name())
                .message(payment.getRemarks())
                .build();
    }

    public PaymentResult processClaimDisbursement(Long claimId, Double amount) {
        log.info("Processing claim disbursement: {}, amount: {}", claimId, amount);
        
        Payment payment = Payment.builder()
                .transactionId(UUID.randomUUID().toString())
                .claimId(claimId)
                .amount(amount)
                .status(PaymentStatus.SUCCESS)
                .remarks("Claim disbursement processed")
                .paymentDate(LocalDateTime.now())
                .build();
        
        paymentRepository.save(payment);
        
        return PaymentResult.builder()
                .transactionId(payment.getTransactionId())
                .claimId(claimId)
                .status(payment.getStatus().name())
                .message(payment.getRemarks())
                .build();
    }

    @Cacheable(value = "payments", key = "#transactionId")
    public Payment getPaymentByTransactionId(String transactionId) {
        return paymentRepository.findByTransactionId(transactionId).orElse(null);
    }
}
