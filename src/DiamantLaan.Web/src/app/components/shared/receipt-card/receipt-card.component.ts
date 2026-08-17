import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { meterFrase, randBedrag } from '../../../utils/afrikaans.util';
import { TPipe } from '../../../i18n/t.pipe';

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
  imports: [CommonModule, TPipe],
  template: `
  <div class="receipt-sheet">
    <header class="kop">
      <img class="ob-logo" src="ob-logo.png" alt="Orania Beweging" />
      <h1>{{ 'Kwitansie' | t }}</h1>
      <p class="subtitle">{{ 'Oewerpad teerprojek' | t }}</p>
      <span class="reël" aria-hidden="true"></span>
    </header>

    <dl class="receipt-details">
      <div>
        <dt>{{ 'Aankoop #' | t }}</dt>
        <dd>{{ data.purchaseId }}</dd>
      </div>
      <div>
        <dt>{{ 'Datum' | t }}</dt>
        <dd>{{ data.purchaseDate | date:'dd MMM yyyy HH:mm' }}</dd>
      </div>
      <div>
        <dt>{{ 'Koper' | t }}</dt>
        <dd>{{ data.buyerName }}</dd>
      </div>
      <div>
        <dt>{{ 'Aantal' | t }}</dt>
        <dd>{{ meterFrase(data.squareCount) }}</dd>
      </div>
      <div>
        <dt>{{ 'Bloknommer(s)' | t }}</dt>
        <dd>{{ data.squareIds.join(', ') }}</dd>
      </div>
      <div>
        <dt>{{ 'Bedrag per m²' | t }}</dt>
        <dd>{{ randBedrag(data.amountPerBlock) }}</dd>
      </div>
      @if (data.payFastPaymentId) {
        <div>
          <dt>{{ 'PayFast verwysing' | t }}</dt>
          <dd>{{ data.payFastPaymentId }}</dd>
        </div>
      }
    </dl>

    <div class="totaal-blok">
      <div class="totaal-ry">
        <span class="totaal-etiket">{{ 'Totale bedrag' | t }}</span>
        <span class="totaal-waarde">{{ randBedrag(data.amount) }}</span>
      </div>
      <p class="status">{{ 'Betaling bevestig' | t }}</p>
    </div>

    <!-- Pushes the footer to the foot of the A4 sheet however short the detail list is. -->
    <div class="vul" aria-hidden="true"></div>

    <footer class="voet">
      <p class="dankie">{{ 'Dankie vir jou bydrae' | t }}</p>
      <p class="fyn">Orania Beweging &middot; inligting&#64;orania.co.za &middot; 053 207 0062</p>
    </footer>
  </div>
  `,
  styles: [`
    /* A4 at 96dpi, the same sheet the certificate exports on, so html2canvas
       fills the PDF page edge to edge instead of letterboxing a 600px card. */
    .receipt-sheet {
      width: 794px;
      height: 1123px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: 64px 72px 56px;
      background: #FFFFFF;
      color: var(--ink, #1A1A1A);
      font-family: var(--font-body, 'Source Sans 3', sans-serif);
    }

    .kop { text-align: center; }
    .ob-logo {
      height: 88px;
      width: auto;
      object-fit: contain;
      margin: 0 auto 28px;
      display: block;
    }
    h1 {
      font-family: var(--font-display, 'Barlow Condensed', sans-serif);
      font-weight: 700;
      font-size: 56px;
      line-height: 1;
      letter-spacing: 0.01em;
      margin: 0 0 6px;
      color: var(--tar, #19120E);
    }
    .subtitle {
      font-family: var(--font-display, 'Barlow Condensed', sans-serif);
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--text-muted, #55606E);
      margin: 0;
    }
    .reël {
      display: block;
      width: 72px;
      height: 4px;
      margin: 22px auto 0;
      background: var(--action, #F58220);
    }

    .receipt-details {
      display: grid;
      gap: 0;
      margin: 44px 0 0;
    }
    .receipt-details > div {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid var(--border-soft, #D8D2C6);
      align-items: baseline;
    }
    dt {
      font-family: var(--font-display, 'Barlow Condensed', sans-serif);
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted, #55606E);
      margin: 0;
    }
    dd {
      margin: 0;
      font-size: 19px;
      line-height: 1.45;
      color: var(--ink, #1A1A1A);
      word-break: break-word;
      font-variant-numeric: tabular-nums;
    }

    /* The one number anyone checks twice, so it leaves the list and gets the
       dark panel the site uses for its own headline figures. */
    .totaal-blok {
      margin-top: 32px;
      background: var(--tar, #19120E);
      color: #FFFFFF;
      padding: 24px 28px;
    }
    .totaal-ry {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 20px;
    }
    .totaal-etiket {
      font-family: var(--font-display, 'Barlow Condensed', sans-serif);
      font-size: 17px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.72);
    }
    .totaal-waarde {
      font-family: var(--font-display, 'Barlow Condensed', sans-serif);
      font-size: 44px;
      font-weight: 800;
      line-height: 1;
      color: var(--action, #F58220);
      font-variant-numeric: tabular-nums;
    }
    .status {
      margin: 14px 0 0;
      font-size: 15px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.72);
    }

    .vul { flex: 1; }

    .voet {
      text-align: center;
      border-top: 1px solid var(--border-soft, #D8D2C6);
      padding-top: 24px;
    }
    .dankie {
      font-family: var(--font-display, 'Barlow Condensed', sans-serif);
      font-size: 26px;
      font-weight: 700;
      margin: 0 0 8px;
      color: var(--tar, #19120E);
    }
    .fyn {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted, #55606E);
    }
  `]
})
export class ReceiptCardComponent {
  @Input({ required: true }) data!: ReceiptData;

  readonly meterFrase = meterFrase;
  readonly randBedrag = randBedrag;
}
