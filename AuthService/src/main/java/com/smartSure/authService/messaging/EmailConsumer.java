package com.smartSure.authService.messaging;


import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import com.smartSure.authService.config.RabbitMQConfig;
import com.smartSure.authService.dto.messagePayload.EmailMessage;
import com.smartSure.authService.email.EmailSenderService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailConsumer {

    private final EmailSenderService emailSenderService;

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    public void consume(EmailMessage message) {

        System.out.println("Received message for: " + message.getTo());

        emailSenderService.sendEmail(
                message.getTo(),
                message.getSubject(),
                message.getBody()
        );
    }
}