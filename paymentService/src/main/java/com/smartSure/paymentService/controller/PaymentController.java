package com.smartSure.paymentService.controller;

import com.smartSure.paymentService.dto.*;
import com.smartSure.paymentService.entity.Payment;
import com.smartSure.paymentService.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management API")
public class PaymentController {

    private final PaymentService paymentService;

    // ─────────────────────────────────────────────────────────────
    // Step 1: Frontend calls this to get a Razorpay Order ID
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/create-order")
    @Operation(summary = "Create a Razorpay order for policy purchase or premium payment")
    public ResponseEntity<RazorpayOrderResponse> createOrder(
            @RequestBody RazorpayOrderRequest request) {
        return ResponseEntity.ok(paymentService.createRazorpayOrder(request));
    }

    // ─────────────────────────────────────────────────────────────
    // Step 2: After Razorpay checkout success, frontend calls this
    //         to verify signature and record the payment
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/verify")
    @Operation(summary = "Verify Razorpay payment signature and record result")
    public ResponseEntity<PaymentResult> verifyPayment(
            @RequestBody RazorpayVerifyRequest request) {
        PaymentResult result = paymentService.verifyAndRecordPayment(request);
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────────────────
    // Lookup by transaction ID
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/transaction/{transactionId}")
    @Operation(summary = "Get payment details by transaction ID")
    public ResponseEntity<Payment> getPayment(@PathVariable String transactionId) {
        Payment payment = paymentService.getPaymentByTransactionId(transactionId);
        return (payment != null) ? ResponseEntity.ok(payment) : ResponseEntity.notFound().build();
    }

    @GetMapping("/health-check")
    @Operation(summary = "Simple health check endpoint")
    public String health() {
        return "Payment Service is up and running";
    }
}
