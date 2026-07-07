import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RoadService } from '../../services/road.service';
import { PurchaseService } from '../../services/purchase.service';
import { AuthService } from '../../services/auth.service';
import { Square, MapViewMode } from '../../models/square';
import { SEGMENTS } from './map-segments';
import { RoadMapComponent } from '../shared/road-map/road-map.component';
import { blokLabel } from '../../utils/afrikaans.util';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [RoadMapComponent, RouterLink, DecimalPipe],
  template: `
    <div class="map-page">
      <div class="map-header">
        <div class="container">
          <h2>Diamant Laan — Kies jou blokke</h2>
          <div class="view-toggle">
            <button
              type="button"
              [class.active]="viewMode() === 'status'"
              (click)="viewMode.set('status')"
            >Vordering</button>
            <button
              type="button"
              [class.active]="viewMode() === 'availability'"
              (click)="viewMode.set('availability')"
            >Beskikbaarheid</button>
          </div>
          <div class="legend">
            @if (viewMode() === 'status') {
              <span><span class="dot free"></span> Nog nie begin nie</span>
              <span><span class="dot prep"></span> Voorberei</span>
              <span><span class="dot busy"></span> Besig om te teer</span>
              <span><span class="dot done"></span> Klaar geteer</span>
              <span><span class="dot selected"></span> Gekies</span>
            } @else {
              <span><span class="dot free"></span> Beskikbaar</span>
              <span><span class="dot sold"></span> Verkoop</span>
              <span><span class="dot selected"></span> Gekies</span>
            }
          </div>
        </div>
      </div>
      <div class="container map-layout">
        <app-road-map
          [squares]="squares"
          [selectedIds]="selectedIdsArray()"
          [viewMode]="viewMode()"
          (squareClicked)="toggleSquare($event)"
          (squaresRangeSelected)="selectRange($event)"
        />
        <div class="sidebar">
          <div class="sidebar-card">
            <h3>Jou Keuse</h3>
            <div class="selection-summary">
              <div class="selection-count">
                <span class="count">{{ selectedIds().size }}</span>
                <span class="label">{{ blokLabel(selectedIds().size) }} gekies</span>
              </div>
              <div class="selection-total">
                <span class="label">Totaal</span>
                <span class="amount">R{{ totalAmount() | number:'1.0-0' }}</span>
              </div>
            </div>
            @if (selectedIds().size > 0) {
              <div class="amount-input">
                <label for="amountPerBlock">Bedrag per blok (min R500)</label>
                <input
                  id="amountPerBlock"
                  type="number"
                  min="500"
                  step="50"
                  [value]="amountPerBlock()"
                  (input)="onAmountChange($event)"
                />
                <p class="amount-hint">Betaal meer as R500 per blok indien jy wil.</p>
              </div>
              <button class="btn btn-outline btn-full btn-sm" (click)="clearSelection()">
                Maak Keuses Skoon ({{ selectedIds().size }})
              </button>
              <button class="btn btn-primary btn-full" (click)="checkout()">
                Gaan na Betaling
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            }
            @if (!auth.currentUser()) {
              <div class="login-nudge">
                <p><a routerLink="/meld-aan">Meld aan</a> om blokke te kies</p>
              </div>
            }
            <div class="my-squares-mini">
              <h4>My Blokke</h4>
              @if (mySquareIds().length === 0) {
                <p class="empty">Nog geen blokke gekoop nie.</p>
              }
              @for (id of mySquareIds(); track id) {
                <span class="owned-chip">#{{ id }}</span>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-page { padding-bottom: 2rem; }
    .map-header {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 1rem 0;
      margin-bottom: 1rem;
    }
    .map-header h2 {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      color: var(--color-text);
      margin-bottom: 0.5rem;
    }
    .view-toggle {
      display: inline-flex;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      margin-bottom: 0.625rem;
    }
    .view-toggle button {
      padding: 0.5rem 1.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      border: none;
      border-radius: 0;
      background: var(--color-surface);
      color: var(--color-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .view-toggle button + button {
      border-left: 1px solid var(--color-border);
    }
    .view-toggle button.active {
      background: var(--color-terracotta);
      color: #fff;
    }
    .legend { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--color-muted); }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    .dot.free { background: #D4C4A8; }
    .dot.sold { background: #C67B5C; }
    .dot.prep { background: #B5651D; }
    .dot.busy { background: #8B7355; }
    .dot.done { background: #6B7B3C; }
    .dot.selected { background: #F5A623; border: 2px solid #3D2B1F; box-sizing: border-box; }
    .map-layout { display: flex; gap: 1.25rem; align-items: flex-start; }
    .map-layout app-road-map { flex: 1; min-width: 0; }
    .sidebar { width: 260px; flex-shrink: 0; }
    .sidebar-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 4rem;
    }
    .sidebar-card h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      color: var(--color-text);
      margin-bottom: 1rem;
    }
    .sidebar-card h4 {
      font-family: var(--font-heading);
      font-size: 0.8125rem;
      color: var(--color-text);
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .selection-summary {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .selection-count, .selection-total {
      flex: 1;
      background: var(--color-cream);
      border-radius: var(--radius-sm);
      padding: 0.625rem 0.75rem;
      text-align: center;
    }
    .count {
      display: block;
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.1;
    }
    .amount {
      display: block;
      font-family: var(--font-heading);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-terracotta);
      line-height: 1.1;
    }
    .label {
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .amount-input {
      margin-bottom: 1rem;
    }
    .amount-input label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.375rem;
    }
    .amount-input input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }
    .amount-hint {
      font-size: 0.6875rem;
      color: var(--color-muted);
      margin-top: 0.375rem;
    }
    .btn-full { width: 100%; margin-bottom: 0.5rem; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    .msg {
      font-size: 0.8125rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-sm);
      background: #E8ECD8;
      color: #5A6A32;
      margin-top: 0.75rem;
    }
    .msg.error {
      background: #FEF2F2;
      color: #DC2626;
    }
    .login-nudge {
      text-align: center;
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }
    .login-nudge a { font-weight: 600; }
    .empty { font-size: 0.75rem; color: var(--color-muted); }
    .owned-chip {
      display: inline-block;
      background: var(--color-cream);
      color: var(--color-terracotta);
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      margin: 2px;
    }
    @media (max-width: 768px) {
      .map-layout { flex-direction: column; }
      .sidebar { width: 100%; }
      .sidebar-card { position: static; }
    }
  `]
})
export class MapComponent implements OnInit {
  private road = inject(RoadService);
  private purchase = inject(PurchaseService);
  auth = inject(AuthService);
  private router = inject(Router);

  segments = SEGMENTS;
  squares: Square[] = [];
  selectedIds = signal<Set<number>>(new Set());
  amountPerBlock = signal(500);
  mySquareIds = signal<number[]>([]);
  viewMode = signal<MapViewMode>('status');
  readonly blokLabel = blokLabel;

  totalAmount = computed(() => this.selectedIds().size * this.amountPerBlock());
  selectedIdsArray = computed(() => Array.from(this.selectedIds()));

  ngOnInit() {
    this.road.getSquares().subscribe(data => this.squares = data);
    if (this.auth.currentUser()) {
      this.purchase.getMySquares().subscribe(s => this.mySquareIds.set(s.map(x => x.id)));
    }
  }

  toggleSquare(sqId: number) {
    if (!this.auth.currentUser()) {
      this.router.navigate(['/meld-aan']);
      return;
    }
    const sq = this.squares.find(s => s.id === sqId);
    if (!sq) return;
    if (sq.isSold) return;
    if (sqId > this.segments[this.segments.length - 1].endId) return;

    const selected = new Set(this.selectedIds());
    if (selected.has(sqId)) {
      selected.delete(sqId);
    } else {
      selected.add(sqId);
    }
    this.selectedIds.set(selected);
  }

  selectRange(ids: number[]) {
    if (!this.auth.currentUser()) {
      this.router.navigate(['/meld-aan']);
      return;
    }
    const selected = new Set(this.selectedIds());
    for (const id of ids) {
      const sq = this.squares.find(s => s.id === id);
      if (!sq) continue;
      if (sq.isSold) continue;
      if (id > this.segments[this.segments.length - 1].endId) continue;
      selected.add(id);
    }
    this.selectedIds.set(selected);
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  onAmountChange(event: Event) {
    const val = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(val) || val < 500) {
      this.amountPerBlock.set(500);
    } else {
      this.amountPerBlock.set(val);
    }
  }

  checkout() {
    if (this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.purchase.pendingSquareIds = ids;
    this.purchase.pendingAmountPerBlock = this.amountPerBlock();
    this.router.navigate(['/betaal']);
  }
}
