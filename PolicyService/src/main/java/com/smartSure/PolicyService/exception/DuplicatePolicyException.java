package com.smartSure.PolicyService.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicatePolicyException extends RuntimeException {

    public DuplicatePolicyException() {
        super("You have already reached the maximum limit (4) of active policies for this plan.");
    }
}