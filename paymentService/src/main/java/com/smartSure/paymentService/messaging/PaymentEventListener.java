package com.smartSure.paymentService.messaging;

import com.smartSure.paymentService.dto.PaymentResult;
import com.smartSure.paymentService.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventListener {

    private final PaymentService paymentService;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = RabbitMQConfig.POLICY_PAYMENT_REQ_QUEUE)
    public void handlePolicyPaymentRequest(Map<String, Object> message) {
        log.info("SAGA: Received policy payment request: {}", message);
        try {
            Long policyId = Long.valueOf(message.get("policyId").toString());
            Double amount = Double.valueOf(message.get("amount").toString());
            
            PaymentResult result = paymentService.processPolicyPayment(policyId, amount);
            publishResult(result);
            
        } catch (Exception e) {
            log.error("SAGA Error: Failed to process policy payment: {}", e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.CLAIM_PAYMENT_REQ_QUEUE)
    public void handleClaimPaymentRequest(Map<String, Object> message) {
        log.info("SAGA: Received claim payment request: {}", message);
        try {
            Long claimId = Long.valueOf(message.get("claimId").toString());
            Double amount = Double.valueOf(message.get("amount").toString());
            
            PaymentResult result = paymentService.processClaimDisbursement(claimId, amount);
            publishResult(result);
            
        } catch (Exception e) {
            log.error("SAGA Error: Failed to process claim disbursement: {}", e.getMessage());
        }
    }

    private void publishResult(PaymentResult result) {
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, "payment.result.updated", result);
        log.info("SAGA: Published payment result for ID: {}, Status: {}", 
                 result.getTransactionId(), result.getStatus());
    }
}
