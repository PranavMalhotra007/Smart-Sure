# SmartSure — Complete API Endpoint Reference

> **Base URL (via API Gateway):** `http://localhost:8080`
> All requests reach microservices through the API Gateway on port **8080**.
> JWT Bearer token must be supplied in the `Authorization: Bearer <token>` header for all secured endpoints.

---

## Service Port Map

| Service              | Port  | Eureka Name        |
|----------------------|-------|--------------------|
| API Gateway          | 8080  | —                  |
| Auth Service         | 8081  | AUTHSERVICE        |
| Policy Service       | 8082  | POLICYSERVICE      |
| Claim Service        | 8083  | CLAIMSERVICE       |
| Admin Service        | 8084  | ADMINSERVICE       |
| Payment Service      | 8085  | PAYMENTSERVICE     |
| Config Server        | 8888  | —                  |
| Service Registry     | 8761  | —                  |

---

## Security Architecture

All services use **Stateless JWT-based authentication** (Spring Security). The API Gateway strips the JWT, validates it, and forwards the identity as HTTP headers to downstream services:

| Header              | Description                              |
|---------------------|------------------------------------------|
| `X-User-Id`         | Authenticated user's ID                  |
| `X-User-Role`       | Authenticated user's role (ADMIN/CUSTOMER) |
| `X-Internal-Secret` | Shared secret for inter-service calls    |

### Roles
- **PUBLIC** — No authentication required
- **CUSTOMER** — Requires `ROLE_CUSTOMER` in JWT
- **ADMIN** — Requires `ROLE_ADMIN` in JWT
- **INTERNAL** — Inter-service calls using `X-Internal-Secret` header (bypasses JWT)

---

---

# 1. AUTH SERVICE
**Direct Port:** `8081` | **Gateway Path Prefix:** Routes via `/api/auth/**` and `/user/**`

---

## 1.1 AuthController — `/api/auth`

### POST `/api/auth/register`
**Security:** 🌐 PUBLIC  
**Description:** Register a new user (CUSTOMER or ADMIN).

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "role": "CUSTOMER | ADMIN"
}
```
**Response:** `200 OK`
```
"User registered successfully"   (plain text)
```

---

### POST `/api/auth/login`
**Security:** 🌐 PUBLIC  
**Description:** Authenticate credentials and receive a JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "role": "CUSTOMER | ADMIN",
  "userId": 1
}
```

---

## 1.2 UserController — `/user`

### GET `/user/profile`
**Security:** 🔐 Authenticated (any role)  
**Description:** Returns the user's ID and role extracted from gateway headers (diagnostic endpoint).

**Request:** No body  
**Response:** `200 OK`
```
"UserId: 1, Role: CUSTOMER"   (plain text)
```

---

### POST `/user/addInfo`
**Security:** 🔐 ADMIN or CUSTOMER  
**Description:** Add additional profile information to a registered user.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "phone": "long",
  "dateOfBirth": "yyyy-MM-dd",
  "gender": "string"
}
```
**Response:** `202 ACCEPTED`
```json
{
  "userId": 1,
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": 9876543210,
  "dateOfBirth": "yyyy-MM-dd",
  "gender": "string"
}
```

---

### GET `/user/getInfo/{userId}`
**Security:** 🔐 ADMIN or owner CUSTOMER  
**Path Variable:** `userId` (Long)  
**Description:** Fetch profile information for a specific user.

**Request:** No body  
**Response:** `200 OK` — `UserResponseDto`

---

### PUT `/user/update/{userId}`
**Security:** 🔐 ADMIN or owner CUSTOMER  
**Path Variable:** `userId` (Long)  
**Description:** Update user profile fields.

**Request Body:** Same as `UserRequestDto` (firstName, lastName, phone, dateOfBirth, gender)  
**Response:** `202 ACCEPTED` — `UserResponseDto`

---

### DELETE `/user/delete/{userId}`
**Security:** 🔐 ADMIN or owner CUSTOMER  
**Path Variable:** `userId` (Long)  
**Description:** Soft/hard delete a user record.

**Request:** No body  
**Response:** `200 OK` — `UserResponseDto`

---

### POST `/user/addAddress/{userId}`
**Security:** 🔐 ADMIN or owner CUSTOMER  
**Path Variable:** `userId` (Long)  
**Description:** Add an address to a user record.

**Request Body:**
```json
{
  "street": "string",
  "city": "string",
  "state": "string",
  "pincode": "string",
  "country": "string"
}
```
**Response:** `202 ACCEPTED`
```json
{
  "addressId": 1,
  "street": "string",
  "city": "string",
  "state": "string",
  "pincode": "string",
  "country": "string"
}
```

---

### GET `/user/getAddress/{userId}`
**Security:** 🔐 ADMIN or owner CUSTOMER  
**Path Variable:** `userId` (Long)  
**Description:** Fetch a user's saved address.

**Request:** No body  
**Response:** `200 OK` — `AddressResponseDto`

---

### PUT `/user/updateAddress/{userId}`
**Security:** 🔐 ADMIN or owner CUSTOMER  
**Path Variable:** `userId` (Long)  
**Description:** Update a user's address.

**Request Body:** Same as `AddressRequestDto`  
**Response:** `202 ACCEPTED` — `AddressResponseDto`

---

### DELETE `/user/deleteAddress/{userId}`
**Security:** 🔐 ADMIN or owner CUSTOMER  
**Path Variable:** `userId` (Long)  
**Description:** Remove a user's address record.

**Request:** No body  
**Response:** `200 OK` — `AddressResponseDto`

---

### GET `/user/getAll`
**Security:** 🔐 ADMIN only  
**Description:** Fetch all users with pagination and sorting.

**Query Params:**

| Param       | Default    | Description         |
|-------------|------------|---------------------|
| `page`      | `0`        | Page number         |
| `size`      | `5`        | Page size           |
| `sortBy`    | `userId`   | Field to sort by    |
| `direction` | `asc`      | `asc` or `desc`     |

**Response:** `200 OK`
```json
{
  "content": [ ... UserResponseDto ... ],
  "page": 0,
  "size": 5,
  "totalElements": 50,
  "totalPages": 10
}
```

---

## 1.3 InternalAuthController — `/user/internal`
> ⚠️ **INTERNAL USE ONLY** — Called by other microservices via `X-Internal-Secret` header. Not accessible via Gateway to external clients.

### GET `/user/internal/{userId}/email`
**Security:** 🔑 INTERNAL (X-Internal-Secret)  
**Path Variable:** `userId` (Long)  
**Description:** Returns the email address of a user. Used by PolicyService for notifications.

**Request:** No body  
**Response:** `200 OK`
```
"user@example.com"   (plain text)
```

---

### GET `/user/internal/{userId}/profile`
**Security:** 🔑 INTERNAL (X-Internal-Secret)  
**Path Variable:** `userId` (Long)  
**Description:** Returns full customer profile object. Used by PolicyService.

**Request:** No body  
**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "age": null
}
```

---

---

# 2. POLICY SERVICE
**Direct Port:** `8082` | **Gateway Path Prefix:** `/api/policies/**`, `/api/policy-types/**`

---

## 2.1 PolicyController — `/api/policies`

### POST `/api/policies/purchase`
**Security:** 🔐 CUSTOMER only  
**Description:** Purchase a new insurance policy. The customer ID is extracted automatically from the JWT context.

**Request Body:**
```json
{
  "policyTypeId": 1,
  "coverageAmount": 500000.00,
  "paymentFrequency": "MONTHLY | QUARTERLY | ANNUALLY",
  "startDate": "2025-01-01",
  "nomineeName": "Jane Doe",
  "nomineeRelation": "Spouse",
  "customerAge": 30
}
```
**Response:** `201 CREATED`
```json
{
  "policyId": 1,
  "policyNumber": "POL-20250101-001",
  "status": "ACTIVE",
  "coverageAmount": 500000.00,
  "premiumAmount": 1200.00,
  "startDate": "2025-01-01",
  "endDate": "2026-01-01",
  ...
}
```

---

### GET `/api/policies/my`
**Security:** 🔐 CUSTOMER only  
**Description:** Get all policies belonging to the authenticated customer. Supports pagination.

**Query Params:**

| Param       | Default      | Description     |
|-------------|--------------|-----------------|
| `page`      | `0`          | Page number     |
| `size`      | `10`         | Page size       |
| `sortBy`    | `createdAt`  | Sort field      |
| `direction` | `desc`       | `asc` or `desc` |

**Response:** `200 OK` — Paginated `PolicyPageResponse`

---

### GET `/api/policies/{policyId}`
**Security:** 🔐 Any authenticated user (CUSTOMER sees own policy; ADMIN sees any)  
**Path Variable:** `policyId` (Long)  
**Description:** Fetch a single policy by ID.

**Request:** No body  
**Response:** `200 OK` — `PolicyResponse`

---

### PUT `/api/policies/{policyId}/cancel`
**Security:** 🔐 CUSTOMER only (own policy)  
**Path Variable:** `policyId` (Long)  
**Query Param:** `reason` (String, optional) — Reason for cancellation

**Description:** Customer requests to cancel their own policy.

**Request:** No body  
**Response:** `200 OK` — `PolicyResponse` with updated status `CANCELLED`

---

### POST `/api/policies/renew`
**Security:** 🔐 CUSTOMER only  
**Description:** Renew an existing policy.

**Request Body:**
```json
{
  "policyId": 1,
  "newStartDate": "2026-01-01"
}
```
**Response:** `201 CREATED` — `PolicyResponse`

---

### POST `/api/policies/premiums/pay`
**Security:** 🔐 CUSTOMER only  
**Description:** Pay a premium installment for a policy.

**Request Body:**
```json
{
  "policyId": 1,
  "amount": 1200.00
}
```
**Response:** `200 OK` — `PremiumResponse`

---

### GET `/api/policies/{policyId}/premiums`
**Security:** 🔐 Any authenticated user  
**Path Variable:** `policyId` (Long)  
**Description:** Get all premium payment records for a policy.

**Request:** No body  
**Response:** `200 OK` — `List<PremiumResponse>`

---

### POST `/api/policies/calculate-premium`
**Security:** 🌐 PUBLIC (no auth required)  
**Description:** Calculate an estimated premium before purchasing.

**Request Body:**
```json
{
  "policyTypeId": 1,
  "coverageAmount": 500000.00,
  "customerAge": 30,
  "paymentFrequency": "MONTHLY"
}
```
**Response:** `200 OK`
```json
{
  "estimatedPremium": 1200.00,
  "annualPremium": 14400.00,
  "coverageAmount": 500000.00
}
```

---

### GET `/api/policies/admin/all`
**Security:** 🔐 ADMIN only  
**Description:** Fetch all policies (all customers) with pagination.

**Query Params:** `page`, `size`, `sortBy`, `direction` (same as `/my`)  
**Response:** `200 OK` — Paginated `PolicyPageResponse`

---

### PUT `/api/policies/admin/{policyId}/status`
**Security:** 🔐 ADMIN only  
**Path Variable:** `policyId` (Long)  
**Description:** Admin manually updates a policy's status.

**Request Body:**
```json
{
  "status": "ACTIVE | INACTIVE | CANCELLED | EXPIRED",
  "remarks": "string"
}
```
**Response:** `200 OK` — `PolicyResponse`

---

### GET `/api/policies/admin/summary`
**Security:** 🔐 ADMIN only  
**Description:** Aggregated policy stats for the admin dashboard.

**Request:** No body  
**Response:** `200 OK`
```json
{
  "totalPolicies": 150,
  "activePolicies": 120,
  "cancelledPolicies": 20,
  "expiredPolicies": 10
}
```

---

### PUT `/api/policies/internal/{policyId}/deduct-coverage`
**Security:** 🔑 INTERNAL (X-Internal-Secret)  
**Path Variable:** `policyId` (Long)  
**Query Param:** `amount` (BigDecimal) — Amount to deduct from coverage  
**Description:** Called by ClaimService after a claim is approved to reduce remaining coverage.

**Request:** No body  
**Response:** `200 OK` — `PolicyResponse`

---

## 2.2 PolicyTypeController — `/api/policy-types`

### GET `/api/policy-types`
**Security:** 🌐 PUBLIC  
**Description:** Get all active insurance product types (catalog for customers to browse).

**Request:** No body  
**Response:** `200 OK` — `List<PolicyTypeResponse>`
```json
[
  {
    "id": 1,
    "name": "Health Insurance",
    "category": "HEALTH",
    "description": "...",
    "baseRate": 0.05,
    "minCoverage": 100000,
    "maxCoverage": 2000000,
    "active": true
  }
]
```

---

### GET `/api/policy-types/{id}`
**Security:** 🌐 PUBLIC  
**Path Variable:** `id` (Long)  
**Description:** Get details of a specific insurance product type.

**Request:** No body  
**Response:** `200 OK` — `PolicyTypeResponse`

---

### GET `/api/policy-types/category/{category}`
**Security:** 🌐 PUBLIC  
**Path Variable:** `category` — One of `HEALTH`, `LIFE`, `VEHICLE`, `PROPERTY`, etc.  
**Description:** Filter policy types by insurance category.

**Request:** No body  
**Response:** `200 OK` — `List<PolicyTypeResponse>`

---

### GET `/api/policy-types/all`
**Security:** 🔐 ADMIN only  
**Description:** Get ALL policy types including inactive/discontinued products.

**Request:** No body  
**Response:** `200 OK` — `List<PolicyTypeResponse>`

---

### POST `/api/policy-types`
**Security:** 🔐 ADMIN only  
**Description:** Create a new insurance product type.

**Request Body:**
```json
{
  "name": "Term Life Insurance",
  "category": "LIFE",
  "description": "Pure risk cover with no maturity benefit",
  "baseRate": 0.03,
  "minCoverage": 500000,
  "maxCoverage": 10000000,
  "durationMonths": 240
}
```
**Response:** `201 CREATED` — `PolicyTypeResponse`

---

### PUT `/api/policy-types/{id}`
**Security:** 🔐 ADMIN only  
**Path Variable:** `id` (Long)  
**Description:** Update an existing insurance product type.

**Request Body:** Same as POST (full update)  
**Response:** `200 OK` — `PolicyTypeResponse`

---

### DELETE `/api/policy-types/{id}`
**Security:** 🔐 ADMIN only  
**Path Variable:** `id` (Long)  
**Description:** Discontinue (soft delete) an insurance product. Existing policies are not affected.

**Request:** No body  
**Response:** `200 OK`
```
"Policy type discontinued successfully"   (plain text)
```

---

---

# 3. CLAIM SERVICE
**Direct Port:** `8083` | **Gateway Path Prefix:** `/api/claims/**`

---

## ClaimController — `/api/claims`

### POST `/api/claims`
**Security:** 🔐 CUSTOMER only  
**Description:** Create a new DRAFT claim linked to an active policy. Upload documents and submit separately.

**Request Body:**
```json
{
  "policyId": 1,
  "amount": 50000.00
}
```
**Response:** `201 CREATED` — `ClaimResponse`
```json
{
  "claimId": 10,
  "policyId": 1,
  "amount": 50000.00,
  "status": "DRAFT",
  "createdAt": "2025-01-01T10:00:00"
}
```

---

### GET `/api/claims/{id}`
**Security:** 🔐 CUSTOMER or ADMIN  
**Path Variable:** `id` (Long)  
**Description:** Get a single claim by its ID.

**Request:** No body  
**Response:** `200 OK` — `ClaimResponse`

---

### GET `/api/claims`
**Security:** 🔐 ADMIN only  
**Description:** Get all claims across all customers.

**Request:** No body  
**Response:** `200 OK` — `List<ClaimResponse>`

---

### GET `/api/claims/under-review`
**Security:** 🔐 ADMIN only  
**Description:** Get all claims currently in `UNDER_REVIEW` status (admin review queue).

**Request:** No body  
**Response:** `200 OK` — `List<ClaimResponse>`

---

### GET `/api/claims/{id}/policy`
**Security:** 🔐 CUSTOMER or ADMIN  
**Path Variable:** `id` (Long) — Claim ID  
**Description:** Fetch the associated policy details for a given claim (via Feign to PolicyService).

**Request:** No body  
**Response:** `200 OK` — `PolicyDTO`

---

### DELETE `/api/claims/{id}`
**Security:** 🔐 CUSTOMER only  
**Path Variable:** `id` (Long)  
**Description:** Delete a claim. Only claims in `DRAFT` status can be deleted.

**Request:** No body  
**Response:** `204 NO CONTENT`

---

### PUT `/api/claims/{id}/submit`
**Security:** 🔐 CUSTOMER only  
**Path Variable:** `id` (Long)  
**Description:** Submit a DRAFT claim. All 3 documents (claim form, Aadhaar, evidence) must be uploaded before calling this. On success: `DRAFT → SUBMITTED → UNDER_REVIEW`.

**Request:** No body  
**Response:** `200 OK` — `ClaimResponse` with status `UNDER_REVIEW`

---

### PUT `/api/claims/{id}/status`
**Security:** 🔐 ADMIN only  
**Path Variable:** `id` (Long)  
**Query Param:** `next` — Target status: `APPROVED` | `REJECTED`  
**Description:** Admin moves a claim to a new status.

**Request:** No body  
**Response:** `200 OK` — `ClaimResponse`

---

### POST `/api/claims/{id}/upload/claim-form`
**Security:** 🔐 CUSTOMER only  
**Path Variable:** `id` (Long)  
**Content Type:** `multipart/form-data`  
**Form Field:** `file` (MultipartFile) — PDF/image of the completed claim form

**Description:** Upload the claim form document. Does NOT change claim status.

**Response:** `200 OK` — `ClaimResponse`

---

### POST `/api/claims/{id}/upload/claim-form/generate`
**Security:** 🔐 CUSTOMER only  
**Path Variable:** `id` (Long)  
**Content Type:** `multipart/form-data`  
**Description:** Generate a PDF claim form server-side using provided data + digital signature image. Stores it automatically.

**Form Fields:**

| Field                | Type            | Description                  |
|----------------------|-----------------|------------------------------|
| `policyNumber`       | String          | Policy number string         |
| `dateClaimFiled`     | Date (yyyy-MM-dd) | When claim was filed       |
| `dateIncidentHappen` | Date (yyyy-MM-dd) | When incident occurred     |
| `reasonForClaim`     | String          | Description of claim reason  |
| `digitalSignature`   | MultipartFile   | Signature image (PNG/JPG)    |

**Response:** `200 OK` — `ClaimResponse`

---

### POST `/api/claims/{id}/upload/aadhaar`
**Security:** 🔐 CUSTOMER only  
**Path Variable:** `id` (Long)  
**Content Type:** `multipart/form-data`  
**Form Field:** `file` (MultipartFile) — Scanned Aadhaar card image/PDF

**Description:** Upload Aadhaar card as KYC document.

**Response:** `200 OK` — `ClaimResponse`

---

### POST `/api/claims/{id}/upload/evidence`
**Security:** 🔐 CUSTOMER only  
**Path Variable:** `id` (Long)  
**Content Type:** `multipart/form-data`  
**Form Field:** `file` (MultipartFile) — Supporting evidence (photo, medical report, etc.)

**Description:** Upload supporting evidence document.

**Response:** `200 OK` — `ClaimResponse`

---

### GET `/api/claims/{id}/download/claim-form`
**Security:** 🔐 CUSTOMER or ADMIN  
**Path Variable:** `id` (Long)  
**Description:** Download the stored claim form as a file attachment.

**Request:** No body  
**Response:** `200 OK` — Binary file stream (Content-Disposition: attachment)

---

### GET `/api/claims/{id}/download/aadhaar`
**Security:** 🔐 CUSTOMER or ADMIN  
**Path Variable:** `id` (Long)  
**Description:** Download the stored Aadhaar card document.

**Request:** No body  
**Response:** `200 OK` — Binary file stream

---

### GET `/api/claims/{id}/download/evidence`
**Security:** 🔐 CUSTOMER or ADMIN  
**Path Variable:** `id` (Long)  
**Description:** Download the stored evidence document.

**Request:** No body  
**Response:** `200 OK` — Binary file stream

---

---

# 4. ADMIN SERVICE
**Direct Port:** `8084` | **Gateway Path Prefix:** `/api/admin/**`
> ⚠️ **All endpoints require `ROLE_ADMIN`** — class-level `@PreAuthorize("hasRole('ADMIN')")` applied.

---

## AdminController — `/api/admin`

### GET `/api/admin/claims`
**Security:** 🔐 ADMIN only  
**Description:** Fetch all claims (proxied from ClaimService via Feign).

**Request:** No body  
**Response:** `200 OK` — `List<ClaimDTO>`

---

### GET `/api/admin/claims/under-review`
**Security:** 🔐 ADMIN only  
**Description:** Fetch all claims in UNDER_REVIEW status.

**Request:** No body  
**Response:** `200 OK` — `List<ClaimDTO>`

---

### GET `/api/admin/claims/{claimId}`
**Security:** 🔐 ADMIN only  
**Path Variable:** `claimId` (Long)  
**Description:** Fetch a single claim by ID.

**Request:** No body  
**Response:** `200 OK` — `ClaimDTO`

---

### GET `/api/admin/claim`
**Security:** 🔐 ADMIN only  
**Description:** Alias for `/api/admin/claims` (singular form supported by frontend).

**Response:** `200 OK` — `List<ClaimDTO>`

---

### PUT `/api/admin/claims/{claimId}/review`
**Security:** 🔐 ADMIN only  
**Path Variable:** `claimId` (Long)  
**Description:** Mark a submitted claim as `UNDER_REVIEW`. Transitions: `SUBMITTED → UNDER_REVIEW`.

**Request:** No body (admin ID taken from JWT context)  
**Response:** `200 OK` — `ClaimDTO`

---

### PUT `/api/admin/claims/{claimId}/approve`
**Security:** 🔐 ADMIN only  
**Path Variable:** `claimId` (Long)  
**Description:** Approve a claim. Transitions: `UNDER_REVIEW → APPROVED`. Logs the action to audit log.

**Request Body:**
```json
{
  "remarks": "All documents verified. Claim approved."
}
```
**Response:** `200 OK` — `ClaimDTO`

---

### PUT `/api/admin/claims/{claimId}/reject`
**Security:** 🔐 ADMIN only  
**Path Variable:** `claimId` (Long)  
**Description:** Reject a claim. Transitions: `UNDER_REVIEW → REJECTED`. Logs the action to audit log.

**Request Body:**
```json
{
  "remarks": "Insufficient evidence provided."
}
```
**Response:** `200 OK` — `ClaimDTO`

---

### GET `/api/admin/policies`
**Security:** 🔐 ADMIN only  
**Description:** Fetch all policies (proxied from PolicyService via Feign).

**Request:** No body  
**Response:** `200 OK` — `List<PolicyDTO>`

---

### GET `/api/admin/policies/{policyId}`
**Security:** 🔐 ADMIN only  
**Path Variable:** `policyId` (Long)  
**Description:** Fetch a single policy by ID.

**Request:** No body  
**Response:** `200 OK` — `PolicyDTO`

---

### GET `/api/admin/policy`
**Security:** 🔐 ADMIN only  
**Description:** Alias for `/api/admin/policies` (singular form supported by frontend).

**Response:** `200 OK` — `List<PolicyDTO>`

---

### PUT `/api/admin/policies/{policyId}/cancel`
**Security:** 🔐 ADMIN only  
**Path Variable:** `policyId` (Long)  
**Query Param:** `reason` (String, optional)  
**Description:** Admin cancels a policy on behalf of a user. Calls PolicyService and logs the action.

**Request:** No body  
**Response:** `200 OK` — `PolicyDTO`

---

### GET `/api/admin/users`
**Security:** 🔐 ADMIN only  
**Description:** Fetch all registered users (proxied from AuthService via Feign).

**Request:** No body  
**Response:** `200 OK` — `List<UserDTO>`

---

### GET `/api/admin/users/{userId}`
**Security:** 🔐 ADMIN only  
**Path Variable:** `userId` (Long)  
**Description:** Fetch a single user's details.

**Request:** No body  
**Response:** `200 OK` — `UserDTO`

---

### GET `/api/admin/dashboard-stats`
**Security:** 🔐 ADMIN only  
**Description:** Aggregate dashboard statistics — total users, policies, and claims by status.

**Request:** No body  
**Response:** `200 OK`
```json
{
  "totalUsers": 100,
  "totalPolicies": 150,
  "activePolicies": 120,
  "totalClaims": 45,
  "pendingClaims": 10,
  "approvedClaims": 30,
  "rejectedClaims": 5
}
```

---

### GET `/api/admin/audit-logs`
**Security:** 🔐 ADMIN only  
**Description:** Fetch all audit logs from the admin service's own database.

**Request:** No body  
**Response:** `200 OK` — `List<AuditLog>`

---

### GET `/api/admin/audit-logs/recent`
**Security:** 🔐 ADMIN only  
**Description:** Fetch the most recent N audit log entries.

**Query Param:** `limit` (int, default `10`)

**Response:** `200 OK` — `List<AuditLog>`

---

### GET `/api/admin/audit-logs/{entity}/{id}`
**Security:** 🔐 ADMIN only  
**Path Variables:**  
- `entity` (String) — `CLAIM` or `POLICY`  
- `id` (Long) — Entity ID  

**Description:** Fetch full audit history for a specific claim or policy.

**Request:** No body  
**Response:** `200 OK` — `List<AuditLog>`

---

### GET `/api/admin/audit-logs/range`
**Security:** 🔐 ADMIN only  
**Description:** Fetch audit logs within a specified date-time range.

**Query Params:**  
- `from` — ISO DateTime string (e.g., `2025-01-01T00:00:00`)  
- `to` — ISO DateTime string (e.g., `2025-12-31T23:59:59`)  

**Response:** `200 OK` — `List<AuditLog>`

---

---

# 5. PAYMENT SERVICE
**Direct Port:** `8085` | **Gateway Path Prefix:** `/api/payments/**`

---

## PaymentController — `/api/payments`

### GET `/api/payments/transaction/{transactionId}`
**Security:** 🌐 PUBLIC (no security config defined — open)  
**Path Variable:** `transactionId` (String)  
**Description:** Lookup a payment record by its transaction ID.

**Request:** No body  
**Response:**
- `200 OK` — `Payment` entity if found
- `404 NOT FOUND` — if transaction ID doesn't exist

---

### GET `/api/payments/health-check`
**Security:** 🌐 PUBLIC  
**Description:** Simple health-check to confirm Payment Service is running.

**Request:** No body  
**Response:** `200 OK`
```
"Payment Service is up and running"   (plain text)
```

---

---

# 6. API GATEWAY — Route Summary

**Port:** `8080`

| Route ID               | Path Pattern            | Target Service    | Notes                      |
|------------------------|-------------------------|-------------------|----------------------------|
| `authService-user`     | `/user/**`              | AUTHSERVICE       |                            |
| `authService-api`      | `/api/auth/**`          | AUTHSERVICE       |                            |
| `authService-actuator` | `/authService/**`       | AUTHSERVICE       | StripPrefix=1              |
| `policyService-policy` | `/api/policies/**`      | POLICYSERVICE     |                            |
| `policyService-types`  | `/api/policy-types/**`  | POLICYSERVICE     |                            |
| `claimService`         | `/api/claims/**`        | CLAIMSERVICE      |                            |
| `adminService`         | `/api/admin/**`         | ADMINSERVICE      |                            |
| `paymentService`       | `/api/payments/**`      | PAYMENTSERVICE    |                            |
| `authService-docs`     | `/authService/v3/api-docs/**` | AUTHSERVICE | StripPrefix=1 (Swagger)  |
| `policyService-docs`   | `/policyService/v3/api-docs/**` | POLICYSERVICE | StripPrefix=1          |
| `claimService-docs`    | `/claimService/v3/api-docs/**` | CLAIMSERVICE | StripPrefix=1           |
| `adminService-docs`    | `/adminService/v3/api-docs/**` | ADMINSERVICE | StripPrefix=1           |

**Swagger UI (Centralized):** `http://localhost:8080/swagger-ui.html`

---

---

# 7. Claim Lifecycle — Status Flow

```
DRAFT
  │
  ├─[Upload documents: claim-form, aadhaar, evidence]
  │
  └─[Customer: PUT /submit]
        │
        ▼
    SUBMITTED
        │
        └─[Auto or Admin: PUT /claims/{id}/review  OR  Admin via AdminService]
              │
              ▼
         UNDER_REVIEW
              │
      ┌───────┴───────┐
      ▼               ▼
  APPROVED         REJECTED
```

---

# 8. Inter-Service Communication Map

| Caller         | Called Service | Endpoint(s)                                          | Purpose                         |
|----------------|----------------|------------------------------------------------------|---------------------------------|
| AdminService   | ClaimService   | `GET /api/claims`, `PUT /api/claims/{id}/status`     | Fetch claims, approve/reject    |
| AdminService   | PolicyService  | `GET /api/policies/admin/all`, `PUT /cancel`         | Fetch policies, cancel          |
| AdminService   | AuthService    | `GET /user/getAll`                                   | Fetch all users                 |
| ClaimService   | PolicyService  | `GET /api/policies/{id}`                             | Validate policy for claim       |
| PolicyService  | AuthService    | `GET /user/internal/{userId}/email`                  | Get customer email              |
| PolicyService  | AuthService    | `GET /user/internal/{userId}/profile`                | Get customer profile            |
| ClaimService   | PolicyService  | `PUT /api/policies/internal/{id}/deduct-coverage`    | Deduct coverage on approval     |

> All inter-service calls use the `X-Internal-Secret` header for authentication.

---

*Generated: 2026-04-05 | SmartSure Microservices Backend Documentation*
