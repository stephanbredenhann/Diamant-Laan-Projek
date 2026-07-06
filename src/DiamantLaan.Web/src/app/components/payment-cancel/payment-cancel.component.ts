import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="gateway-card">
        <h2>Betaling gekanselleer</h2>
        <p class="summary">Jy het die betaling gekanselleer. Jou blokkies is weer beskikbaar.</p>
        <a routerLink="/kaart" class="btn btn-primary btn-wide">Terug na kaart</a>
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
export class PaymentCancelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchase = inject(PurchaseService);

  ngOnInit() {
    const purchaseId = Number(this.route.snapshot.queryParamMap.get('purchaseId'));
    if (purchaseId) {
      this.purchase.cancelPurchase(purchaseId).subscribe({
        next: () => {
          this.purchase.pendingSquareIds = [];
          this.purchase.pendingAmountPerBlock = 500;
        },
        error: () => {
          this.purchase.pendingSquareIds = [];
          this.purchase.pendingAmountPerBlock = 500;
        }
      });
    } else {
      this.router.navigate(['/kaart']);
    }
  }
}
