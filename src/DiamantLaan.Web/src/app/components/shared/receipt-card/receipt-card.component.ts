import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { blokLabel } from '../../../utils/afrikaans.util';

export interface ReceiptData {
  purchaseId: number;
  purchaseDate: string;
  buyerName: string;
  squareCount: number;
  squareIds: number[];
  amountPerBlock: number;
  amount: number;
  payFastPaymentId?: string | null;
}

@Component({
  selector: 'app-receipt-card',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="receipt-card">
    <h1>Kwitansie</h1>
    <p class="subtitle">Diamant Laan Teerprojek</p>

    <dl class="receipt-details">
      <div>
        <dt>Aankoop #</dt>
        <dd>{{ data.purchaseId }}</dd>
      </div>
      <div>
        <dt>Datum</dt>
        <dd>{{ data.purchaseDate | date:'dd MMM yyyy HH:mm' }}</dd>
      </div>
      <div>
        <dt>Koper</dt>
        <dd>{{ data.buyerName }}</dd>
      </div>
      <div>
        <dt>Aantal</dt>
        <dd>{{ data.squareCount }} {{ blokLabel(data.squareCount) }}</dd>
      </div>
      <div>
        <dt>Blok ID's</dt>
        <dd>{{ data.squareIds.join(', ') }}</dd>
      </div>
      <div>
        <dt>Bedrag per blok</dt>
        <dd>R{{ data.amountPerBlock | number:'1.0-0' }}</dd>
      </div>
      <div>
        <dt>Totaal bedrag</dt>
        <dd><strong>R{{ data.amount | number:'1.0-0' }}</strong></dd>
      </div>
      <div>
        <dt>Betalingstatus</dt>
        <dd>Bevestig</dd>
      </div>
      @if (data.payFastPaymentId) {
        <div>
          <dt>PayFast verwysing</dt>
          <dd>{{ data.payFastPaymentId }}</dd>
        </div>
      }
    </dl>

    <p class="footer">Dankie vir jou bydrae aan Diamant Laan.</p>
  </div>
  `,
  styles: [`
    .receipt-card {
      background: #ffffff;
      border: 2px solid var(--color-border, #ddd);
      border-radius: 8px;
      padding: 2.5rem 2rem;
      width: 600px;
      color: #1a1a1a;
      font-family: var(--font-body, Georgia, serif);
    }
    h1 {
      font-family: var(--font-heading, Georgia, serif);
      font-size: 1.75rem;
      text-align: center;
      margin: 0 0 0.25rem;
      color: #1a1a1a;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin: 0 0 1.5rem;
      font-size: 0.9375rem;
    }
    .receipt-details {
      display: grid;
      gap: 0.75rem;
      margin: 0;
    }
    .receipt-details > div {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 0.5rem;
      border-bottom: 1px solid #eee;
      padding-bottom: 0.5rem;
    }
    dt {
      font-weight: 600;
      font-size: 0.8125rem;
      color: #666;
      margin: 0;
    }
    dd {
      margin: 0;
      font-size: 0.875rem;
      color: #1a1a1a;
      word-break: break-word;
    }
    .footer {
      margin: 1.5rem 0 0;
      text-align: center;
      font-size: 0.8125rem;
      color: #666;
    }
  `]
})
export class ReceiptCardComponent {
  @Input({ required: true }) data!: ReceiptData;

  readonly blokLabel = blokLabel;
}
