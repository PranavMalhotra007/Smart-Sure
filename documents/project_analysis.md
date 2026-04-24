# Project Analysis: Smart Sure

## 1. Technology Stack Versions

Based on the project configuration files (`pom.xml` for backend, `package.json` for frontend, and `docker-compose.yml` for infrastructure), here are the versions of the key technologies used in the Smart Sure platform:

- **Java Version:** 17
- **Spring Boot Version:** 3.5.11 (with Spring Cloud 2025.0.1)
- **Angular Version:** 21.2.0
- **Database:** MySQL 8 
- **Message Broker:** RabbitMQ 3.x
- **Caching:** Redis 7 
- **Observability & Monitoring:** 
  - Prometheus (Metrics)
  - Grafana 10.2.0 (Dashboards)
  - Zipkin 2.27 (Distributed Tracing)
  - SonarQube 9.9.5 (Code Quality)

---

## 2. Database Analysis

**Current Database Used:** **MySQL**

**Why MySQL over PostgreSQL for this project:**

1. **Read-Heavy Nature of Dashboards:** Insurance portals like SmartSure primarily involve read-heavy operations (customers viewing policy plans, admins monitoring dashboards, users checking their claim status). MySQL natively handles read operations extremely efficiently, particularly using its default InnoDB engine.
2. **Simplicity and Ecosystem Integration:** MySQL has a ubiquitous presence and highly optimized, straightforward integration within the Spring Boot ecosystem. It allows for fast scaffolding of standard REST microservices.
3. **Microservices Architecture Fit:** While PostgreSQL excels at complex analytics, custom data constructs, and massive multi-writer concurrency, a microservices architecture specifically isolates data contexts (e.g., Auth DB, Claims DB, Policy DB). In this fragmented data model, the necessity for complex DB-level analytics decreases, and the raw speed, lower footprint, and simplicity of MySQL per-service become vastly superior.

---

## 3. Message Broker Analysis

**Current Message Broker Used:** **RabbitMQ** (via `spring-boot-starter-amqp`)

**Why RabbitMQ over Apache Kafka for this project:**

1. **Complex Routing & Reliable Delivery:** RabbitMQ is an AMQP broker designed around complex routing logic (Exchanges, Queues, Bindings). When specific events trigger targeted asynchronous tasks (e.g., a "Claim Approved" event triggering an email), RabbitMQ natively ensures reliable point-to-point message delivery.
2. **Exactly-Once Processing:** RabbitMQ is tailored for standard enterprise messaging with immediate message acknowledgments, dead-letter queues, and built-in retry mechanisms, ensuring crucial operational events don't get lost.
3. **Kafka is Overkill:** Apache Kafka is fundamentally a distributed event streaming platform built for massive, sustained data throughput, log appending, and event stream replayability. For an enterprise app generating specific transactional events (like creating a user or a policy), the overhead of managing a Kafka cluster (even with KRaft) is an unnecessary operational burden. RabbitMQ gracefully solves the asynchronous service communication needs of SmartSure with lower latency and straightforward configuration.

---

## 4. Security Architecture Analysis

### Type of Security Utilized
The security framework of SmartSure is based entirely on **Stateless, Token-Based Authentication deployed via an API Gateway Pattern**. It relies on JSON Web Tokens (JWT) mapped natively into the Spring Security Context, avoiding the traditional use of server-side browser sessions (JSESSIONID/Cookies).

### Why Stateless JWT is Better Suited for this Project
1. **Microservices Scalability:** In a traditional monolithic application, stateful session security works well because memory is shared. However, SmartSure is composed of multiple independent microservices (Auth, Policy, Claim, Admin). If sessions were used, every service would need to connect to a centralized session store (like Redis) continuously to verify if a user is logged in. With stateless JWTs, the entire identity and authorization map (User ID, Role, Expiration) is cryptographically packaged inside the token itself, meaning services don't need a central database to verify identity.
2. **API Gateway Decoupling:** By pushing the JWT validation to the API Gateway (`api-gateway`), the system inherently secures down-stream microservices. The gateway safely validates the tokens and converts them into simple HTTP Headers (`X-User-Id`, `X-User-Role`) passed to the backend. This allows backend engineers to write clean, feature-focused code without constantly rewriting JWT parsing security logic in every new service.
3. **CORS and Frontend Compatibility:** The frontend is a totally decoupled Angular SPA (Single Page Application) running independently. Session cookies often run into severe Cross-Origin Resource Sharing (CORS) or CSRF blocks when communicating across different domains or ports. Bearer tokens manually inserted into HTTP Authorization headers perfectly sidestep these strict browser restrictions.

### Frontend Integration (Angular)
The connection between the Angular frontend and Java backend is fully stateless utilizing JWT (JSON Web Tokens).
- **`auth-interceptor.ts`**: This HTTP interceptor automatically captures every outgoing HTTP request to the backend. It uses `AuthService.getToken()` and implicitly modifies the request (`req.clone`) to inject an `Authorization: Bearer <token>` header. 
- **`auth-guard.ts`**: Prevents navigation into unauthorized sections of the frontend. By checking `authService.getRole()`, it allows only `ADMIN` roles into routes containing `/admin`. If unauthorized, it leverages the Angular `Router` to redirect users back to their respective dashboards or the `/login` page.

### Backend Code Terminology (`SecurityConfig.java`)
The backend security leverages Spring Security with the following critical declarations:
- **`@Configuration`**: Flags the class as a configuration source containing `@Bean` methods.
- **`@EnableWebSecurity`**: Activates Spring Security’s web-layer security.
- **`@EnableMethodSecurity`**: Allows method-level security enforcement anywhere in the code (e.g., using `@PreAuthorize`).
- **`SecurityFilterChain`**: The core component that processes HTTP requests through a chain of filters to verify authorization logic.
- **`.csrf(csrf -> csrf.disable())`**: Disables Cross-Site Request Forgery (CSRF). Since this application relies on a stateless JWT payload instead of standard browser cookies, CSRF protection is unnecessary.
- **`.sessionManagement(...)` / `STATELESS`**: Dictates that the server will **not** create standard HTTP tracking sessions. Authentication data hinges completely on the JWT token provided in each request.
- **`.authorizeHttpRequests(...)`**: Used to map varying paths to rules.
- **`.permitAll()` / `.anyRequest().authenticated()`**: Paths paired with `permitAll` bypass authentication (open), while everything else is marked as `authenticated` meaning a valid token is permanently strictly required (closed).
- **`.addFilterBefore` / `.addFilterAfter`**: Allows pushing custom internal validation logic into the default Spring Security filter chain order.

### Open vs Closed Endpoints
- **Open Links (Bypassing auth):** 
  - `/api/auth/**` (Registration, Login endpoints)
  - `/user/internal/**` (Internal inter-service routing)
  - `/swagger-ui/**`, `/v3/api-docs/**`, `/swagger-ui.html` (API Documentation)
  - `/actuator/**` (Healthchecks & Observability endpoints)
- **Closed Links:** Every single endpoint not expressly declared above must carry a valid JWT authorization token header.

### JWT Structure (Creation & Validation)
- **Where & How it's Formed:** 
  In the `AuthService` inside `JwtUtil.java`. When a user logs in, `Jwts.builder()` generates the token. It stores the `userId` as the primary identifier (`.subject(userId)`). Crucially, the role is attached within the token using a custom claim (`.claim("role", role)`). Upon structuring the data, it's Cryptographically signed symmetrically (HMAC SHA) using `Keys.hmacShaKeyFor(secret.getBytes())` yielding the token string.
- **Validation Overview:**
  Every external request hits the **API Gateway** (`ApiGatewaySmartSure`), acting as a security gatekeeper via the `JwtAuthFilter.java` class (`implements WebFilter`). 
  The filter scrapes the token via `exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION)`. If present (starts with `Bearer `), it extracts the token and parses its claims back using the exact same secret key (`Jwts.parser().verifyWith(...).build().parseSignedClaims()`). 

### Role Mapping and Service Access
- Once verified, the gateway unpacks the user ID and role and creates a **`UsernamePasswordAuthenticationToken`** holding native Spring Security contextualized authorities (`"ROLE_" + role`).
- So that downstream microservices (like AdminService, PolicyService) know who the user is without re-reading the JWT, the API Gateway actively mutations the request by injecting explicit system headers: 
  - `X-User-Id`
  - `X-User-Role`
  - `X-Internal-Secret`
- Subsequent microservices merely process requests trusting these headers from the API Gateway.
