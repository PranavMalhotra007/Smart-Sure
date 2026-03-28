package com.smartSure.adminService.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ClaimService publishes to this exchange
    public static final String CLAIM_EXCHANGE         = "smartsure.exchange";
    public static final String CLAIM_DECISION_KEY     = "claim.decision";

    // PolicyService publishes to this exchange
    public static final String POLICY_EXCHANGE        = "smartsure.notifications";
    public static final String PREMIUM_PAID_KEY       = "premium.paid";

    // Admin listens to claim decisions for audit logging
    public static final String ADMIN_CLAIM_AUDIT_QUEUE   = "admin.claim.audit.queue";
    // Admin listens to premium payments for audit logging
    public static final String ADMIN_PAYMENT_AUDIT_QUEUE = "admin.payment.audit.queue";

    // Exchange for ClaimService events
    @Bean
    public TopicExchange claimExchange() {
        return new TopicExchange(CLAIM_EXCHANGE);
    }

    // Exchange for PolicyService events
    @Bean
    public TopicExchange policyExchange() {
        return new TopicExchange(POLICY_EXCHANGE, true, false);
    }

    @Bean
    public Queue adminClaimAuditQueue() {
        return QueueBuilder.durable(ADMIN_CLAIM_AUDIT_QUEUE).build();
    }

    @Bean
    public Queue adminPaymentAuditQueue() {
        return QueueBuilder.durable(ADMIN_PAYMENT_AUDIT_QUEUE).build();
    }

    // Bind claim audit queue to ClaimService exchange
    @Bean
    public Binding adminClaimAuditBinding() {
        return BindingBuilder.bind(adminClaimAuditQueue()).to(claimExchange()).with(CLAIM_DECISION_KEY);
    }

    // Bind payment audit queue to PolicyService exchange (correct exchange!)
    @Bean
    public Binding adminPaymentAuditBinding() {
        return BindingBuilder.bind(adminPaymentAuditQueue()).to(policyExchange()).with(PREMIUM_PAID_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
