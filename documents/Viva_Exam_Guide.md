# SmartSure Microservices: Viva Exam Study Guide 🎓

This document is designed to help you ace your Viva exam by explaining the "Why", "How", and "What" of your SmartSure project. It covers everything from high-level architecture to specific code-level details.

---

## 1. High-Level Architecture: Microservices 🏗️

### What is it?
Instead of one giant application (Monolith), your project is broken into small, independent services: `AuthService`, `PolicyService`, `ClaimService`, `AdminService`, and `ApiGateway`.

### Why use it?
- **Scalability**: You can scale only the "Policy Service" if more people are buying policies, without scaling the "Admin Service".
- **Fault Tolerance**: If the "Claim Service" goes down, users can still log in and view their profile.
- **Independence**: Different teams can work on different services using different technologies (though here you used Java for all).

### Core Components:
- **Service Registry (Eureka)**: The "Phonebook" of your services. Every service registers its IP and port here so they can find each other.
- **API Gateway (Spring Cloud Gateway)**: The "Front Door". It receives all external requests, checks security (JWT), and routes them to the correct service. It also handles **Circuit Breaking (Resilience4j)**.

---

## 2. Communication: REST vs RabbitMQ 📡

### REST (Synchronous) - "The Phone Call"
- **Used for**: Fetching data (e.g., getting a user's policy).
- **Tool**: **OpenFeign**.
- **Pros**: Immediate response.
- **Cons**: If the target service is slow or down, the caller is blocked.

### RabbitMQ (Asynchronous) - "The Text Message"
- **Used for**: Events like "Claim Approved" or "Policy Purchased".
- **Why it's better here**:
    - **Decoupling**: The `ClaimService` doesn't need to know *how* to send an email. It just drops a message in the queue.
    - **Reliability**: If the `EmailService` is down, the message stays in the queue until it's back up. No data is lost.
    - **Performance**: The user gets a "Claim Approved" response immediately; the email happens in the background.

---

## 3. Database & Transactions 💾

### @Transactional: The "All or Nothing" Rule
- **Purpose**: Ensures that a series of database operations either all succeed or all fail.
- **Why use it?**: If you approve a claim but the system crashes before logging the audit, `@Transactional` will "Rollback" the claim approval so the data stays consistent.

### Audit Logging
- **Purpose**: To track "Who did What and When".
- **Login Audit Log**: Tracks user login activity for security.
- **Admin Audit Log**: Specialized log for internal admin actions (approvals/rejections).
- **Challenge Solved**: We moved Admin logs to a unique table (`admin_audit_logs`) to avoid schema conflicts with `PolicyService`.

---

## 4. Security: JWT & Filters 🔐

### JWT (JSON Web Token)
- **What is it?**: A self-contained token that proves the user's identity and roles.
- **Why use it?**: In microservices, "Sessions" don't work well because each service is independent. JWT is "Stateless"—every service can verify the token without asking a central "Session Server".

### Custom Filters:
- **JwtFilter**: Re-verifies the user's token on every request.
- **InternalRequestFilter**: The "Secret Handshake". It ensures only our own services can talk to internal APIs by checking the `X-Internal-Secret`.

---

## 5. Observability: Zipkin, Grafana, Swagger 📈

### Zipkin (Distributed Tracing)
- **What is it?**: It tracks a single request as it travels through multiple services.
- **Why use it?**: If buying a policy is slow, Zipkin shows you exactly which service is causing the delay (GateWay -> Policy -> Auth).

### Prometheus & Grafana
- **Prometheus**: Collects "Metrics" (how many requests per second, CPU usage).
- **Grafana**: The "Dashboard". It visualizes those metrics in pretty graphs.
- **Actuator**: The Spring Boot tool that exposes these metrics at `/actuator/prometheus`.

### Swagger (OpenAPI)
- **What is it?**: Auto-generated documentation for your APIs.
- **Why use it?**: It provides a UI (`/swagger-ui.html`) where developers can test the endpoints without writing code.

---

## 6. Common Annotations (The "Magic" of Spring) 🪄

- **`@RestController`**: Tells Spring this class handles HTTP requests and the response is automatically converted to JSON.
- **`@Service`**: Marks the class as "Business Logic" holder.
- **`@Repository`**: Standard for classes that talk to the Database.
- **`@Value("${property.name}")`**: Injects values from `application.properties` into your variables.
- **`@Autowired` / `@RequiredArgsConstructor`**: Handles "Dependency Injection" (Spring automatically provides the objects you need).
- **`@PreAuthorize("hasRole('ADMIN')")`**: Security guard that checks the user's role before letting them run a method.

---

## 7. Viva "Killer" Questions & Answers 🎯

**Q: Why separate DTOs from Entities?**
**A**: Security and Flexibility. We don't want to expose sensitive DB fields (like passwords) to the frontend. DTOs (Data Transfer Objects) let us send exactly what the UI needs.

**Q: What is a Circuit Breaker?**
**A**: It's like a real-life electrical fuse. If one service is failing repeatedly, the "Circuit Open" state prevents requests from hitting it, giving it time to recover and protecting the rest of the system.

**Q: What was the biggest challenge in this project?**
**A**: (Bonus!) Debugging cross-service header passing. We had to ensure that the `X-Internal-Secret` was injected directly into Feign calls to pass the `InternalRequestFilter` security check.

---
*Good luck with your Viva! You've built a modern, industry-standard system.* 🚀
