import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-payment-return',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="gateway-card">
        @switch (state) {
          @case ('pending') {
            <div class="spinner"></div>
            <h2>Wag op betalingsbevestiging</h2>
            <p class="summary">Ons wag vir PayFast om die betaling te bevestig. Moenie hierdie bladsy toemaak nie.</p>
            @if (attempts > 1) {
              <p class="attempts">Kontroleer besig... (poging {{ attempts }}/{{ maxAttempts }})</p>
            }
            @if (isLocalhost) {
              <button class="btn btn-outline btn-wide" (click)="simulateItn()" [disabled]="simulating">
                {{ simulating ? 'Besig...' : 'Simuleer PayFast bevestiging (slegs ontwikkeling)' }}
              </button>
            }
          }
          @case ('success') {
            <div class="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2>Betaling Suksesvol!</h2>
            <p class="summary">Jou aankoop is bevestig.</p>
            <a routerLink="/my-blokke" class="btn btn-primary btn-wide">Gaan na My Blokke</a>
          }
          @case ('timeout') {
            <h2>Bevestiging neem langer as gewoonlik</h2>
            <p class="summary">Ons kon nie die betalingstatus betyds bevestig nie. Indien jou betaling deurgegaan het, sal dit binnekort opgedateer word. Kyk gerus by <strong>My Blokke</strong>.</p>
            <div class="actions">
              <a routerLink="/kaart" class="btn btn-outline">Terug na kaart</a>
              <a routerLink="/my-blokke" class="btn btn-primary">Gaan na My Blokke</a>
            </div>
          }
          @case ('failed') {
            <h2>Betaling het misluk</h2>
            <p class="summary">Die betaling is nie voltooi nie. Probeer asseblief weer.</p>
            <a routerLink="/kaart" class="btn btn-primary btn-wide">Terug na kaart</a>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem; }
    .gateway-card {
      max-width: 460px;
      margin: 2rem auto;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 2.5rem 2rem;
      box-shadow: var(--shadow);
      text-align: center;
    }
    h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
      margin-bottom: 0.75rem;
    }
    .summary {
      font-size: 0.9375rem;
      color: var(--color-muted);
      margin-bottom: 1.75rem;
    }
    .summary strong { color: var(--color-terracotta); }
    .attempts {
      font-size: 0.75rem;
      color: var(--color-muted-light);
      margin-top: -1rem;
      margin-bottom: 1.5rem;
    }
    .btn-wide { min-width: 220px; }
    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .actions .btn { flex: 1; min-width: 160px; }
    .btn-primary,
    a.btn-primary {
      color: #fff;
    }
    .btn-primary:hover:not(:disabled),
    a.btn-primary:hover {
      color: #fff;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-terracotta);
      border-radius: 50%;
      margin: 0 auto 1.25rem;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #E8ECD8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .success-icon svg { stroke: var(--color-olive); }
    @media (max-width: 480px) {
      .gateway-card { padding: 1.5rem 1.25rem; }
      .actions { flex-direction: column; }
      .actions .btn { width: 100%; }
    }
  `]
})
export class PaymentReturnComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchase = inject(PurchaseService);

  state: 'pending' | 'success' | 'failed' | 'timeout' = 'pending';
  attempts = 0;
  maxAttempts = 30;
  simulating = false;
  isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  private consecutiveErrors = 0;
  private sub?: Subscription;
  private purchaseId = 0;

  ngOnInit() {
    this.purchaseId = Number(this.route.snapshot.queryParamMap.get('purchaseId'));
    if (!this.purchaseId) {
      this.router.navigate(['/kaart']);
      return;
    }

    this.sub = interval(2000)
      .pipe(takeWhile(() => this.state === 'pending'))
      .subscribe(() => this.checkStatus(this.purchaseId));

    this.checkStatus(this.purchaseId);
  }

  simulateItn() {
    this.simulating = true;
    this.purchase.simulateItn(this.purchaseId).subscribe({
      next: () => this.checkStatus(this.purchaseId),
      error: () => {
        this.simulating = false;
        this.state = 'failed';
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private checkStatus(purchaseId: number) {
    this.attempts++;
    this.purchase.getPurchase(purchaseId).subscribe({
      next: (p) => {
        this.consecutiveErrors = 0;
        if (p.paymentStatus === 'Confirmed') {
          this.state = 'success';
          this.purchase.pendingSquareIds = [];
        } else if (p.paymentStatus === 'Failed' || p.paymentStatus === 'Cancelled') {
          this.state = 'failed';
        } else if (this.attempts >= this.maxAttempts) {
          this.state = 'timeout';
        }
      },
      error: () => {
        this.consecutiveErrors++;
        // Only fail immediately after 5 consecutive errors
        if (this.consecutiveErrors >= 5) {
          this.state = 'failed';
        } else if (this.attempts >= this.maxAttempts) {
          this.state = 'timeout';
        }
      }
    });
  }
}
