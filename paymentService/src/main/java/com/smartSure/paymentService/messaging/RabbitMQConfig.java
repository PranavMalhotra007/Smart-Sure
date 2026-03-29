package com.smartSure.paymentService.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "payment.exchange";
    
    // Inbound Queues (Listen for requests)
    public static final String POLICY_PAYMENT_REQ_QUEUE = "policy.payment.request.queue";
    public static final String CLAIM_PAYMENT_REQ_QUEUE = "claim.payment.request.queue";
    
    // Outbound Queues (Send results)
    public static final String PAYMENT_RESULT_QUEUE = "payment.result.queue";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue policyPaymentQueue() { return new Queue(POLICY_PAYMENT_REQ_QUEUE); }

    @Bean
    public Queue claimPaymentQueue() { return new Queue(CLAIM_PAYMENT_REQ_QUEUE); }

    @Bean
    public Queue resultQueue() { return new Queue(PAYMENT_RESULT_QUEUE); }

    @Bean
    public Binding policyBinding(Queue policyPaymentQueue, TopicExchange exchange) {
        return BindingBuilder.bind(policyPaymentQueue).to(exchange).with("policy.payment.request.#");
    }

    @Bean
    public Binding claimBinding(Queue claimPaymentQueue, TopicExchange exchange) {
        return BindingBuilder.bind(claimPaymentQueue).to(exchange).with("claim.payment.request.#");
    }

    @Bean
    public MessageConverter converter() {
        return new Jackson2JsonMessageConverter();
    }
}
