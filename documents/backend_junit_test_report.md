# Backend Services JUnit & Mockito Test Report

This report summarizes the unit testing implementation across all five main backend microservices in the SmartSure platform. Each core service has been thoroughly tested using **JUnit 5** and **Mockito 5**, covering normal operations, boundary limits, and explicit exception scenarios.

---

## 1. Auth Service (`UserService`)
**Test Coverage: `UserServiceTest.java`**
- **Normal Cases:** Validates successfully adding a user (`add`), updating (`update`), retrieving (`get`), and deleting (`delete`). It tests `getUsers` page serialization through `ModelMapper`.
- **Exception Cases:** Confirms `UserNotFoundException` is correctly thrown when searching or updating unregistered users.
- **Mocking:** Bypassed database calls via `UserRepository` mocks and mapping through `ModelMapper` mocks.

---

## 2. Policy Service (`PolicyTypeService`)
**Test Coverage: `PolicyTypeServiceTest.java`**
- **Normal Cases:** Fetching active policies, successful creation of unique policies, and soft-deletion strategies (`updatePolicyType`, `deletePolicyType`).
- **Boundary Cases:** Ensures age bounds are correctly validated (e.g., MinAge equals MaxAge successfully persists without error).
- **Exception Cases:** Throws `IllegalArgumentException` explicitly when identical policy names get submitted, or if `MinAge > MaxAge`.

---

## 3. Claim Service (`ClaimService`)
**Test Coverage: `ClaimServiceTest.java`**
- **Normal Cases:** Validates the standard Draft creation, deleting records if ownership proves out (`createClaim`, `deleteClaim`). Handled mocking of internal state transitions to `APPROVED` or `REJECTED`.
- **Boundary Cases:** Evaluated claim creation when exact Leftover Coverage limits are met tightly against exact coverage left on a policy.
- **Exception Cases:** 
  - Overdrawn Limit: Claim amounts larger than available policy bounds immediately throw.
  - Ownership: Throwing `UnauthorizedAccessException` if a simulated non-admin attempts reading cross-user claims.
- **Mocking Strategy:** Uses Mockito's `mockStatic()` interface to effectively bypass static `SecurityUtils` checks to mimic distinct JWT principal behaviors.

---

## 4. Admin Service (`AdminService`)
**Test Coverage: `AdminServiceTest.java`**
- **Normal Cases:** Aggregation endpoint checking for Dashboard calculations (`getDashboardStats`) verifying proper mapping across distinct microservices. Checks approval routes while auditing interactions via the `auditLogService`.
- **Boundary Cases:** Ensured `markUnderReview` acts effectively as a No-Op when a claim is naturally already labeled `UNDER_REVIEW`.
- **Exception Cases:** Handled safe "Silent Failure Enchancements" simulating offline services (where `PolicyFeignClient` shuts down gracefully but leaves core claims accessible to UI admins).

---

## 5. Payment Service (`PaymentService`)
**Test Coverage: `PaymentServiceTest.java`**
- **Normal Cases:** Successful local verification mocking standard transaction IDs and saving payment events to local SQL. Processing claim disbursements directly through repository save assertions.
- **Boundary Cases:** Triggering SAGA limit overrides accurately mapping transactions right against boundary constraints (e.g., exactly at 100k limits registering distinct responses).
- **Exception Cases:** Missing transaction checks (`getPaymentByTransactionId`) returning strictly monitored nulls without crashing service layers.

---

## Running the Test Suite
The microservice workspace has been prepped with these tests. They will seamlessly integrate into DevOps pipelines. To run these tests from a terminal, target `mvn test` per localized service, or utilize IDE test run configurations integrated directly with the provided Lombok extension.

**Example Local Execution:**
```bash
cd claimService
mvn clean test
```
