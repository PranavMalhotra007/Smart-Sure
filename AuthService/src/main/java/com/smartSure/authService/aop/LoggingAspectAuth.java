package com.smartSure.authService.aop;

import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;

@Aspect
@Component
public class LoggingAspectAuth {

    private static final Logger authLogger = LoggerFactory.getLogger("AUTH_LOGGER");

    @Around("execution(* com.smartSure.authService.service.AuthService.*(..))")
    public Object logAuthMethods(ProceedingJoinPoint joinPoint) throws Throwable {

        long start = System.currentTimeMillis();
        String method = joinPoint.getSignature().toShortString();

        authLogger.info("AUTH START → {}", method);

        try {
            Object result = joinPoint.proceed();

            long timeTaken = System.currentTimeMillis() - start;
            authLogger.info("AUTH END → {} | Time: {} ms", method, timeTaken);

            return result;

        } catch (Exception ex) {
            authLogger.error("AUTH ERROR → {} | {}", method, ex.getMessage(), ex);
            throw ex;
        }
    }
}
