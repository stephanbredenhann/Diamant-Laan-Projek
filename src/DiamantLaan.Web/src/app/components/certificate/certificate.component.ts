import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService } from '../../services/purchase.service';
import { getSquareCentroid } from '../shared/road-map/coordinate-config';

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div class="cert-page">
        <div class="cert-card">
          <div class="demo-watermark">DEMO</div>
          <h1>Eiendomssertifikaat</h1>
          <p class="subtitle">Diamant Laan Teerprojek</p>

          @if (ownerName) {
            <p class="owner">Hierby word bevestig dat</p>
            <p class="owner-name">{{ ownerName }}</p>
            <p class="owner">die volgende blokke op Diamant Laan geborg het:</p>

            <ul class="block-list">
              @for (sq of squares; track sq.id) {
                <li>
                  <strong>Blok #{{ sq.id }}</strong>
                  @if (getCoords(sq.id); as coords) {
                    <span class="coords">— {{ coords.lat | number:'1.4-4' }}°, {{ coords.lng | number:'1.4-4' }}°</span>
                  }
                </li>
              }
            </ul>

            <p class="disclaimer">Hierdie is 'n demonstrasiesertifikaat. Die finale ontwerp volg later.</p>
          } @else {
            <p class="empty">Geen blokke gevind nie.</p>
          }
        </div>

        <div class="actions">
          <a routerLink="/my-blokke" class="btn btn-outline">Terug na My Blokke</a>
          @if (squares.length > 0) {
            <button type="button" class="btn btn-primary" (click)="print()">Druk / Stoor as PDF</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; max-width: 800px; }
    .cert-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .cert-card {
      position: relative;
      overflow: hidden;
      background: var(--color-surface);
      border: 3px double var(--color-border);
      border-radius: var(--radius);
      padding: 3rem 2.5rem;
      box-shadow: var(--shadow-lg);
      text-align: center;
    }
    .demo-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-family: var(--font-heading);
      font-size: 5rem;
      font-weight: 700;
      color: rgba(198, 123, 92, 0.12);
      pointer-events: none;
      user-select: none;
    }
    h1 {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      color: var(--color-text);
      margin-bottom: 0.25rem;
    }
    .subtitle {
      color: var(--color-muted);
      font-size: 0.9375rem;
      margin-bottom: 2rem;
    }
    .owner { color: var(--color-muted); font-size: 0.9375rem; }
    .owner-name {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-terracotta);
      margin: 0.5rem 0 1.5rem;
    }
    .block-list {
      list-style: none;
      text-align: left;
      max-width: 420px;
      margin: 0 auto 1.5rem;
      padding: 0;
    }
    .block-list li {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;
    }
    .coords {
      font-family: monospace;
      color: var(--color-muted);
      font-size: 0.8125rem;
    }
    .disclaimer {
      font-size: 0.75rem;
      color: var(--color-muted-light);
      font-style: italic;
    }
    .empty { color: var(--color-muted); }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    @media print {
      .actions { display: none; }
      .cert-card { box-shadow: none; border-width: 2px; }
    }
  `]
})
export class CertificateComponent implements OnInit {
  private auth = inject(AuthService);
  private purchase = inject(PurchaseService);

  ownerName = '';
  squares: { id: number; status: number }[] = [];

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.ownerName = `${user.firstName} ${user.lastName}`.trim();
    }
    this.purchase.getMySquares().subscribe(s => {
      this.squares = s.sort((a, b) => a.id - b.id);
    });
  }

  getCoords(id: number) {
    return getSquareCentroid(id);
  }

  print() {
    window.print();
  }
}
