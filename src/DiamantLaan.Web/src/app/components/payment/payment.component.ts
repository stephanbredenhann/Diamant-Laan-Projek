import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { ShareButtonComponent } from '../shared/share-button/share-button.component';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ShareButtonComponent],
  template: `
    <div class="container">
      <div class="gateway-card">
        @if (!submitted) {
          <h2>Betaling</h2>
          <p class="summary">
            {{ squareIds.length }} blokke gekies —
            <strong>R{{ totalAmount | number:'1.0-0' }}</strong>
            @if (amountPerBlock > 500) {
              <span class="per-block">(R{{ amountPerBlock | number:'1.0-0' }} per blok)</span>
            }
          </p>

          <div class="gateway-box">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            <p class="gateway-text">Stripe / PayFast hier</p>
            <p class="gateway-hint">Betaling word in die toekoms geïntegreer.</p>
          </div>

          @if (error) {
            <div class="error-alert">{{ error }}</div>
          }

          <div class="actions">
            <a routerLink="/kaart" class="btn btn-outline">Terug</a>
            <button class="btn btn-primary" (click)="submitPayment()" [disabled]="loading">
              {{ loading ? 'Besig...' : 'Volgende' }}
              @if (!loading) { <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> }
            </button>
          </div>
        } @else {
          <div class="success-card">
            <div class="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2>Betaling Suksesvol!</h2>
            <p class="success-detail">
              {{ successCount }} blokke gekoop vir <strong>R{{ successAmount | number:'1.0-0' }}</strong>
            </p>
            <app-share-button
              class="success-share"
              label="Deel my bydrae"
              [url]="siteUrl"
              [text]="shareText"
            />
            <a routerLink="/my-blokke" class="btn btn-primary btn-wide">
              Gaan na My Blokke
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
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

    .success-card { text-align: center; }
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
    .success-detail {
      font-size: 0.9375rem;
      color: var(--color-muted);
      margin-bottom: 2rem;
    }
    .success-detail strong { color: var(--color-terracotta); }
    .success-share { display: block; margin-bottom: 1.25rem; }
    .btn-wide { min-width: 220px; }

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
  amountPerBlock = 500;
  totalAmount = 0;
  loading = false;
  error = '';
  submitted = false;
  successCount = 0;
  successAmount = 0;
  siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  get shareText(): string {
    return `Ek het ${this.successCount} blokke geborg op Diamant Laan!`;
  }

  ngOnInit() {
    const ids = this.purchase.pendingSquareIds;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      this.squareIds = ids;
      this.amountPerBlock = this.purchase.pendingAmountPerBlock || 500;
      this.totalAmount = this.squareIds.length * this.amountPerBlock;
    } else {
      this.router.navigate(['/kaart']);
    }
  }

  submitPayment() {
    if (this.squareIds.length === 0) return;
    this.error = '';
    this.loading = true;
    this.purchase.createPurchase(this.squareIds, this.totalAmount).subscribe({
      next: (res) => {
        this.successCount = res.squareCount;
        this.successAmount = res.amount;
        this.submitted = true;
        this.loading = false;
        this.purchase.pendingSquareIds = [];
        this.purchase.pendingAmountPerBlock = 500;
      },
      error: (err) => {
        this.error = err.error?.message || 'Betaling het misluk.';
        this.loading = false;
      }
    });
  }
}
