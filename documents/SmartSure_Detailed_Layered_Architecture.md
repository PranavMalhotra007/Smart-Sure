# SmartSure: Detailed Layered Architecture Analysis

Each microservice in the SmartSure system follows a standard hexagonal-lite architecture where concerns are strictly segregated to ensure maintainability.

---

### 1. Auth Service (`AuthService`)
This service is the system's "Trust Provider," managing user identity and session tokens.

*   **DTO Layer (The Contract)**:
    *   **What**: `RegisterRequestDto`, `LoginRequestDto`, `AuthResponseDto`. Includes JSR-303 annotations like `@NotBlank` (Email) and `@Size(min=8)` (Password).
    *   **How**: Maps incoming JSON traffic from the API Gateway into structured Java objects.
    *   **Why**: Enforces mandatory validation at the first possible boundary (the Controller) to reject invalid data before it reaches the database.
*   **Entity Layer (The Persistence)**:
    *   **What**: `User`, `Role` (Enum). Uses `@Entity` and `@Table(name="users")`.
    *   **How**: Represents the permanent storage format in MySQL. High-risk fields (Passwords) are NEVER stored in plain text.
    *   **Why**: Standardizes data mapping and allows for JPA-level lifecycle hooks.
*   **Service Layer (The Logic)**:
    *   **What**: `AuthService.java`. Uses `@Service`, `BCryptPasswordEncoder`, and `JwtUtil`.
    *   **How**: Executes the logic for matching salt-hashes, verifying credentials, and generating signed JWTs with role-based claims.
    *   **Why**: Centralizes identity logic so it can be audited and updated (e.g., rotating JWT secrets) without touching controllers.
*   **Messaging Layer (The Decoupler)**:
    *   **What**: `EmailPublisher`. Uses `RabbitTemplate`.
    *   **How**: After successful registration/login, it serializes an `EmailMessage` and sends it to `auth.email.exchange`.
    *   **Behavior**: Asynchronous; if the email server is slow, the user's login is NOT delayed.

### 2. Policy Service (`PolicyService`)
The core domain service managing the "Product" lifecycle and mathematical risk factors.

*   **DTO Layer (The Intent)**:
    *   **What**: `PolicyPurchaseRequest`, `RenewalRequest`.
    *   **Why**: Segregates "Purchase" (Create) intent from "Renewal" (Update) intent which requires different validation logic.
*   **Entity Layer (The Domain)**:
    *   **What**: `Policy`, `PolicyType`, `Premium`, `AuditLog`. Uses `@ManyToOne` relationships.
    *   **Behavior**: Cascading operations are defined so that deleting a policy automatically waives its `Premium` schedule.
*   **Service Layer (The Engine)**:
    *   **What**: `PolicyService.java` and `PremiumCalculator.java` (`@Component`).
    *   **How**: The `PremiumCalculator` uses an algorithmic multiplier based on `Age`, `CoverageAmount`, and `PaymentFrequency`.
    *   **Why**: Decouples the "Math" (Calculation Engine) from the "Orchestration" (Database saving/Event firing).
*   **Feign Client Layer (The Bridge)**:
    *   **What**: `AuthServiceClient`. Uses `@FeignClient(name="authService")`.
    *   **How**: Synchronously fetches customer email/name for event payloads. Includes **Resilience4j** annotations for fault tolerance.

### 3. Claim Service (`claimService`)
Manages the "Event" lifecycle where a customer requests a payout against a policy.

*   **DTO Layer (The Evidence)**:
    *   **What**: `ClaimRequest`, `ClaimResponse`.
    *   **How**: Used to capture the `policyId` and mapped to return status and document availability flags.
*   **Entity Layer (The Blob Handler)**:
    *   **What**: `Claim`, `FileData` (`@Embeddable`).
    *   **How**: `FileData` stores the `byte[]` of the uploaded Aadhaar, Claim Form, and Evidences.
    *   **Why**: Keeps the document metadata (Content-Type, Filename) tied directly to the binary data in the DB.
*   **Service Layer (The Workflow)**:
    *   **What**: `ClaimService.java`.
    *   **How**: Implements a strict State Machine (`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED/REJECTED`). 
    *   **Behavior**: Uses `@Cacheable` on `getClaimById` to reduce DB pressure during the intensive admin review process.
*   **Messaging Layer (The SAGA Trigger)**:
    *   **What**: `ClaimDecisionEvent`.
    *   **How**: When a claim is `APPROVED`, it fires an event to the `paymentService` to initiate disbursement.

### 4. Admin Service (`adminService`)
The aggregation and oversight layer for system-wide auditing and manual overrides.

*   **Service Layer (The Aggregator)**:
    *   **What**: `AdminService.java`.
    *   **How**: Uses multiple Feign clients to join data (e.g., getting a Claim, then its Policy, then the Policy's User).
    *   **Why**: **Saves front-end requests**. Instead of the UI making 3 calls to different services, it makes 1 call to AdminService.
*   **Security Layer (The Guard)**:
    *   **What**: `@PreAuthorize("hasRole('ADMIN')")`.
    *   **How**: Enforces that only users with the `ADMIN` authority (from the JWT) can access these destructive/sensitive APIs.

### 5. Payment Service (`paymentService`)
(New) Handles the financial reconciliation and SAGA transaction outcomes.

*   **Messaging Layer (The Listener)**:
    *   **What**: `PaymentEventListener` using `@RabbitListener`.
    *   **How**: Listens to `POLICY_PAYMENT_REQ_QUEUE`.
    *   **Behavior**: Orchestrates the SAGA flow by acknowledging receipt, processing the transaction state, and emitting a success/failure result back to RabbitMQ.
*   **Service Layer (The Simulator)**:
    *   **What**: `PaymentService.java`. Implements `@Cacheable` for transaction status.
    *   **Why**: Future-proofed to eventually integrate with real gateways (Stripe/Razorpay) while maintaining the SAGA contract today.

---

> [!NOTE]
> This layered behavior ensures that if the database schema changes, only the **Entity** layer is modified. If the external API needs a new field, only the **DTO** is updated. This **Separation of Concerns** is why the system remains robust.
