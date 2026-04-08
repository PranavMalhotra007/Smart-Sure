# SmartSure Admin Dashboard Frontend Testing Guide

This guide provides step-by-step instructions to run and test the Angular frontend application.

## Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

## Setup Steps

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   Install all the required npm packages:
   ```bash
   npm install
   ```

3. **Start the development server**
   Run the Angular application locally:
   ```bash
   npm run start
   ```
   Or use the Angular CLI directly:
   ```bash
   npx ng serve
   ```

4. **Access the application**
   Open your browser and navigate to:
   http://localhost:4200

## Testing Flow

1. **Login Page**
   - The application will redirect to the `/login` page if you are not authenticated.
   - Enter your credentials (e.g., test admin credentials) to login.
   - The frontend will call the backend API Gateway (`http://localhost:8080/api/auth/login`).
   - On successful authentication, the JWT token is stored in localStorage.

2. **Role-Based Routing**
   - If the user role is `ADMIN`, you will be redirected to the Admin Dashboard (`/admin/dashboard`).
   - If the user role is `CUSTOMER`, an access denied message will be shown.

3. **Admin Dashboard**
   - Explore the Overview Dashboard with statistics and recent activity.
   - Navigate using the side menu.

4. **Claims Management**
   - Go to the "All Claims" section via the sidebar.
   - You can see a list of claims from the `ClaimService`.
   - Click on an "Under Review" claim to view details and approve/reject the claim.

## Troubleshooting
- **CORS Issues:** Make sure the backend API Gateway (`application.properties`) has `cors.allowed.origins` configured to include `http://localhost:4200`.
- **Backend Unreachable:** Ensure you have started the Spring Boot Microservices (`ServiceRegistrySmartSure`, `ApiGatewaySmartSure`, `AuthService`, `PolicyService`, `ClaimService`, `AdminService`, `PaymentService`).
- **Port Conflict:** If port 4200 is in use, start the app with `npm start -- --port <new-port>`.
