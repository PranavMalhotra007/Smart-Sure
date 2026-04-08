import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ───────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private paymentsApi = environment.paymentsApi;  // /api/payments

  constructor(private http: HttpClient) {}

  // GET /api/payments/transaction/{transactionId}  (PUBLIC)
  // Lookup a payment record by its transaction ID.
  // Returns 404 if not found.
  getPaymentByTransactionId(transactionId: string): Observable<any> {
    return this.http.get<any>(`${this.paymentsApi}/transaction/${transactionId}`);
  }

  // GET /api/payments/health-check  (PUBLIC)
  // Simple health check to confirm Payment Service is running.
  healthCheck(): Observable<string> {
    return this.http.get<string>(`${this.paymentsApi}/health-check`, {
      responseType: 'text' as 'json'
    });
  }
}
