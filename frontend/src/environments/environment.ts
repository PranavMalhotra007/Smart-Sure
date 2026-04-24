// SmartSure — Environment Configuration
//
// LOCAL DEV  → run `ng serve`, set apiGatewayUrl = 'http://localhost:8080'
// DOCKER     → Nginx serves the app on :4200 and proxies /api/* → api-gateway:8080
//              Use RELATIVE paths (empty string prefix) so the Nginx proxy takes over.
//
// Refer to: documents/API_Endpoints_Reference.md for full endpoint list

export const environment = {
  production: false,

  // ── Base URL ──────────────────────────────────────────────────────────────
  // Empty string = relative → works in both Docker (Nginx proxy) and local dev
  // (Angular dev-server proxy configured in proxy.conf.json)
  apiGatewayUrl: '',

  // ── Auth Service — via Gateway ────────────────────────────────────────────
  authApi: '/api/auth',
  userApi: '/user',

  // ── Policy Service — via Gateway ──────────────────────────────────────────
  policiesApi: '/api/policies',
  policyTypesApi: '/api/policy-types',

  // ── Claim Service — via Gateway ───────────────────────────────────────────
  claimsApi: '/api/claims',

  // ── Admin Service — via Gateway ───────────────────────────────────────────
  adminApi: '/api/admin',

  // ── Payment Service — via Gateway ─────────────────────────────────────────
  paymentsApi: '/api/payments',
};
