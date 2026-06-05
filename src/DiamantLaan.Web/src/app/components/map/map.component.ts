import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RoadService } from '../../services/road.service';
import { PurchaseService } from '../../services/purchase.service';
import { AuthService } from '../../services/auth.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { SEGMENTS } from './map-segments';
import { RoadMapComponent } from '../shared/road-map/road-map.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [RoadMapComponent, RouterLink],
  template: `
    <div class="map-page">
      <div class="map-header">
        <div class="container">
          <h2>Diamant Laan — Kies jou blokke</h2>
          <div class="legend">
            <span><span class="dot free"></span> Beskikbaar</span>
            <span><span class="dot sold"></span> Verkoop</span>
            <span><span class="dot prep"></span> Voorberei</span>
            <span><span class="dot busy"></span> Besig om te teer</span>
            <span><span class="dot done"></span> Klaar geteer</span>
          </div>
        </div>
      </div>
      <div class="container map-layout">
        <app-road-map
          [squares]="squares"
          [selectedIds]="selectedIdsArray()"
          (squareClicked)="toggleSquare($event)"
          (squaresRangeSelected)="selectRange($event)"
        />
        <div class="sidebar">
          <div class="sidebar-card">
            <h3>Jou Keuse</h3>
            <div class="selection-summary">
              <div class="selection-count">
                <span class="count">{{ selectedIds().size }}</span>
                <span class="label">blokke gekies</span>
              </div>
              <div class="selection-total">
                <span class="label">Totaal</span>
                <span class="amount">R{{ selectedIds().size * 500 }}</span>
              </div>
            </div>
            @if (selectedIds().size > 0) {
              <button class="btn btn-outline btn-full btn-sm" (click)="clearSelection()">
                Maak Keuses Skoon ({{ selectedIds().size }})
              </button>
              <button class="btn btn-primary btn-full" (click)="checkout()">
                Gaan na Betaling
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            }
            @if (message) {
              <div class="msg" [class.error]="isError">{{ message }}</div>
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
    .legend { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--color-muted); }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    .dot.free { background: #D4C4A8; }
    .dot.sold { background: #C67B5C; }
    .dot.prep { background: #B5651D; }
    .dot.busy { background: #8B7355; }
    .dot.done { background: #6B7B3C; }
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
  mySquareIds = signal<number[]>([]);
  message = '';
  isError = false;

  ngOnInit() {
    this.road.getSquares().subscribe(data => this.squares = data);
    if (this.auth.currentUser()) {
      this.purchase.getMySquares().subscribe(s => this.mySquareIds.set(s.map(x => x.id)));
    }
  }

  selectedIdsArray(): number[] {
    return Array.from(this.selectedIds());
  }

  toggleSquare(sqId: number) {
    if (!this.auth.currentUser()) {
      this.router.navigate(['/meld-aan']);
      return;
    }
    const sq = this.squares.find(s => s.id === sqId);
    if (!sq) return;
    if (sq.isSold) return;
    if (sq.status !== SquareStatus.NogNieBeginNie) return;
    if (sqId > this.segments[this.segments.length - 1].endId) return;

    const selected = new Set(this.selectedIds());
    if (selected.has(sqId)) {
      selected.delete(sqId);
    } else {
      selected.add(sqId);
    }
    this.selectedIds.set(selected);
    this.message = '';
    this.isError = false;
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
      if (sq.status !== SquareStatus.NogNieBeginNie) continue;
      if (id > this.segments[this.segments.length - 1].endId) continue;
      selected.add(id);
    }
    this.selectedIds.set(selected);
    this.message = '';
    this.isError = false;
  }

  clearSelection() {
    this.selectedIds.set(new Set());
    this.message = '';
  }

  checkout() {
    if (this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.purchase.pendingSquareIds = ids;
    this.router.navigate(['/betaal']);
  }
}
