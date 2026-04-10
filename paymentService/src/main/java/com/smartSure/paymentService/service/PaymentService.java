package com.smartSure.paymentService.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.smartSure.paymentService.dto.*;
import com.smartSure.paymentService.entity.Payment;
import com.smartSure.paymentService.entity.PaymentStatus;
import com.smartSure.paymentService.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.currency:INR}")
    private String razorpayCurrency;

    // ─────────────────────────────────────────────────────────────
    // RAZORPAY — Create Order
    // ─────────────────────────────────────────────────────────────

    public RazorpayOrderResponse createRazorpayOrder(RazorpayOrderRequest request) {
        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            // Razorpay expects amount in paise (multiply INR by 100)
            long amountInPaise = Math.round(request.getAmount() * 100);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", razorpayCurrency);
            orderRequest.put("receipt", "rcpt_" + UUID.randomUUID().toString().substring(0, 8));
            orderRequest.put("payment_capture", 1);

            Order order = client.orders.create(orderRequest);
            String razorpayOrderId = order.get("id");

            log.info("Razorpay order created: {} for amount: {} INR", razorpayOrderId, request.getAmount());

            return RazorpayOrderResponse.builder()
                    .razorpayOrderId(razorpayOrderId)
                    .currency(razorpayCurrency)
                    .amount(amountInPaise)
                    .keyId(razorpayKeyId)
                    .policyId(request.getPolicyId())
                    .premiumId(request.getPremiumId())
                    .claimId(request.getClaimId())
                    .paymentFor(request.getPaymentFor())
                    .build();

        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order: {}", e.getMessage());
            throw new RuntimeException("Payment gateway error: " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // RAZORPAY — Verify Payment & Persist
    // ─────────────────────────────────────────────────────────────

    public PaymentResult verifyAndRecordPayment(RazorpayVerifyRequest request) {
        try {
            // Verify HMAC-SHA256 signature
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id",   request.getRazorpayOrderId());
            attributes.put("razorpay_payment_id",  request.getRazorpayPaymentId());
            attributes.put("razorpay_signature",   request.getRazorpaySignature());

            boolean valid = Utils.verifyPaymentSignature(attributes, razorpayKeySecret);

            if (!valid) {
                log.warn("Invalid Razorpay signature for order: {}", request.getRazorpayOrderId());
                return recordFailedPayment(request, "Payment signature verification failed");
            }

            // Signature valid — record success
            Payment payment = Payment.builder()
                    .transactionId(UUID.randomUUID().toString())
                    .policyId(request.getPolicyId())
                    .premiumId(request.getPremiumId())
                    .claimId(request.getClaimId())
                    .amount(request.getAmount())
                    .razorpayOrderId(request.getRazorpayOrderId())
                    .razorpayPaymentId(request.getRazorpayPaymentId())
                    .razorpaySignature(request.getRazorpaySignature())
                    .paymentFor(request.getPaymentFor())
                    .status(PaymentStatus.SUCCESS)
                    .remarks("Payment verified via Razorpay")
                    .paymentDate(LocalDateTime.now())
                    .build();

            paymentRepository.save(payment);

            log.info("Payment verified and recorded. TxnId: {}, Razorpay: {}",
                    payment.getTransactionId(), request.getRazorpayPaymentId());

            return PaymentResult.builder()
                    .transactionId(payment.getTransactionId())
                    .policyId(payment.getPolicyId())
                    .premiumId(payment.getPremiumId())
                    .claimId(payment.getClaimId())
                    .razorpayOrderId(request.getRazorpayOrderId())
                    .razorpayPaymentId(request.getRazorpayPaymentId())
                    .status("SUCCESS")
                    .message("Payment successful")
                    .paymentFor(request.getPaymentFor())
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay verification error: {}", e.getMessage());
            return recordFailedPayment(request, "Verification error: " + e.getMessage());
        }
    }

    private PaymentResult recordFailedPayment(RazorpayVerifyRequest request, String reason) {
        Payment payment = Payment.builder()
                .transactionId(UUID.randomUUID().toString())
                .policyId(request.getPolicyId())
                .premiumId(request.getPremiumId())
                .claimId(request.getClaimId())
                .amount(request.getAmount())
                .razorpayOrderId(request.getRazorpayOrderId())
                .razorpayPaymentId(request.getRazorpayPaymentId())
                .paymentFor(request.getPaymentFor())
                .status(PaymentStatus.FAILED)
                .remarks(reason)
                .paymentDate(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);

        return PaymentResult.builder()
                .transactionId(payment.getTransactionId())
                .policyId(request.getPolicyId())
                .premiumId(request.getPremiumId())
                .claimId(request.getClaimId())
                .razorpayOrderId(request.getRazorpayOrderId())
                .status("FAILED")
                .message(reason)
                .paymentFor(request.getPaymentFor())
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // Legacy SAGA methods (kept for RabbitMQ flow)
    // ─────────────────────────────────────────────────────────────

    public PaymentResult processPolicyPayment(Long policyId, Double amount) {
        log.info("SAGA: Processing payment for policy: {}, amount: {}", policyId, amount);
        boolean success = amount < 100000;
        Payment payment = Payment.builder()
                .transactionId(UUID.randomUUID().toString())
                .policyId(policyId)
                .amount(amount)
                .status(success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED)
                .remarks(success ? "Policy payment successful" : "Limit exceeded")
                .paymentFor("POLICY_PURCHASE")
                .paymentDate(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);
        return PaymentResult.builder()
                .transactionId(payment.getTransactionId())
                .policyId(policyId)
                .status(payment.getStatus().name())
                .message(payment.getRemarks())
                .paymentFor("POLICY_PURCHASE")
                .build();
    }

    public PaymentResult processClaimDisbursement(Long claimId, Double amount) {
        log.info("SAGA: Processing claim disbursement: {}, amount: {}", claimId, amount);
        Payment payment = Payment.builder()
                .transactionId(UUID.randomUUID().toString())
                .claimId(claimId)
                .amount(amount)
                .status(PaymentStatus.SUCCESS)
                .remarks("Claim disbursement processed")
                .paymentFor("CLAIM")
                .paymentDate(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);
        return PaymentResult.builder()
                .transactionId(payment.getTransactionId())
                .claimId(claimId)
                .status(payment.getStatus().name())
                .message(payment.getRemarks())
                .paymentFor("CLAIM")
                .build();
    }

    @Cacheable(value = "payments", key = "#transactionId")
    public Payment getPaymentByTransactionId(String transactionId) {
        return paymentRepository.findByTransactionId(transactionId).orElse(null);
    }
}
