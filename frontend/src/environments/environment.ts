// SmartSure — Environment Configuration
// All API calls go via the API Gateway (port 8080)
// Refer to: documents/API_Endpoints_Reference.md for full endpoint list

export const environment = {
  production: false,
  apiGatewayUrl: 'http://localhost:8080',

  // Auth Service — via Gateway
  authApi: 'http://localhost:8080/api/auth',
  userApi: 'http://localhost:8080/user',

  // Policy Service — via Gateway
  policiesApi: 'http://localhost:8080/api/policies',
  policyTypesApi: 'http://localhost:8080/api/policy-types',

  // Claim Service — via Gateway
  claimsApi: 'http://localhost:8080/api/claims',

  // Admin Service — via Gateway
  adminApi: 'http://localhost:8080/api/admin',

  // Payment Service — via Gateway
  paymentsApi: 'http://localhost:8080/api/payments',
};
