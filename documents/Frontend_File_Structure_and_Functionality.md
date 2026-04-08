# 📂 SmartSure Frontend: Detailed File Structure and Functionality

This guide provides a comprehensive list of every key folder and file in the SmartSure Frontend codebase, along with a description of its purpose and technical responsibility.

---

## 🏛️ 1. Root Application Files (`src/app/`)
These files define the overall configuration and structure of the application.

- **`app.ts`**: The root component of the entire application. It acts as the "Master Container" where all other pages are rendered.
- **`app.html`**: The primary structure for the app, typically containing only the `<router-outlet>` to allow page switching.
- **`app.config.ts`**: The main configuration file for Angular. It sets up "Zoneless" change detection, Router settings, and the HTTP client with interceptors.
- **`app.routes.ts`**: The "GPS" of the app. It maps URLs (like `/customer/dashboard`) to their specific components and protects sensitive areas with security guards.
- **`styles.scss`**: Global styling rules and color tokens (variables) for the entire project, including the logic for Dark Mode.

---

## 🔐 2. Core Engine Files (`src/app/core/`)
These files contain the logic, security, and communication tools that power the interface.

### 📂 `core/services/` (The Data Carriers)
- **`auth.ts`**: Handles everything related to user identities: login, registration, token storage, and logout.
- **`policy.ts`**: Manages communication with the `/api/policy` backend. Fetches policy types, handles purchases, and retrieves a user's own policies.
- **`claim.ts`**: Manages claim-related API calls: filing new claims, uploading evidence documents, and tracking status.
- **`payment.ts`**: Handles premium payment processing logic.
- **`theme.service.ts`**: Controls the toggling between Light and Dark modes.

### 📂 `core/guards/` (The Bouncers)
- **`auth-guard.ts`**: Prevents logged-out users from accessing protected pages.
- **`admin-guard.ts`**: Ensures that only users with an `ADMIN` role can enter the management area.

### 📂 `core/interceptors/` (The Mail Sorter)
- **`auth-interceptor.ts`**: Automatically attaches the JWT "Access Token" to every outward API call.

---

## 🚪 3. Authentication Components (`src/app/auth/`)
- **`login/`**: A screen with a clean, centered card for existing users to sign in.
- **`register/`**: A registration form with multiple inputs (name, email, password) for new customers.

---

## 👤 4. Customer Components (`src/app/customer/`)
These files power the main experience for insurance policyholders.

- **`dashboard/`**: The welcome page showing high-level stats (Total Policies, Pending Claims) and recent activity.
- **`layout/`**: Contains the **Header** (navbar) and **Sidebar** that persist across all customer pages.
- **`plans/`**: A catalog of all available insurance products. Users can browse and click "Calculate Premium" to see prices.
- **`purchase/`**: A multi-step form for buying a policy, including nominee details and payment frequency.
- **`file-claim/`**: A "Wizard" process where users can select a policy, enter a claim amount, and upload the 3 required documents (Form, Aadhaar, Evidence).
- **`my-policies/`**: A detailed list of all policies owned by the user, with filters for "Active" and "Expired."
- **`my-claims/`**: A status board showing the history of all claims filed by the user.
- **`account/`**: A profile management page where users can update their address and contact details.
- **`premium-history/`**: A table showing all past and upcoming premium payment installments.

---

## 🛠️ 5. Admin Components (`src/app/admin/`)
These files are for the internal staff managing the platform.

- **`dashboard/`**: A high-level overview of total revenue, total users, and platform activity.
- **`policy-types/`**: Tools for creating new insurance plans (setting base premiums, age factors, and terms).
- **`claims/`**: A review queue where admins can look at user-uploaded evidence and **Approve** or **Reject** claims.
- **`users/`**: A management table for viewing and searching all registered customers in the system.

---

## 📝 6. Summary of Component Files
Every component folder above (like `dashboard/`) usually contains:
1.  **`.ts` file**: The TypeScript "Brain". Handles calculations and API calls.
2.  **`.html` file**: The structural skeleton (Inputs, Buttons, Cards).
3.  **`.scss` file**: The design skin (Colors, Spacing, Animations).

---

*This guide provides a structural overview for maintaining and exploring the SmartSure Frontend. For implementation details, see [Frontend Detailed Implementation Guide](file:///d:/Spring%20Implementation/New%20folder/Smart%20Sure/documents/Frontend_Detailed_Implementation_Guide.md).*
