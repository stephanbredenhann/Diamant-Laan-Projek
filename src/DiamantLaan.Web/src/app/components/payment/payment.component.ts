import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { blokLabel } from '../../utils/afrikaans.util';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="container">
      <div class="gateway-card">
        <h2>Betaling</h2>
        <p class="summary">
          {{ squareIds.length }} {{ blokLabel(squareIds.length) }} gekies —
          <strong>R{{ totalAmount | number:'1.0-0' }}</strong>
          <span class="per-block">(R500 per blok)</span>
        </p>

        <div class="gateway-box">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <p class="gateway-text">PayFast</p>
          <p class="gateway-hint">Jy sal veilig na PayFast gestuur word om die betaling te voltooi.</p>
        </div>

        @if (error) {
          <div class="error-alert">{{ error }}</div>
        }

        <div class="actions">
          <a routerLink="/kaart" class="btn btn-outline">Terug</a>
          <button class="btn btn-primary" (click)="submitPayment()" [disabled]="loading">
            @if (loading) {
              <span class="btn-spinner"></span>
              Besig
            } @else {
              Volgende
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            }
          </button>
        </div>
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
    }
    h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
      text-align: center;
      margin-bottom: 0.75rem;
    }
    .summary {
      text-align: center;
      font-size: 0.9375rem;
      color: var(--color-muted);
      margin-bottom: 1.75rem;
    }
    .summary strong { color: var(--color-terracotta); }
    .per-block { display: block; font-size: 0.8125rem; margin-top: 0.25rem; }
    .gateway-box {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius);
      padding: 2rem 1.5rem;
      margin-bottom: 1.75rem;
      background: var(--color-cream);
      text-align: center;
    }
    .gateway-box svg {
      stroke: var(--color-muted);
      margin-bottom: 0.75rem;
    }
    .gateway-text {
      font-family: var(--font-heading);
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-muted);
      margin-bottom: 0.25rem;
    }
    .gateway-hint {
      font-size: 0.8125rem;
      color: var(--color-muted-light);
    }
    .error-alert {
      background: #FEF2F2;
      color: #DC2626;
      font-size: 0.8125rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
      border: 1px solid #FECACA;
    }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .actions .btn { flex: 1; }
    .btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 480px) {
      .gateway-card { padding: 1.5rem 1.25rem; }
      .actions { flex-direction: column; }
    }
  `]
})
export class PaymentComponent implements OnInit {
  private router = inject(Router);
  private purchase = inject(PurchaseService);

  squareIds: number[] = [];
  totalAmount = 0;
  loading = false;
  error = '';
  private createdPurchaseId?: number;
  readonly blokLabel = blokLabel;

  ngOnInit() {
    const ids = this.purchase.pendingSquareIds;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      this.squareIds = ids;
      this.totalAmount = this.squareIds.length * 500;
    } else {
      this.router.navigate(['/kaart']);
    }
  }

  submitPayment() {
    if (this.loading || this.squareIds.length === 0) return;
    this.error = '';
    this.loading = true;

    if (this.createdPurchaseId) {
      this.requestPayFastForm(this.createdPurchaseId);
      return;
    }

    this.purchase.createPurchase(this.squareIds).subscribe({
      next: (res) => {
        this.createdPurchaseId = res.purchaseId;
        this.requestPayFastForm(res.purchaseId);
      },
      error: (err) => {
        this.error = err.error?.message || 'Aankoop het misluk.';
        this.loading = false;
      }
    });
  }

  private requestPayFastForm(purchaseId: number) {
    this.purchase.getPayFastForm(purchaseId).subscribe({
      next: (form) => this.postToPayFast(form),
      error: (err) => {
        this.error = err.error?.message || 'Kon nie PayFast betaling voorberei nie.';
        this.loading = false;
      }
    });
  }

  private postToPayFast(form: { actionUrl: string; fields: Record<string, string> }) {
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = form.actionUrl;
    f.style.display = 'none';

    for (const [key, value] of Object.entries(form.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      f.appendChild(input);
    }

    document.body.appendChild(f);
    f.submit();
    document.body.removeChild(f);
  }
}
