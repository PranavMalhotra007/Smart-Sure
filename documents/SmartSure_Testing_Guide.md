# SmartSure System — Complete Testing Guide

This document outlines the step-by-step procedure to test the entire SmartSure Insurance microservice lifecycle using the API Gateway (`localhost:8080`). You can use tools like Postman or cURL to execute these steps.

## Prerequisites
1. Ensure Docker is running.
2. Build and start the infrastructure:
   ```bash
   docker-compose up --build -d
   ```
3. Wait about ~90 seconds for all services (Config Server, Eureka, Gateway, and 4 Business Services) to start and register with Eureka.

---

## **Flow 1: User Registration & Authentication**
Customers must register and obtain a JWT to interact with the system securely.

### Step 1.1: Register a New Customer
**Endpoint**: `POST http://localhost:8080/api/auth/register`  
**Body** (Raw JSON):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "johndoe@example.com",
  "password": "Password123!",
  "phone": 9876543210,
  "role": "CUSTOMER"
}
```

### Step 1.2: Login to Get JWT Token
**Endpoint**: `POST http://localhost:8080/api/auth/login`  
**Body** (Raw JSON):
```json
{
  "email": "johndoe@example.com",
  "password": "Password123!"
}
```
*Note: Copy the `token` from the response. You will use this as a Bearer Token for all subsequent customer requests.*

---

## **Flow 2: Policy Management (Customer)**

### Step 2.1: Purchase an Insurance Policy
**Endpoint**: `POST http://localhost:8080/api/policies/purchase`  
**Headers**: `Authorization: Bearer <YOUR_JWT_TOKEN>`  
**Body** (Raw JSON):
```json
{
  "policyTypeId": 1,
  "coverageAmount": 100000.00,
  "paymentFrequency": "MONTHLY",
  "startDate": "2026-03-28",
  "nomineeName": "Jane Doe",
  "nomineeRelation": "Spouse"
}
```
*(Note: Keep track of the returned `id` as `POLICY_ID`)*.

### Step 2.2: View My Active Policies
**Endpoint**: `GET http://localhost:8080/api/policies/my`  
**Headers**: `Authorization: Bearer <YOUR_JWT_TOKEN>`  

### Step 2.3: Pay Premium (Simulated)
**Endpoint**: `POST http://localhost:8080/api/policies/premiums/pay`  
**Headers**: `Authorization: Bearer <YOUR_JWT_TOKEN>`  
**Body** (Raw JSON):
```json
{
  "policyId": <POLICY_ID>,
  "paymentMethod": "CREDIT_CARD",
  "razorpayPaymentId": "pay_test123xyz"
}
```
*(Note: Paying a premium automatically triggers a RabbitMQ event to the Admin service for auditing.)*

---

## **Flow 3: Claims Management (Customer)**

### Step 3.1: File a New Claim
**Endpoint**: `POST http://localhost:8080/api/claims`  
**Headers**: `Authorization: Bearer <YOUR_JWT_TOKEN>`  
**Body** (Raw JSON):
```json
{
  "policyId": <POLICY_ID>
}
```
*(Note: A Claim relies on internal Feign calls to Policy and Auth services. If Feign clients mismatched, this endpoint would crash. Based on our fixes, this will succeed and return the new Claim ID.)*

---

## **Flow 4: Administrative Auditing & Approvals**
The Admin service uses pre-seeded credentials to perform overarching operations, like confirming claims and monitoring system logs.

### Step 4.1: Login as Admin
**Endpoint**: `POST http://localhost:8080/api/auth/login`  
**Body** (Raw JSON):
```json
{
  "email": "pragyavijay20318@gmail.com",
  "password": "vijay@**24"
}
```
*Note: Copy the `token` from the response. You will use this as a Bearer Token for all subsequent admin requests.*

### Step 4.2: View All Policies System-Wide
**Endpoint**: `GET http://localhost:8080/api/admin/policies`  
**Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`  

### Step 4.3: Approve or Reject a Claim
**Endpoint**: `PUT http://localhost:8080/api/admin/claims/<CLAIM_ID>/status?next=APPROVED`  
**Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`  

### Step 4.4: View System Audit Logs
**Endpoint**: `GET http://localhost:8080/api/admin/audit-logs`  
**Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`  
*(Note: This log will prove RabbitMQ successfully captured asynchronous events from Policy purchases, Premium payments, and Claim status updates).* 

---
### Architecture Tracing & Monitoring
During testing, you can monitor the microservice telemetry:
- **Zipkin Tracing**: `http://localhost:9411`
- **RabbitMQ Dashboard**: `http://localhost:15672` (guest / guest)
- **Eureka Registry**: `http://localhost:8761`
