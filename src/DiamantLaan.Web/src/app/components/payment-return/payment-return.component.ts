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
            <h2>Wag op betalingsbevestiging</h2>
            <p class="summary">Ons wag vir PayFast om die betaling te bevestig. Moenie hierdie bladsy toemaak nie.</p>
          }
          @case ('success') {
            <div class="success-card">
              <h2>Betaling Suksesvol!</h2>
              <p class="summary">Jou aankoop is bevestig.</p>
              <a routerLink="/my-blokke" class="btn btn-primary btn-wide">Gaan na My Blokke</a>
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
    .gateway-card { max-width: 460px; margin: 2rem auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 2.5rem 2rem; box-shadow: var(--shadow); text-align: center; }
    h2 { font-family: var(--font-heading); font-size: 1.5rem; color: var(--color-text); margin-bottom: 0.75rem; }
    .summary { font-size: 0.9375rem; color: var(--color-muted); margin-bottom: 1.75rem; }
    .btn-wide { min-width: 220px; }
  `]
})
export class PaymentReturnComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchase = inject(PurchaseService);

  state: 'pending' | 'success' | 'failed' = 'pending';
  private sub?: Subscription;

  ngOnInit() {
    const purchaseId = Number(this.route.snapshot.queryParamMap.get('purchaseId'));
    if (!purchaseId) {
      this.router.navigate(['/kaart']);
      return;
    }

    this.sub = interval(2000)
      .pipe(takeWhile(() => this.state === 'pending'))
      .subscribe(() => this.checkStatus(purchaseId));

    this.checkStatus(purchaseId);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private checkStatus(purchaseId: number) {
    this.purchase.getPurchase(purchaseId).subscribe({
      next: (p) => {
        if (p.paymentStatus === 'Confirmed') {
          this.state = 'success';
          this.purchase.pendingSquareIds = [];
          this.purchase.pendingAmountPerBlock = 500;
        } else if (p.paymentStatus === 'Failed' || p.paymentStatus === 'Cancelled') {
          this.state = 'failed';
        }
      },
      error: () => {
        this.state = 'failed';
      }
    });
  }
}
