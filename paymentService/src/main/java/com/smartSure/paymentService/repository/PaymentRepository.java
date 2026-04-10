package com.smartSure.paymentService.repository;

import com.smartSure.paymentService.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionId(String transactionId);
    Optional<Payment> findByPolicyId(Long policyId);
    Optional<Payment> findByClaimId(Long claimId);
    Optional<Payment> findByPremiumId(Long premiumId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);
}
