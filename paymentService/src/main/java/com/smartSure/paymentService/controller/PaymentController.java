package com.smartSure.paymentService.controller;

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
