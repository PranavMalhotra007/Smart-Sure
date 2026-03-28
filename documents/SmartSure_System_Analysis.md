# SmartSure Insurance Microservices — Complete System Analysis

> **Generated**: 2026-03-28 | **Status**: All bugs fixed ✅

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Security Flow — How JWT Travels Through the System](#2-security-flow)
3. [Service-by-Service Deep Dive](#3-service-deep-dive)
4. [OpenFeign Clients — Inter-Service Communication](#4-openfeign-clients)
5. [RabbitMQ Messaging Architecture](#5-rabbitmq-messaging)
6. [Zipkin / Distributed Tracing](#6-zipkin-tracing)
7. [Premium Calculation — How It Works](#7-premium-calculation)
8. [Bugs Found & Fixes Applied](#8-bugs-fixed)
9. [DTO Reference — What Each DTO Does](#9-dto-reference)

---

## 1. System Architecture Overview

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Client Application                              │
│                         (Browser / Mobile / Postman)                          │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │ HTTP + JWT Bearer Token
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          API Gateway (:8080)                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐        │
│  │  JwtAuthFilter   │→│ Extract JWT       │→│ Inject Headers:       │        │
│  │  (WebFlux)       │  │ userId + role     │  │ X-User-Id             │        │
│  │                  │  │                   │  │ X-User-Role           │        │
│  │                  │  │                   │  │ X-Internal-Secret     │        │
│  └─────────────────┘  └──────────────────┘  └───────────────────────┘        │
│                                                                               │
│  Routes:                                                                      │
│    /api/auth/**     → AuthService                                            │
│    /api/policies/** → PolicyService                                          │
│    /api/claims/**   → ClaimService                                           │
│    /api/admin/**    → AdminService                                           │
│    /user/**         → AuthService                                            │
└──────────┬───────────────┬───────────────┬────────────────┬──────────────────┘
           │               │               │                │
     ┌─────▼───────┐ ┌────▼────────┐ ┌────▼────────┐ ┌────▼────────┐
     │  AuthService │ │PolicyService│ │ ClaimService│ │ AdminService│
     │   (:8081)    │ │  (:8082)    │ │  (:8083)    │ │  (:8084)    │
     └──────┬───────┘ └─────┬───────┘ └─────┬───────┘ └─────┬───────┘
            │               │               │               │
     ┌──────▼───────────────▼───────────────▼───────────────▼───────┐
     │                       MySQL (:3306)                           │
     │              Single database: "database"                      │
     └──────────────────────────────────────────────────────────────┘
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ Redis (:6379)│  │RabbitMQ(:5672│  │ Zipkin(:9411) │
     │ Auth, Policy,│  │ Auth, Policy,│  │ All services  │
     │ Admin cache  │  │ Claim, Admin │  │ send traces   │
     └──────────────┘  └──────────────┘  └──────────────┘
     ┌──────────────┐  ┌──────────────┐
     │Eureka (:8761)│  │ConfigSrv(:8888│
     │Svc Registry  │  │   (unused)    │
     └──────────────┘  └──────────────┘
```

### Service Summary Table

| Service | Port | Database | Redis | RabbitMQ | Eureka Name |
|---------|------|----------|-------|----------|-------------|
| Config Server | 8888 | ✗ | ✗ | ✗ | `CONFIG-SERVER-SMART-SURE` |
| Service Registry | 8761 | ✗ | ✗ | ✗ | — (is the server) |
| API Gateway | 8080 | ✗ | ✗ | ✗ | `APIGATEWAYSMARTCSURE` |
| Auth Service | 8081 | ✓ | ✓ | ✓ | `AUTHSERVICE` |
| Policy Service | 8082 | ✓ | ✓ | ✓ | `POLICYSERVICE` |
| Claim Service | 8083 | ✓ | ✗ | ✓ | `CLAIMSERVICE` |
| Admin Service | 8084 | ✓ | ✓ | ✓ | `ADMINSERVICE` |

**Note**: All 4 business services share the **same single MySQL database** (`database`). There is no database-per-service segregation.

---

## 2. Security Flow — How JWT Travels Through the System

### Step-by-Step Flow

```
1. Client → POST /api/auth/login (email, password)
   → Gateway forwards to AuthService (path is /api/auth/** → permitAll)
   ← AuthService returns { token: "eyJhbG...", email: "user@x.com", role: "CUSTOMER" }

2. Client → GET /api/policies/my (Authorization: Bearer eyJhbG...)
   → Gateway JwtAuthFilter:
     a) Extracts JWT from "Bearer " prefix
     b) Validates signature using shared JWT secret
     c) Extracts: userId = JWT subject, role = JWT "role" claim
     d) Mutates outgoing request, adding headers:
        - X-User-Id: 42
        - X-User-Role: CUSTOMER
        - X-Internal-Secret: JHGUY72638...
     e) Forwards to PolicyService with 3 headers

3. PolicyService receives request with headers:
   → InternalRequestFilter: Checks X-Internal-Secret matches its own internal.secret property
     (BLOCKS if missing/wrong → 403 Forbidden)
   → HeaderAuthenticationFilter: Reads X-User-Id and X-User-Role
     Creates SecurityContext with Authentication(userId=42L, authorities=[ROLE_CUSTOMER])
   → @PreAuthorize("hasRole('CUSTOMER')") passes ✅
   → Controller method executes
```

### JWT Token Structure

```
Header:  { "alg": "HS256" }
Payload: {
  "sub": "42",          ← userId (Long → String)
  "role": "CUSTOMER",   ← One of: ADMIN, AGENT, CUSTOMER
  "iat": 1711600000,
  "exp": 1711686400     ← 24 hours validity
}
Signature: HMAC-SHA256(header + payload, jwt.secret)
```

### Security Filter Chain Per Service (After Fixes)

| Service | InternalRequestFilter | HeaderAuthenticationFilter | `.anyRequest()` |
|---------|----------------------|---------------------------|-----------------|
| **Gateway** | — | JwtAuthFilter (WebFlux) | `.authenticated()` ✅ |
| **Auth Service** | ✅ Whitelists: /api/auth, /user/internal, /swagger, /actuator | ✅ Parses userId as `Long` | `.authenticated()` ✅ |
| **Policy Service** | ✅ Whitelists: /api/auth, /swagger, /v3/api-docs, /actuator | ✅ Parses userId as `Long` | `.authenticated()` ✅ |
| **Claim Service** | ✅ Whitelists: /api/auth, /swagger, /v3/api-docs, /actuator | ✅ Parses userId as `Long` | `.authenticated()` ✅ |
| **Admin Service** | ✅ Whitelists: /api/auth, /swagger, /v3/api-docs, /actuator | ✅ Parses userId as `Long` | `.authenticated()` ✅ |

### Swagger Authentication

All services are configured with `bearerAuth` security scheme. To authenticate:
1. Login: `POST /api/auth/login` with seeded admin credentials
2. Copy the JWT token from the response
3. In Swagger UI, click "Authorize" and enter: `Bearer <token>`

**Seeded Admin Credentials:**
- Email: `pragyavijay20318@gmail.com`
- Password: `vijay@**24`

---

## 3. Service-by-Service Deep Dive

### 3.1 Auth Service (Port 8081)

**Purpose**: User registration, login, JWT generation, user profile management, address CRUD.

#### Endpoints

| Method | Path | Auth | Role | What It Does |
|--------|------|------|------|-------------|
| `POST` | `/api/auth/register` | Public | — | Register new user, sends welcome email via RabbitMQ |
| `POST` | `/api/auth/login` | Public | — | Verify credentials, return JWT + email + role |
| `GET` | `/user/profile` | Authenticated | Any | Returns X-User-Id and X-User-Role from headers |
| `POST` | `/user/addInfo` | Authenticated | Any | Update user info (finds by email) |
| `GET` | `/user/getInfo/{userId}` | Authenticated | Any | Get user by ID (cached in Redis) |
| `PUT` | `/user/update/{userId}` | Authenticated | Any | Update user info (evicts cache) |
| `DELETE` | `/user/delete/{userId}` | Authenticated | Any | Delete user (evicts cache) |
| `POST` | `/user/addAddress/{userId}` | Authenticated | Any | Add address to user |
| `GET` | `/user/getAddress/{userId}` | Authenticated | Any | Get user's address |
| `PUT` | `/user/updateAddress/{userId}` | Authenticated | Any | Update address |
| `DELETE` | `/user/deleteAddress/{userId}` | Authenticated | Any | Delete address |
| `GET` | `/user/getAll` | Authenticated | Any | Paginated user list (cached) |
| `GET` | `/user/internal/{userId}/email` | Internal | — | Returns user email (used by PolicyService Feign) |
| `GET` | `/user/internal/{userId}/profile` | Internal | — | Returns CustomerProfileResponse (used by PolicyService Feign) |

#### Entities
- **User**: `userId`, `firstName`, `lastName`, `email` (unique), `password` (BCrypt), `phone`, `role` (ADMIN/AGENT/CUSTOMER), `address` (OneToOne)
- **Address**: `addressId`, `city`, `state`, `zip`, `street_address`
- **Role** (Enum): `ADMIN`, `AGENT`, `CUSTOMER`

#### Key Business Logic
- **Registration**: Checks email uniqueness → Encodes password with BCrypt → Saves user → Publishes EmailMessage to RabbitMQ for welcome email
- **Login**: Finds user by email → Validates password → Generates JWT with userId as subject and role as claim → Sends login alert email via RabbitMQ → Returns JWT token
- **Admin Seeder**: On startup, checks if admin email exists; if not, creates admin user with seeded credentials

---

### 3.2 Policy Service (Port 8082)

**Purpose**: Insurance product catalog (PolicyTypes), policy purchase, premium calculation, premium payment, renewal, cancellation. The most complex service.

#### Endpoints

| Method | Path | Auth | Role | What It Does |
|--------|------|------|------|-------------|
| **Policy Types (Products)** | | | | |
| `GET` | `/api/policy-types` | Public | — | List all active insurance products |
| `GET` | `/api/policy-types/{id}` | Public | — | Get single policy type |
| `GET` | `/api/policy-types/category/{category}` | Public | — | Filter by category (HEALTH, AUTO, etc.) |
| `GET` | `/api/policy-types/all` | Auth | ADMIN | List all including inactive |
| `POST` | `/api/policy-types` | Auth | ADMIN | Create new insurance product |
| `PUT` | `/api/policy-types/{id}` | Auth | ADMIN | Update insurance product |
| `DELETE` | `/api/policy-types/{id}` | Auth | ADMIN | Discontinue product (soft delete) |
| **Policies** | | | | |
| `POST` | `/api/policies/purchase` | Auth | CUSTOMER | Purchase a policy |
| `GET` | `/api/policies/my` | Auth | CUSTOMER | Get my policies (paginated) |
| `GET` | `/api/policies/{policyId}` | Auth | Any | Get policy by ID (ownership check for customers) |
| `PUT` | `/api/policies/{policyId}/cancel` | Auth | CUSTOMER | Cancel own policy |
| `POST` | `/api/policies/renew` | Auth | CUSTOMER | Renew expiring policy |
| **Premiums** | | | | |
| `POST` | `/api/policies/premiums/pay` | Auth | CUSTOMER | Pay premium installment |
| `GET` | `/api/policies/{policyId}/premiums` | Auth | Any | View premium schedule |
| `POST` | `/api/policies/calculate-premium` | Public | — | Premium quote calculator |
| **Admin** | | | | |
| `GET` | `/api/policies/admin/all` | Auth | ADMIN | All policies (paginated) |
| `PUT` | `/api/policies/admin/{policyId}/status` | Auth | ADMIN | Force status update |
| `GET` | `/api/policies/admin/summary` | Auth | ADMIN | System-wide statistics |

#### Entities
- **PolicyType**: `id`, `name`, `description`, `category` (HEALTH/AUTO/HOME/LIFE/TRAVEL/BUSINESS), `basePremium`, `maxCoverageAmount`, `deductibleAmount`, `termMonths`, `minAge`, `maxAge`, `status` (ACTIVE/DISCONTINUED), `coverageDetails`
- **Policy**: `id`, `policyNumber` (auto-generated UUID format), `customerId`, `policyType` (ManyToOne), `coverageAmount`, `premiumAmount`, `paymentFrequency` (MONTHLY/QUARTERLY/SEMI_ANNUAL/ANNUAL), `startDate`, `endDate`, `status` (CREATED/ACTIVE/EXPIRED/CANCELLED), `nomineeName`, `nomineeRelation`, `remarks`, `cancellationReason`, `premiums` (OneToMany)
- **Premium**: `id`, `policy` (ManyToOne), `amount`, `dueDate`, `paidDate`, `status` (PENDING/PAID/OVERDUE/WAIVED), `paymentReference`, `paymentMethod` (CREDIT_CARD/DEBIT_CARD/NET_BANKING/UPI/WALLET/CHEQUE)
- **AuditLog**: `policyId`, `actorId`, `actorRole`, `action`, `fromStatus`, `toStatus`, `details`

#### Key Business Logic — Policy Purchase Flow

```
1. Customer submits PolicyPurchaseRequest
   → Validate: policyTypeId exists, coverage ≤ maxCoverage, age within range
2. Fetch customer profile from AuthService via Feign
3. Calculate premium using PremiumCalculator
4. Create Policy entity with status=ACTIVE, generated policyNumber
5. Generate all Premium installments (PENDING status)
6. Publish PolicyPurchasedEvent to RabbitMQ
7. Return PolicyResponse
```

#### Scheduled Tasks
| Cron Expression | Time | What It Does |
|-----------------|------|-------------|
| `0 0 1 * * *` | 1:00 AM | Expire all active policies past their end date |
| `0 0 8 * * *` | 8:00 AM | Mark pending premiums past due date as OVERDUE |
| `0 0 9 * * *` | 9:00 AM | Send premium due reminders (7 days before due) |
| `0 5 9 * * *` | 9:05 AM | Send policy expiry reminders (30 days before expiry) |

#### Resilience4j Protection
- **Circuit Breaker** on AuthService Feign calls (10 requests, 50% failure threshold)
- **Circuit Breaker** on PolicyType DB queries (protects against DB failures)
- **Circuit Breaker** on NotificationService (email sending)
- **Retry** on AuthService (3 attempts, exponential backoff)
- **Rate Limiter** on policy purchase (10/second)

---

### 3.3 Claim Service (Port 8083)

**Purpose**: Insurance claim lifecycle — create, upload documents, submit, admin review (approve/reject).

#### Claim Lifecycle State Machine

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → CLOSED
                                  → REJECTED → CLOSED
      → [DELETE] (only in DRAFT)
```

Each transition is validated by the `Status` enum's `moveTo()` method — invalid transitions throw `InvalidStatusTransitionException`.

#### Endpoints

| Method | Path | Auth | Role | What It Does |
|--------|------|------|------|-------------|
| `POST` | `/api/claims` | Auth | Any | Create a DRAFT claim (takes policyId, fetches policy detail via Feign) |
| `GET` | `/api/claims/{id}` | Auth | CUSTOMER/ADMIN | Get claim by ID |
| `GET` | `/api/claims` | Auth | ADMIN | Get all claims |
| `GET` | `/api/claims/under-review` | Auth | ADMIN | Get claims pending review |
| `GET` | `/api/claims/{id}/policy` | Auth | CUSTOMER/ADMIN | Get linked policy detail via Feign |
| `DELETE` | `/api/claims/{id}` | Auth | CUSTOMER | Delete claim (only allowed in DRAFT status) |
| `PUT` | `/api/claims/{id}/submit` | Auth | CUSTOMER | Submit claim (validates all 3 docs uploaded, DRAFT→SUBMITTED→UNDER_REVIEW) |
| `PUT` | `/api/claims/{id}/status` | Auth | ADMIN | Approve or reject claim |
| `POST` | `/api/claims/{id}/upload/claim-form` | Auth | CUSTOMER | Upload claim form (multipart, max 5MB) |
| `POST` | `/api/claims/{id}/upload/aadhaar` | Auth | CUSTOMER | Upload Aadhaar card |
| `POST` | `/api/claims/{id}/upload/evidence` | Auth | CUSTOMER | Upload evidence document |
| `GET` | `/api/claims/{id}/download/claim-form` | Auth | CUSTOMER/ADMIN | Download claim form |
| `GET` | `/api/claims/{id}/download/aadhaar` | Auth | CUSTOMER/ADMIN | Download Aadhaar |
| `GET` | `/api/claims/{id}/download/evidence` | Auth | CUSTOMER/ADMIN | Download evidence |

#### Key Business Logic — Claim Submission Flow

```
1. Customer creates claim → POST /api/claims { policyId: 1 }
   → Feign call to PolicyService to get policy → sets claim.amount = policy.coverageAmount
   → Status = DRAFT

2. Customer uploads 3 documents (in any order):
   → POST /api/claims/{id}/upload/claim-form  (Aadhaar card scan)
   → POST /api/claims/{id}/upload/aadhaar     (Claim form)
   → POST /api/claims/{id}/upload/evidence     (Supporting evidence)
   → Each upload stores the file as binary data (BLOB) in DB

3. Customer submits → PUT /api/claims/{id}/submit
   → Validates: claimForm != null, aadhaarCard != null, evidences != null
   → Fails with 400 if any document is missing
   → On success: DRAFT → SUBMITTED → UNDER_REVIEW (two transitions in one call)

4. Admin approves/rejects → PUT /api/claims/{id}/status?next=APPROVED
   → Publishes ClaimDecisionEvent to RabbitMQ
   → ClaimDecisionListener sends email to customer
```

#### Entities
- **Claim**: `id`, `policyId`, `status`, `claimForm` (embedded FileData), `evidences` (embedded FileData), `aadhaarCard` (embedded FileData), `amount`, `timeOfCreation`
- **FileData** (Embeddable): `fileName`, `fileType`, `data` (byte[]) — stored as BLOB in MySQL
- **Status** (Enum): DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CLOSED — with validated state transitions

---

### 3.4 Admin Service (Port 8084)

**Purpose**: Admin dashboard — aggregates data from all services via Feign, manages claims/policies/users, maintains audit logs, receives events via RabbitMQ for automated audit logging.

#### Endpoints

| Method | Path | Auth | Role | What It Does |
|--------|------|------|------|-------------|
| **Claim Management** | | | | |
| `GET` | `/api/admin/claims` | Auth | ADMIN | Get all claims (via ClaimService Feign) |
| `GET` | `/api/admin/claims/under-review` | Auth | ADMIN | Get pending claims |
| `GET` | `/api/admin/claims/{claimId}` | Auth | ADMIN | Get single claim |
| `PUT` | `/api/admin/claims/{claimId}/review` | Auth | ADMIN | Mark claim under review + audit log |
| `PUT` | `/api/admin/claims/{claimId}/approve` | Auth | ADMIN | Approve claim + audit log |
| `PUT` | `/api/admin/claims/{claimId}/reject` | Auth | ADMIN | Reject claim + audit log |
| **Policy Management** | | | | |
| `GET` | `/api/admin/policies` | Auth | ADMIN | Get all policies (via PolicyService Feign) |
| `GET` | `/api/admin/policies/{policyId}` | Auth | ADMIN | Get single policy |
| `PUT` | `/api/admin/policies/{policyId}/cancel` | Auth | ADMIN | Cancel policy + audit log |
| **User Management** | | | | |
| `GET` | `/api/admin/users` | Auth | ADMIN | Get all users (via AuthService Feign) |
| `GET` | `/api/admin/users/{userId}` | Auth | ADMIN | Get single user |
| **Audit Logs** | | | | |
| `GET` | `/api/admin/audit-logs` | Auth | ADMIN | Get all audit logs |
| `GET` | `/api/admin/audit-logs/recent` | Auth | ADMIN | Get recent activity (limit N) |
| `GET` | `/api/admin/audit-logs/{entity}/{id}` | Auth | ADMIN | Audit history for entity |
| `GET` | `/api/admin/audit-logs/range` | Auth | ADMIN | Audit logs by date range |

#### Key Business Logic
- **All data is fetched via Feign** — AdminService has no direct business data, only AuditLog table
- **Every admin action is audit-logged**: `AuditLogService.log(adminId, action, entity, entityId, remarks)`
- **Automated audit**: RabbitMQ listeners auto-log claim decisions and premium payments with `adminId=0` (system-generated)

---

## 4. OpenFeign Clients — Inter-Service Communication

### Complete Feign Dependency Map

```
PolicyService ──Feign──→ AuthService (/user/internal/{userId}/profile, /user/internal/{userId}/email)
ClaimService  ──Feign──→ PolicyService (/api/policies/{policyId})
ClaimService  ──Feign──→ AuthService (/user/getInfo/{userId})
AdminService  ──Feign──→ ClaimService (/api/claims, /api/claims/{id}, /api/claims/{id}/status)
AdminService  ──Feign──→ PolicyService (/api/policies/admin/all, /api/policies/{id}, /api/policies/admin/{id}/status)
AdminService  ──Feign──→ AuthService (/user/getInfo/{userId}, /user/getAll)
```

### Header Propagation
All Feign clients use a `FeignInterceptor` that copies incoming request headers to outgoing Feign calls:
- `X-User-Id` — Forwarded for identity propagation
- `X-User-Role` — Forwarded for role-based access
- `X-Internal-Secret` — Forwarded so downstream `InternalRequestFilter` allows the call

### Feign Client Details

| Client | Service | Target | Fallback | Key Methods |
|--------|---------|--------|----------|-------------|
| `AuthServiceClient` | PolicyService | AuthService | ✅ `AuthServiceFallback` (returns null email, "Customer" name) | `getCustomerProfile()`, `getCustomerEmail()` |
| `PolicyClient` | ClaimService | PolicyService | ❌ None | `getPolicyById()` |
| `UserClient` | ClaimService | AuthService | ❌ None | `getUserById()` |
| `ClaimFeignClient` | AdminService | ClaimService | ❌ None | `getAllClaims()`, `getUnderReviewClaims()`, `getClaimById()`, `updateClaimStatus()` |
| `PolicyFeignClient` | AdminService | PolicyService | ❌ None | `getAllPolicies()`, `getPolicyById()`, `updatePolicyStatus()` |
| `UserFeignClient` | AdminService | AuthService | ❌ None | `getUserById()`, `getAllUsers()` |

---

## 5. RabbitMQ Messaging Architecture

### Exchange & Queue Topology

| Exchange | Type | Publisher | Consumers |
|----------|------|-----------|-----------|
| `emailExchange` (Direct) | Direct | AuthService | AuthService (EmailConsumer) |
| `smartsure.notifications` (Topic) | Topic | PolicyService | PolicyService (NotificationConsumer), AdminService (AuditEventListener) |
| `smartsure.exchange` (Topic) | Topic | ClaimService | ClaimService (ClaimDecisionListener), AdminService (AuditEventListener) |

### Message Flows

```
AUTH SERVICE:
  Register/Login → EmailMessage → emailExchange → emailQueue → EmailConsumer → sends email

POLICY SERVICE:
  Purchase policy  → PolicyPurchasedEvent     → smartsure.notifications → notification.policy.purchased        → NotificationConsumer
  Pay premium      → PremiumPaidEvent         → smartsure.notifications → notification.premium.paid            → NotificationConsumer + AdminService
  Cancel policy    → PolicyCancelledEvent      → smartsure.notifications → notification.policy.cancelled        → NotificationConsumer
  Scheduler        → PremiumDueReminderEvent   → smartsure.notifications → notification.premium.due.reminder    → NotificationConsumer
  Scheduler        → PolicyExpiryReminderEvent → smartsure.notifications → notification.policy.expiry.reminder  → NotificationConsumer

CLAIM SERVICE:
  Approve/Reject → ClaimDecisionEvent → smartsure.exchange → claim.decision.queue → ClaimDecisionListener + AdminService

ADMIN SERVICE (Listeners only):
  admin.claim.audit.queue   ←── smartsure.exchange (claim.decision)       → AuditEventListener → AuditLogService
  admin.payment.audit.queue ←── smartsure.notifications (premium.paid)    → AuditEventListener → AuditLogService
```

### Dead Letter Queue
PolicyService configures DLQ for failed notifications:
- Failed messages (after 3 retries with exponential backoff) go to `notification.dlq`
- Dead letter exchange: `smartsure.notifications.dlx`

---

## 6. Zipkin / Distributed Tracing (After Fixes)

| Service | Status | Endpoint |
|---------|--------|----------|
| API Gateway | ✅ Enabled | `http://zipkin:9411/api/v2/spans` |
| Auth Service | ✅ Enabled | `http://zipkin:9411/api/v2/spans` |
| Policy Service | ✅ Enabled | `http://zipkin:9411/api/v2/spans` |
| Claim Service | ✅ Enabled | `http://zipkin:9411/api/v2/spans` |
| Admin Service | ✅ Enabled | `http://zipkin:9411/api/v2/spans` |

All services now have `management.tracing.sampling.probability=1.0`, meaning 100% of requests are traced. Zipkin UI is available at `http://localhost:9411`.

---

## 7. Premium Calculation — How It Works

### Formula

```
Annual Premium = basePremium × coverageFactor × ageFactor

where:
  coverageFactor = coverageAmount / 100,000

  ageFactor (by age bracket):
    age < 25   → 0.85 (young adult discount)
    age 25-34  → 1.00 (standard rate)
    age 35-44  → 1.20
    age 45-54  → 1.50
    age 55-64  → 1.90
    age 65+    → 2.50 (highest risk tier)

Per-installment premium (with frequency loading):
  MONTHLY      → annualPremium × 1.05 ÷ 12   (5% convenience surcharge)
  QUARTERLY    → annualPremium × 1.03 ÷ 4    (3% surcharge)
  SEMI_ANNUAL  → annualPremium × 1.01 ÷ 2    (1% surcharge)
  ANNUAL       → annualPremium × 1.00         (no surcharge)
```

### Example Calculation

**Scenario**: Health Insurance, `basePremium = ₹5,000`, `coverageAmount = ₹500,000`, `age = 40`, `MONTHLY`

```
Step 1: coverageFactor = 500,000 / 100,000 = 5.0
Step 2: ageFactor = 1.20 (age 35-44 bracket)
Step 3: annualPremium = 5,000 × 5.0 × 1.20 = ₹30,000
Step 4: monthlyPremium = 30,000 × 1.05 / 12 = ₹2,625.00
```

### Premium Schedule Generation

When a policy is purchased:
1. Calculate `installmentCount = termMonths / monthsBetweenInstallments`
   - MONTHLY: 1 month intervals
   - QUARTERLY: 3 month intervals
   - SEMI_ANNUAL: 6 month intervals
   - ANNUAL: 12 month intervals
2. Create N `Premium` entities with:
   - `amount` = calculated installment premium
   - `dueDate` = startDate + (interval × installmentIndex)
   - `status` = PENDING

---

## 8. Bugs Found & Fixes Applied

### 🔴 Critical Bugs (5) — ALL FIXED ✅

| # | Service | File | Bug | Fix Applied |
|---|---------|------|-----|-------------|
| 1 | **ClaimService** | `PolicyDTO.java` | Fields `policyID`, `amount`, `userId` don't match PolicyService's response (`id`, `coverageAmount`, `customerId`). Deserialization failed silently — amounts were null. | Rewrote DTO to match PolicyService's `PolicyResponse` fields (`id`, `policyNumber`, `customerId`, `coverageAmount`, `premiumAmount`, etc.) with backward-compatible convenience getters. |
| 2 | **AdminService** | `AdminService.java` | `getPolicyById(policyId)` called `policyFeignClient.getPolicyById(policyId, policyId, "ADMIN")` — passing **policyId as userId**. Ownership check would always fail. | Changed to `policyFeignClient.getPolicyById(policyId, 0L, "ADMIN")` — 0L is a safe admin placeholder since ADMIN role bypasses ownership. |
| 3 | **AdminService** | `UserFeignClient.java` | Feign called `GET /user/all` — endpoint **doesn't exist** in AuthService. AuthService exposes `/user/getAll`. Would throw 404. | Changed `@GetMapping("/user/all")` to `@GetMapping("/user/getAll")`. |
| 4 | **All Services** | `HeaderAuthenticationFilter.java` | Set `principal` as `String userId` but PolicyService's `SecurityUtils.getCurrentUserId()` casts to `Long` → **ClassCastException** at runtime. | Changed all 3 HeaderAuthenticationFilters (Auth, Claim, Admin) to `Long.parseLong(userIdStr)` before setting principal. |
| 5 | **PolicyService** | `InternalRequestFilter.java` | Did NOT whitelist `/actuator/**` — Prometheus/health checks returned 403 Forbidden without internal secret. | Added `path.startsWith("/actuator")` to the public path whitelist. |

### 🟡 Major Logic Issues (4) — ALL FIXED ✅

| # | Service | File | Issue | Fix Applied |
|---|---------|------|-------|-------------|
| 7 | **ClaimService, AdminService, AuthService** | `SecurityConfig.java` | `.anyRequest().permitAll()` — all endpoints were unprotected at HTTP level. `@PreAuthorize` only worked because filters set SecurityContext. | Changed to `.anyRequest().authenticated()` in all 3 services. Also added `/actuator/**` to permitAll list. |
| 8 | **AdminService** | `AdminController.java` | Required `@RequestHeader("X-Admin-Id")` but Gateway only injects `X-User-Id`. Admin would need to pass this header manually. | Changed all 4 occurrences to `@RequestHeader("X-User-Id")`. |
| 9 | **AuthService** | `AuthService.java` | Login error: `"Student not found"` — copy-paste from previous project. | Changed to `"User not found"`. |
| 12 | **AuthService** | `UserController.java` | Swagger description: `"Fetching all the books"` — copy-paste error; variable named `books`. | Changed to `"Fetching all the users"` and renamed variable to `users`. |

### 🟢 Minor/Architectural Issues (4) — ALL FIXED ✅

| # | Service | Issue | Fix Applied |
|---|---------|-------|-------------|
| 13 | **AdminService** | RabbitMQ listened on `smartsure.exchange` with routing key `payment.completed`. But PolicyService publishes to `smartsure.notifications` with key `premium.paid`. Admin **never received payment events**. | Rewrote `RabbitMQConfig` to bind to both exchanges: `smartsure.exchange` (for claim events) and `smartsure.notifications` (for payment events). Fixed routing key to `premium.paid`. |
| 14 | **AuthService** | `CustomerProfileResponse` in AuthService had no `age` field. PolicyService expected it. Feign deserialization left it null. | Added `Integer age` field to AuthService's `CustomerProfileResponse`. Updated builder in `InternalAuthController`. |
| Zipkin | **All Services** | Zipkin only on Gateway. Auth: commented out. Policy/Claim: missing. Admin: `enabled=false`. No useful distributed tracing. | Enabled Zipkin in all 4 services with `management.zipkin.tracing.endpoint=http://zipkin:9411/api/v2/spans`. |
| Notifications | **PolicyService** | NotificationConsumer already existed. RabbitMQ queues were being consumed. | Verified — consumer is present and consumes all 5 event types. No fix needed. |

---

## 9. DTO Reference — What Each DTO Does

### Auth Service DTOs

| DTO | Direction | Purpose | Key Fields |
|-----|-----------|---------|------------|
| `RegisterRequestDto` | → Request | Registration input | firstName, lastName, email, password, role |
| `LoginRequestDto` | → Request | Login input | email (validated), password (min 8 chars) |
| `AuthResponseDto` | ← Response | Login response | token (JWT string), email, role |
| `UserRequestDto` | → Request | User CRUD input | Mapped from User via ModelMapper |
| `UserResponseDto` | ← Response | User CRUD response | Mapped from User via ModelMapper |
| `AddressRequestDto` | → Request | Address input | city, state, zip, street_address |
| `AddressResponseDto` | ← Response | Address response | addressId + address fields |
| `CustomerProfileResponse` | ← Internal | Profile for PolicyService | id, name, email, phone, age |
| `EmailMessage` | → RabbitMQ | Email event payload | to, subject, body |
| `PageResponse<T>` | ← Response | Pagination wrapper | content, page, size, totalElements, totalPages |

### Policy Service DTOs

| DTO | Direction | Purpose | Key Fields |
|-----|-----------|---------|------------|
| `PolicyPurchaseRequest` | → Request | Buy policy | policyTypeId, coverageAmount, paymentFrequency, startDate, nomineeName, nomineeRelation, customerAge |
| `PolicyRenewalRequest` | → Request | Renew policy | policyId, newCoverageAmount, paymentFrequency, newEndDate |
| `PolicyStatusUpdateRequest` | → Request | Admin status change | status (enum: ACTIVE/CANCELLED/EXPIRED), reason |
| `PolicyResponse` | ← Response | Full policy | id, policyNumber, customerId, coverageAmount, premiumAmount, status, dates, nominee, premiums[] |
| `PolicyPageResponse` | ← Response | Paginated list | content[], pageNumber, pageSize, totalElements, totalPages, last |
| `PolicySummaryResponse` | ← Response | Dashboard stats | totalPolicies, activePolicies, expiredPolicies, cancelledPolicies, totalPremiumCollected, totalCoverageProvided |
| `PremiumCalculationRequest` | → Request | Calculator input | policyTypeId, coverageAmount, paymentFrequency, customerAge |
| `PremiumCalculationResponse` | ← Response | Calculator output | basePremium, annualPremium, calculatedPremium, paymentFrequency, breakdown |
| `PremiumPaymentRequest` | → Request | Pay installment | policyId, premiumId, paymentMethod, paymentReference |
| `PremiumResponse` | ← Response | Premium detail | id, amount, dueDate, paidDate, status, paymentReference, paymentMethod |
| `PolicyTypeRequest` | → Request | Create/update type | name, description, category, basePremium, maxCoverageAmount, deductibleAmount, termMonths, minAge, maxAge |
| `PolicyTypeResponse` | ← Response | Type detail | All PolicyType entity fields |
| `CustomerProfileResponse` | ← From AuthService | Customer info | id, name, email, phone, age |

### Policy Service Event DTOs (Published to RabbitMQ)

| Event DTO | When Published | Key Fields |
|-----------|---------------|------------|
| `PolicyPurchasedEvent` | After purchase/renew | policyId, policyNumber, customerId, customerEmail, customerName, policyTypeName, coverageAmount, premiumAmount, paymentFrequency, startDate, endDate, nomineeName |
| `PremiumPaidEvent` | After premium payment | premiumId, policyId, policyNumber, customerId, customerEmail, customerName, amount, paidDate, paymentMethod, paymentReference |
| `PolicyCancelledEvent` | After cancellation | policyId, policyNumber, customerId, customerEmail, customerName, cancellationReason |
| `PremiumDueReminderEvent` | Scheduler (7 days before) | premiumId, policyId, policyNumber, customerEmail, customerName, amount, dueDate |
| `PolicyExpiryReminderEvent` | Scheduler (30 days before) | policyId, policyNumber, customerEmail, customerName, policyTypeName, endDate |

### Claim Service DTOs

| DTO | Direction | Purpose | Key Fields |
|-----|-----------|---------|------------|
| `ClaimRequest` | → Request | Create claim | policyId |
| `ClaimResponse` | ← Response | Claim detail | id, policyId, amount, status, timeOfCreation, hasClaimForm, hasAadhaarCard, hasEvidence |
| `PolicyDTO` | ← From PolicyService | Policy data | id, policyNumber, customerId, coverageAmount, premiumAmount, status, nomineeName |
| `UserResponseDto` | ← From AuthService | User data | userId, firstName, lastName, email, phone, role |
| `ClaimDecisionEvent` | → RabbitMQ | Decision event | claimId, policyId, decision (APPROVED/REJECTED), amount, customerEmail, customerName, decidedAt |

### Admin Service DTOs

| DTO | Direction | Purpose | Key Fields |
|-----|-----------|---------|------------|
| `ClaimDTO` | ← From ClaimService | Claim data | id, policyId, amount, status, timeOfCreation, claimFormUploaded, aadhaarCardUploaded, evidencesUploaded |
| `ClaimStatusUpdateRequest` | → Request | Approve/reject input | remarks |
| `PolicyDTO` | ← From PolicyService | Policy data | Mirrors PolicyResponse fields |
| `PolicyStatusUpdateRequest` | → Request | Cancel/status change | status (String), reason |
| `PolicyTypeDTO` | ← From PolicyService | Product info | name, category, basePremium, etc. |
| `UserDTO` | ← From AuthService | User data | userId, firstName, lastName, email, phone, role |
| `AuditLogDTO` | ← Response | Audit entry | adminId, action, entity, entityId, remarks, timestamp |
| `ClaimDecisionEvent` | ← RabbitMQ | Auto-audit | claimId, decision, customerEmail |
| `PaymentCompletedEvent` | ← RabbitMQ | Auto-audit | premiumId, policyId, amount |

---

## Design Patterns Used

| Pattern | Where | How |
|---------|-------|-----|
| **API Gateway** | ApiGatewaySmartSure | Single entry point, JWT validation, header injection |
| **Service Registry** | Eureka | Service discovery for all microservices |
| **Header-Based Auth** | All downstream services | Gateway strips JWT, injects X-User-Id/X-User-Role headers |
| **Internal Secret** | All services | X-Internal-Secret prevents direct access bypassing gateway |
| **Circuit Breaker** | PolicyService (Resilience4j) | Protects Feign calls and DB queries |
| **Rate Limiter** | PolicyService | 10 policy purchases/second |
| **Dead Letter Queue** | PolicyService RabbitMQ | Failed notifications go to DLQ after 3 retries |
| **Event-Driven** | RabbitMQ | Async email, notifications, audit logging |
| **Audit Logging** | AdminService | Every admin action logged with actor, action, timestamps |
| **Soft Delete** | PolicyType | Status set to DISCONTINUED instead of actual deletion |
| **CQRS-like** | AdminService | Reads from all services via Feign, writes only to AuditLog |

---

## Access Points Summary

| What | URL |
|------|-----|
| API Gateway | `http://localhost:8080` |
| Auth Swagger | `http://localhost:8081/swagger-ui.html` |
| Policy Swagger | `http://localhost:8082/swagger-ui.html` |
| Claim Swagger | `http://localhost:8083/swagger-ui.html` |
| Admin Swagger | `http://localhost:8084/swagger-ui.html` |
| Eureka Dashboard | `http://localhost:8761` |
| RabbitMQ Management | `http://localhost:15672` (guest/guest) |
| Zipkin UI | `http://localhost:9411` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` |

 # # #   8 .   B u g s   F o u n d   &   F i x e s   A p p l i e d   ( C o n t i n u e d ) 
 
 |   #   |   S e r v i c e   |   F i l e   |   B u g   |   F i x   A p p l i e d   | 
 | - - - | - - - - - - - - - | - - - - - - | - - - - - | - - - - - - - - - - - - - | 
 |   1 5   |   * * C l a i m S e r v i c e * *   |   \ C l a i m C o n t r o l l e r . j a v a \   |   \ P O S T   / a p i / c l a i m s \   l a c k e d   \ @ P r e A u t h o r i z e \   |   A d d e d   \ @ P r e A u t h o r i z e ( \  
 h a s R o l e  
 C U S T O M E R  
 \ ) \   | 
 |   1 6   |   * * C l a i m / A d m i n   S e r v i c e s * *   |   A l l   F e i g n   D T O s   |   M i s s i n g   J a c k s o n   r e s i l i e n c e   a n n o t a t i o n s .   C o u l d   c r a s h   o n   n e w   f i e l d s .   |   A d d e d   \ @ J s o n I g n o r e P r o p e r t i e s ( i g n o r e U n k n o w n   =   t r u e ) \   t o   6   D T O s .   | 
  
 