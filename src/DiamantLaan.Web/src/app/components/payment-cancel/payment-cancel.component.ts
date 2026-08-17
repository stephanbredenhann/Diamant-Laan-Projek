import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [RouterLink, TPipe],
  template: `
    <div class="container">
      <div class="gateway-card auth-card">
        @if (loading) {
          <div class="spinner"></div>
          <p class="eyebrow">{{ 'Betaling' | t }}</p>
          <h2 class="display auth-title">{{ 'Besig om te kanselleer' | t }}</h2>
          <p class="summary">{{ 'Ons stel jou blokkies weer beskikbaar...' | t }}</p>
        } @else if (error) {
          <p class="eyebrow">{{ 'Betaling' | t }}</p>
          <h2 class="display auth-title">{{ 'Kon nie kanselleer nie' | t }}</h2>
          <p class="summary">{{ error | t }}</p>
          <div class="actions">
            <a routerLink="/bou" class="btn btn-outline">{{ 'Begin weer' | t }}</a>
            <button class="btn btn-primary" (click)="retryCancel()">{{ 'Probeer weer' | t }}</button>
          </div>
        } @else {
          <p class="eyebrow">{{ 'Betaling' | t }}</p>
          <h2 class="display auth-title">{{ 'Betaling gekanselleer' | t }}</h2>
          <p class="summary">{{ 'Jy het die betaling gekanselleer. Jou blokkies is weer beskikbaar.' | t }}</p>
          <a routerLink="/bou" class="btn btn-primary btn-wide">{{ 'Probeer weer' | t }}</a>
        }
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem; }
    .gateway-card {
      max-width: 460px;
      margin: 2rem auto;
      text-align: center;
    }
    .auth-title {
      font-size: clamp(2.25rem, 5vw, 3rem);
      margin: 0.35rem 0 0.75rem;
    }
    .summary {
      font-size: var(--fs-lg);
      color: var(--text-muted);
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
      border-top-color: var(--action);
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
      // Nothing to cancel — a stray visit. Drop any half-finished build state and
      // send them home rather than onto the raw map.
      this.purchase.clearBouVloei();
      this.router.navigate(['/']);
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
    // A guest has no session to authorise the cancel with, so their token stands in for one.
    const guestRef = this.purchase.guestPurchase;
    const request = guestRef && guestRef.purchaseId === this.purchaseId
      ? this.purchase.cancelGuestPurchase(guestRef)
      : this.purchase.cancelPurchase(this.purchaseId!);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.error = '';
        this.purchase.clearBouVloei();
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
