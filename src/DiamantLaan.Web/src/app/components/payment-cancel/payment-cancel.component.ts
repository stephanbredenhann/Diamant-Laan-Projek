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
        @if (loading) {
          <div class="spinner"></div>
          <h2>Besig om te kanselleer</h2>
          <p class="summary">Ons stel jou blokkies weer beskikbaar...</p>
        } @else if (error) {
          <h2>Kon nie kanselleer nie</h2>
          <p class="summary">{{ error }}</p>
          <div class="actions">
            <a routerLink="/kaart" class="btn btn-outline">Terug na kaart</a>
            <button class="btn btn-primary" (click)="retryCancel()">Probeer weer</button>
          </div>
        } @else {
          <h2>Betaling gekanselleer</h2>
          <p class="summary">Jy het die betaling gekanselleer. Jou blokkies is weer beskikbaar.</p>
          <a routerLink="/kaart" class="btn btn-primary btn-wide">Terug na kaart</a>
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
    .btn-wide { min-width: 220px; }
    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .actions .btn { flex: 1; min-width: 160px; }
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
    @media (max-width: 480px) {
      .gateway-card { padding: 1.5rem 1.25rem; }
      .actions { flex-direction: column; }
      .actions .btn { width: 100%; }
    }
  `]
})
export class PaymentCancelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchase = inject(PurchaseService);

  loading = true;
  error = '';
  private purchaseId?: number;

  ngOnInit() {
    this.purchaseId = Number(this.route.snapshot.queryParamMap.get('purchaseId'));
    if (!this.purchaseId) {
      this.router.navigate(['/kaart']);
      return;
    }
    this.doCancel();
  }

  retryCancel() {
    this.error = '';
    this.loading = true;
    this.doCancel();
  }

  private doCancel() {
    this.purchase.cancelPurchase(this.purchaseId!).subscribe({
      next: () => {
        this.loading = false;
        this.error = '';
        this.purchase.pendingSquareIds = [];
        this.purchase.pendingAmountPerBlock = 500;
      },
      error: (err) => {
        this.loading = false;
        // Show a friendly error message but preserve pending state so retry works
        const status = err.status;
        if (status === 404) {
          this.error = 'Die aankoop kon nie gevind word nie. Dit is moontlik reeds verwerk.';
        } else if (status === 400) {
          this.error = err.error?.message || 'Die aankoop kon nie gekanselleer word nie.';
        } else {
          this.error = 'Kon nie die aankoop kanselleer nie. Probeer asseblief weer.';
        }
      }
    });
  }
}
