# SonarQube Setup and Payment Service Flow

## Setting up SonarQube via Docker

We have modified the `docker-compose.yml` to include a SonarQube container inside the observability stack. Here are the steps to launch and use it for your backend microservices:

1. **Start the SonarQube Container**
   Navigate to the root directory where `docker-compose.yml` is located and run:
   ```bash
   docker-compose up -d sonarqube
   ```
   *Note: This will also pull the `sonarqube:9.9.5-community` image if it is not already available.*

2. **Access SonarQube Dashboard**
   Once the container is running and healthy (it might take a minute or two to start), open your browser and navigate to:
   **http://localhost:9010**
   
   Log in with the default credentials:
   - **Username:** `admin`
   - **Password:** `admin`
   
   *(You will be prompted to change this password on the first login).*

3. **Generate a Security Token (Required after changing password)**
   It is highly recommended (and sometimes strictly enforced) to use a Token instead of your plaintext password to run an analysis.
   - Go to your profile at the top right of the SonarQube dashboard -> **My Account**.
   - Navigate to the **Security** tab.
   - Under "Generate Tokens", enter a name (e.g., `local-analysis-token`), select `Global Analysis Token`, and click **Generate**.
   - **Copy this token immediately** and save it somewhere safe; you won't be able to see it again!

4. **Running Code Analysis on a Backend Service**
   Spring Boot projects using Maven come with the SonarQube plugin configured by default in recent versions. We have also added the basic properties into each service's `pom.xml` so it knows where the SonarQube server is running. To scan a service (e.g., `paymentService`, `claimService`, etc.):
   
   Open your terminal, navigate directly to the service folder (`cd <service-folder-name>`), and execute the Maven goal using the **Token** you generated:
   ```bash
   mvn clean verify sonar:sonar \
     -Dsonar.projectKey=<service-name> \
     -Dsonar.projectName="<Service Name>" \
     -Dsonar.login=<your_generated_token_here>
   ```
   *(Replace `<service-name>` with the name of the service like `paymentService` or `adminService`. Note that when using a token, you only use `-Dsonar.login` and you DO NOT pass `-Dsonar.password`)*
   
   After the build and scan finish, refresh the SonarQube dashboard at http://localhost:9010 to view your code quality, bugs, vulnerabilities, and code smell metrics. Ensure your service's tests are executed during the `verify` phase to also get code coverage statistics (using Jacoco, if configured).

---

## Payment Flow Trace (Purchase Event)

Here is the step-by-step breakdown of how the Payment Service handles the flow when a user clicks the "Purchase" button in the frontend platform:

### 1. Estimating the Premium (Frontend to PolicyService)
Before hitting "Purchase," the user usually passes through a calculation step. The frontend (`purchase.ts`) triggers `calculatePreview()`, making a call to `PolicyService` to retrieve an `estimatedPremium` based on the selected coverage and age. 

### 2. Initiating the Order (Frontend to PaymentService)
When the user clicks the "Confirm Purchase" button (`confirmPurchase()` method):
- The frontend `PaymentService` sends a `RazorpayOrderRequest` payload (containing the policy ID and final amount) to the backend `PaymentController` via `/api/payments/create-order`.
- The backend `PaymentService` communicates securely with the Razorpay API to generate a unique `razorpay_order_id`. This ID is returned to the frontend.

### 3. Client-Side Checkout (Razorpay UI Modal)
- With the `razorpay_order_id`, the frontend launches the **Razorpay Checkout** modal (`paymentService.openRazorpayCheckout`).
- The user inputs their payment details (Cards, UPI, NetBanking, etc.) within this secure Razorpay-provided pop-up.
- Upon successful capture of funds by Razorpay, the modal closes and passes a payload back to the frontend containing `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.

### 4. Background Signature Verification (Frontend to PaymentService)
- Automatically, the frontend forwards these Razorpay credentials to the backend endpoint `/api/payments/verify`.
- The backend `PaymentService` recalculates the HMAC hex signature using its secret key and compares it against the `razorpay_signature` to prevent tampering or fraud.
- If the signature matches, the backend updates the `Payment` database record entity to `COMPLETED` and returns a success `PaymentResult`.

### 5. Policy Activation (Frontend to PolicyService)
- After the payment step successfully yields a "SUCCESS" result, the frontend triggers `doPurchasePolicy()`.
- A request is sent to `PolicyService` at `/api/policies/purchase` with the actual policy parameters (nominee, start date, coverage amount).
- The `PolicyService` validates the payload, establishes the active policy for the customer in the database, and returns the activated policy details.
- Finally, the frontend shows a Success message to the user, displaying their new transaction ID and confirming the policy activation.
