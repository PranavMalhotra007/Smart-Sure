import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── DTOs ───────────────────────────────────────────────────────────────────

export interface RazorpayOrderRequest {
  policyId?: number;
  premiumId?: number;
  claimId?: number;
  amount: number;
  paymentFor: 'POLICY_PURCHASE' | 'PREMIUM_PAYMENT' | 'CLAIM';
}

export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  currency: string;
  amount: number;       // in paise
  keyId: string;
  policyId?: number;
  premiumId?: number;
  claimId?: number;
  paymentFor: string;
}

export interface RazorpayVerifyRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  policyId?: number;
  premiumId?: number;
  claimId?: number;
  amount: number;
  paymentFor: string;
}

export interface PaymentResult {
  transactionId: string;
  policyId?: number;
  premiumId?: number;
  claimId?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: 'SUCCESS' | 'FAILED';
  message: string;
  paymentFor?: string;
}

declare var Razorpay: any;

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private paymentsApi = environment.paymentsApi;

  constructor(private http: HttpClient) {}

  // ── API calls ──────────────────────────────────────────────────────────────

  createOrder(req: RazorpayOrderRequest): Observable<RazorpayOrderResponse> {
    return this.http.post<RazorpayOrderResponse>(`${this.paymentsApi}/create-order`, req);
  }

  verifyPayment(req: RazorpayVerifyRequest): Observable<PaymentResult> {
    return this.http.post<PaymentResult>(`${this.paymentsApi}/verify`, req);
  }

  getPaymentByTransactionId(transactionId: string): Observable<any> {
    return this.http.get<any>(`${this.paymentsApi}/transaction/${transactionId}`);
  }

  healthCheck(): Observable<string> {
    return this.http.get<string>(`${this.paymentsApi}/health-check`, { responseType: 'text' as 'json' });
  }

  // Lock to prevent multiple concurrent checkout modals
  private isCheckoutOpen = false;

  // ── High-level helper ──────────────────────────────────────────────────────
  /**
   * Opens the Razorpay checkout modal.
   * Returns a Promise resolving to PaymentResult (SUCCESS or FAILED).
   */
  openRazorpayCheckout(
    orderResponse: RazorpayOrderResponse,
    verifyBase: Omit<RazorpayVerifyRequest, 'razorpayOrderId' | 'razorpayPaymentId' | 'razorpaySignature'>,
    prefill?: { name?: string; email?: string; contact?: string }
  ): Promise<PaymentResult> {
    return new Promise((resolve) => {
      if (this.isCheckoutOpen) {
        return resolve({
          transactionId: '',
          status: 'FAILED',
          message: 'A payment gateway is already open. Please close it before initiating a new one.',
          paymentFor: orderResponse.paymentFor
        });
      }

      this.isCheckoutOpen = true;
      let paymentHandled = false;

      const finishAndResolve = (result: PaymentResult) => {
        this.isCheckoutOpen = false;
        resolve(result);
      };

      const options = {
        key: orderResponse.keyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'SmartSure Insurance',
        description: this.getDescription(orderResponse.paymentFor),
        order_id: orderResponse.razorpayOrderId,
        prefill: prefill || {},
        theme: { color: '#00b4d8' },
        modal: {
          ondismiss: () => {
            if (!paymentHandled) {
              paymentHandled = true;
              finishAndResolve({
                transactionId: '',
                status: 'FAILED',
                message: 'Payment cancelled by user.',
                paymentFor: orderResponse.paymentFor
              });
            }
          }
        },
        handler: (response: any) => {
          paymentHandled = true;
          const verifyReq: RazorpayVerifyRequest = {
            ...verifyBase,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          };
          this.verifyPayment(verifyReq).subscribe({
            next: (result) => finishAndResolve(result),
            error: () => finishAndResolve({
              transactionId: '',
              status: 'FAILED',
              message: 'Payment verification failed. Contact support.',
              paymentFor: orderResponse.paymentFor
            })
          });
        }
      };

      try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          console.warn('Payment attempt failed:', response?.error?.description);
        });
        rzp.open();
      } catch {
        if (!paymentHandled) {
          paymentHandled = true;
          finishAndResolve({
            transactionId: '',
            status: 'FAILED',
            message: 'Razorpay SDK not loaded. Please refresh the page.',
            paymentFor: orderResponse.paymentFor
          });
        }
      }
    });
  }

  private getDescription(paymentFor: string): string {
    switch (paymentFor) {
      case 'POLICY_PURCHASE': return 'Policy Purchase – SmartSure';
      case 'PREMIUM_PAYMENT': return 'Premium Payment – SmartSure';
      case 'CLAIM':           return 'Claim Settlement – SmartSure';
      default:                return 'SmartSure Payment';
    }
  }
}
