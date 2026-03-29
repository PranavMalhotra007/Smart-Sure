# Resilience and Circuit Breakers in SmartSure

This document outlines the fault-tolerance and resilience strategies implemented in the SmartSure microservices system using **Resilience4j**.

## 1. Overview
The system uses the **Circuit Breaker** pattern to prevent cascading failures. When a downstream service (like AuthService or PolicyTypeService) is slow or unavailable, the circuit "opens," and subsequent calls are diverted to a local "fallback" method instead of timing out or returning 500 errors.

## 2. PolicyService Implementations

The `PolicyService` is the most resilient component, protecting multiple inter-service calls.

### A. Policy Purchase Flow
- **Annotation**: `@CircuitBreaker(name = "policyTypeService", fallbackMethod = "purchaseFallback")`
- **Rate Limiter**: `@RateLimiter(name = "policyPurchase")`
- **Fallback Logic**: If `PolicyTypeRepository` or external checks fail, `purchaseFallback` is triggered.
- **User Impact**: Instead of a generic error, the user receives a `ServiceUnavailableException` with a meaningful message: *"Policy purchase service is temporarily unavailable."*

### B. Policy Type Lookups
- **Service**: `PolicyTypeService`
- **Annotation**: `@CircuitBreaker(name = "policyTypeService", fallbackMethod = "getAllActiveFallback")`
- **Fallback Logic**: Returns an **empty list** (`List.of()`).
- **User Impact**: The frontend remains functional but shows *"No products available"* instead of crashing.

### C. Premium Payments
- **Annotation**: `@CircuitBreaker(name = "policyTypeService", fallbackMethod = "payPremiumFallback")`
- **Fallback Logic**: Throws `ServiceUnavailableException`.

## 3. API Gateway (Global Resilience)

The API Gateway provides a first line of defense for all microservices.

- **Implementation**: Spring Cloud Gateway + Resilience4j Filter.
- **Config**: Defined in `ApiGatewaySmartSure/src/main/resources/application.properties`.
- **Default Behavior**:
    - `sliding-window-size`: 10 calls.
    - `failure-rate-threshold`: 50%.
    - `wait-duration-in-open-state`: 30 seconds.

## 4. Configuration Details

Resilience settings are centralized in `application.properties`:

```properties
# Circuit Breaker Configuration
resilience4j.circuitbreaker.instances.authService.sliding-window-size=10
resilience4j.circuitbreaker.instances.authService.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.authService.wait-duration-in-open-state=30s

# Rate Limiter (Preventing Abuse)
resilience4j.ratelimiter.instances.policyPurchase.limit-for-period=10
resilience4j.ratelimiter.instances.policyPurchase.limit-refresh-period=1s
```

## 5. Monitoring Resilience

Circuit breaker states (CLOSED, OPEN, HALF_OPEN) are exported via Actuator:
- **Endpoint**: `/actuator/health` (includes circuit breaker status).
- **Endpoint**: `/actuator/prometheus` (includes metrics for failure rates and call counts).

> [!TIP]
> You can view real-time resilience metrics in Grafana by searching for the "Resilience4j" dashboard.
