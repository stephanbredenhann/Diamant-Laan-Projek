import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="payment-card">
        <h2>Betaling</h2>
        <div class="placeholder-box">
          <p class="big-text">Stripe / PayFast hier</p>
          <p class="small-text">Betaling word in die toekoms geintegreer.</p>
        </div>
        <div class="actions">
          <a routerLink="/my-blokke" class="btn btn-primary">Gaan na My Blokke</a>
          <a routerLink="/kaart" class="btn btn-outline">Koop Nog Blokke</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1rem; }
    .payment-card { max-width: 500px; margin: 2rem auto; text-align: center; }
    h2 { margin-bottom: 1.5rem; }
    .placeholder-box {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius);
      padding: 3rem 1rem;
      margin-bottom: 1.5rem;
      background: var(--color-surface);
    }
    .big-text { font-size: 1.25rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.5rem; }
    .small-text { font-size: 0.8125rem; color: var(--color-text-muted); }
    .actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
  `]
})
export class PaymentComponent {}
