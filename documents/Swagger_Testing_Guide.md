# SmartSure API Testing Guide - Swagger (OpenAPI)

This document provides instructions on how to access and test the SmartSure microservices APIs using Swagger UI.

## 1. Centralized Swagger UI (Recommended)

The API Gateway now provides a centralized interface where you can access the documentation for all microservices in one place.

- **URL**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **Usage**:
    1. Open the URL in your browser.
    2. Use the **Select a definition** dropdown (top-right) to switch between different services:
        - `Auth Service`
        - `Policy Service`
        - `Claim Service`
        - `Admin Service`

## 2. Individual Service Swagger UIs

Each service also maintains its own Swagger UI for direct access:

| Service | Swagger UI URL |
| :--- | :--- |
| **API Gateway** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| **Auth Service** | [http://localhost:8081/swagger-ui/index.html](http://localhost:8081/swagger-ui/index.html) |
| **Policy Service** | [http://localhost:8082/swagger-ui/index.html](http://localhost:8082/swagger-ui/index.html) |
| **Claim Service** | [http://localhost:8083/swagger-ui/index.html](http://localhost:8083/swagger-ui/index.html) |
| **Admin Service** | [http://localhost:8084/swagger-ui/index.html](http://localhost:8084/swagger-ui/index.html) |

## 3. How to Test Authenticated Endpoints

Most endpoints in SmartSure require a JWT token for authentication. Follow these steps to test them:

### Step 1: Login to get a token
1. In Swagger UI, select **Auth Service**.
2. Find the `/api/auth/login` endpoint.
3. Click **Try it out**.
4. Enter valid credentials (e.g., admin credentials from `AuthService/src/main/resources/application.properties`).
5. Click **Execute**.
6. Copy the `jwtToken` from the response body.

### Step 2: Authorize in Swagger
1. Scroll to the top of the Swagger UI page and click the **Authorize** button (green lock icon).
2. In the **Value** field, paste your JWT token.
3. Click **Authorize** and then **Close**.

### Step 3: Test protected APIs
1. Navigate to the endpoint you want to test (e.g., creating a policy or approving a claim).
2. Click **Try it out**, fill in the required parameters/body.
3. Click **Execute**.
4. The Swagger UI will automatically include the `Authorization: Bearer <your-token>` header in the request.

## 4. Troubleshooting

- **401 Unauthorized**: Ensure you have successfully followed the "Authorize" steps above and that your token hasn't expired.
- **403 Forbidden**: Your user role does not have permission to access this specific resource.
- **Connection Refused**: Ensure the microservice is running and accessible.
- **No Definition Found**: Check if the service's `/v3/api-docs` endpoint is reachable at the expected URL.

> [!TIP]
> If you are testing through the API Gateway, ensure the Gateway itself is running on port 8080.
