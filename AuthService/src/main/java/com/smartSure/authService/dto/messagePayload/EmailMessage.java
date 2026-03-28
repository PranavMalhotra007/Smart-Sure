package com.smartSure.authService.dto.messagePayload;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EmailMessage implements Serializable{
    private String to;
    private String subject;
    private String body;
}