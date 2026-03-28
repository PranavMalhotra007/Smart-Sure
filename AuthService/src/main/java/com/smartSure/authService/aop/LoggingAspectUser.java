package com.smartSure.authService.aop;

import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Aspect
@Component
public class LoggingAspectUser {

    private static final Logger userLogger = LoggerFactory.getLogger("USER_LOGGER");

    @Around(
        "execution(* com.smartSure.authService.service.UserService.*(..)) || " +
        "execution(* com.smartSure.authService.service.AddressService.*(..))"
    )
    public Object logUserMethods(ProceedingJoinPoint joinPoint) throws Throwable {

        long start = System.currentTimeMillis();
        String method = joinPoint.getSignature().toShortString();

        userLogger.info("USER START → {}", method);

        try {
            Object result = joinPoint.proceed();

            long timeTaken = System.currentTimeMillis() - start;
            userLogger.info("USER END → {} | Time: {} ms", method, timeTaken);

            return result;

        } catch (Exception ex) {
            userLogger.error("USER ERROR → {} | {}", method, ex.getMessage(), ex);
            throw ex;
        }
    }
}