# SmartSure Microservices — Technologies & Service Architecture

## 1. Additional Technologies Added

### A. Redis (Distributed Caching)
**Status**: Implemented actively across the application.
**How it is added**: 
- Declared in `pom.xml` via `spring-boot-starter-data-redis` and `spring-boot-starter-cache`.
- Cache configuration classes (`RedisConfig.java` / `AdminCacheConfig.java`) set up `RedisTemplate` and caching serialization.
**How it is used**:
- Spring's `@Cacheable`, `@CachePut`, and `@CacheEvict` annotations are used above Service methods.
- **AuthService**: Caches `UserService` profiles and `AddressService` queries to dramatically reduce database loads for repeated customer logins. 
- **PolicyService**: Caches `PolicyTypeService` (e.g., base policy templates). Because templates rarely change, checking the Redis cache prevents hitting the MySQL database, significantly speeding up the policy purchase flow.
- **AdminService**: Instantiates a robust custom `RedisCacheManager` with JSON serialization to handle heavy-read Dashboard operations.
**To Run**: Located internally at `redis:6379`. Accessible externally at `localhost:6379`. No password is required in development mode.

### B. RabbitMQ (Async Event Messaging)
**How it is added**:
- Implemented via `spring-boot-starter-amqp`.
- Each service has a dedicated `messaging/RabbitMQConfig.java` that declares explicit Exchanges, Queues, and Routing bindings.
**How it is used**:
- **Topic Exchanges**: `smartsure.exchange` and `smartsure.notifications`.
- **PolicyService**: When a user pays a premium, it asynchronously broadcasts a `PremiumPaidEvent` (`premium.paid`).
- **ClaimService**: When an admin approves/rejects a claim, it broadcasts a `ClaimDecisionEvent` (`claim.decision`).
- **AdminService**: Acts as the master listener (`AuditEventListener`). It consumes both queues without slowing down the customer’s HTTP request, instantly creating Audit Logs for compliance.
**To Run**: Accessible via Management UI at `http://localhost:15672`. (Credentials: `guest` / `guest`).

### C. Zipkin & Micrometer (Distributed Tracing)
**How it is added**:
- Implemented via `micrometer-tracing-bridge-brave` and `zipkin-reporter-brave`.
- Added to all `application.properties` globally pointing to `http://zipkin:9411/api/v2/spans`.
**How it is used**:
- It attaches a unique `traceId` to every API Gateway request. When Gateway calls ClaimService, and ClaimService calls PolicyService via Feign, the `traceId` is automatically forwarded. 
- You can search the Zipkin UI to see a waterfall diagram of exactly how long a request spent in each microservice.
**To Run**: Accessible via UI at `http://localhost:9411`.

---

## 2. Service Layer Operations & Exceptions

### Auth Service (`UserService.java` & `AuthService.java`)
- **Operations**: Validates registration constraints, dynamically hashes passwords, builds tokens, and extracts Spring Security identities.
- **Exceptions**: 
    - `ResourceNotFoundException`: Thrown if calling `/getInfo` for a User/Address that does not exist in the DB.
    - `IllegalArgumentException`: Thrown when a user attempts to register with an email that is already taken.

### Policy Service (`PolicyService.java` & `PremiumCalculator.java`)
- **Operations**: Core algorithmic engine. Calculates premium prices based on a base price natively multiplied by age-risk factors. Orchestrates Renewal flows, and manages Policy lifecycle states (`CREATED` -> `ACTIVE` -> `EXPIRED` -> `CANCELLED`).
- **Exceptions**:
    - `ResourceNotFoundException`: Thrown when fetching a dead `policyId`.
    - `IllegalStateException`: Thrown if a customer tries to `cancel()` a policy that is already expired, or `renew()` a policy that isn't active.
    - `SecurityException / AccessDeniedException`: Triggered if a user provides an invalid Policy ID they do not logically own.

### Claim Service (`ClaimService.java`)
- **Operations**: Retrieves the user's coverage dynamically via `PolicyClient`, verifies the claim amount does not exceed coverage, and tracks the upload status of 3 required documents (Form, Evidences, Aadhar).
- **Exceptions**:
    - `IllegalArgumentException`: Thrown if a claim amount exceeds the dynamically-fetched Policy constraints.
    - `IllegalStateException`: Thrown if an Admin tries to move a `CREATED` claim to `APPROVED` before it has reached the `UNDER_REVIEW` state.

### Admin Service (`AdminService.java`)
- **Operations**: Pure orchestration API. It does not own core entity tables. It heavily relies on OpenFeign to aggregate users and policies, formatting them for dashboard endpoints. It manages the `AuditLog` table natively.
- **Exceptions**:
    - Generally propagates HTTP 404/400 exceptions sent back by the feign clients (Policy/Auth). Uses Resilience4J fault-tolerance fallbacks when they timeout.
