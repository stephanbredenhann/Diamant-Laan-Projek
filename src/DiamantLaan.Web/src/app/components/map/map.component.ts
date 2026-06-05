import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RoadService } from '../../services/road.service';
import { PurchaseService } from '../../services/purchase.service';
import { AuthService } from '../../services/auth.service';
import { Square, SquareStatus } from '../../models/square';
import { SEGMENTS } from './map-segments';
import { RoadMapComponent } from '../shared/road-map/road-map.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [RoadMapComponent],
  template: `
    <div class="container map-page">
      <div class="map-header">
        <h2>Diamant Laan — Kies jou blokke</h2>
        <div class="legend">
          <span><span class="dot" style="background:#d1d5db"></span> Beskikbaar</span>
          <span><span class="dot" style="background:#fb923c"></span> Verkoop</span>
          <span><span class="dot" style="background:#fbbf24"></span> Voorberei</span>
          <span><span class="dot" style="background:#3b82f6"></span> Besig om te teer</span>
          <span><span class="dot" style="background:#22c55e"></span> Klaar geteer</span>
        </div>
      </div>
      <div class="map-layout">
        <app-road-map
          [squares]="squares"
          [selectedIds]="selectedIdsArray()"
          (squareClicked)="toggleSquare($event)"
          (squaresRangeSelected)="selectRange($event)"
        />
        <div class="sidebar">
          <div class="sidebar-inner">
            <h3>Gekies</h3>
            <p>{{ selectedIds().size }} blokke</p>
            <p class="total">Totaal: R{{ selectedIds().size * 500 }}</p>
            @if (selectedIds().size > 0) {
              <button class="btn btn-primary" (click)="checkout()">
                Gaan na Betaling
              </button>
            }
            @if (message) {
              <p class="msg" [class.error]="isError">{{ message }}</p>
            }
            <div class="saved-purchases">
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
    .map-page { padding: 1rem 0; }
    .map-header { margin-bottom: 1rem; }
    .map-header h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .legend { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 3px; vertical-align: middle; }
    .map-layout { display: flex; gap: 1rem; align-items: flex-start; }
    .map-layout app-road-map { flex: 1; min-width: 0; }
    .sidebar { width: 240px; flex-shrink: 0; }
    .sidebar-inner { border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; position: sticky; top: 1rem; }
    .sidebar-inner h3 { margin-bottom: 0.25rem; }
    .sidebar-inner h4 { margin-top: 1rem; margin-bottom: 0.25rem; font-size: 0.8125rem; }
    .total { font-weight: 700; color: var(--color-primary); margin-bottom: 0.75rem; }
    .msg { font-size: 0.75rem; margin-top: 0.5rem; color: var(--color-success); }
    .msg.error { color: #ef4444; }
    .empty { font-size: 0.75rem; color: var(--color-text-muted); }
    .owned-chip { display: inline-block; background: var(--color-primary-light); color: var(--color-primary); font-size: 0.6875rem; padding: 0.125rem 0.375rem; border-radius: 4px; margin: 2px; }
    @media (max-width: 768px) {
      .map-layout { flex-direction: column; }
      .sidebar { width: 100%; }
    }
  `]
})
export class MapComponent implements OnInit {
  private road = inject(RoadService);
  private purchase = inject(PurchaseService);
  private auth = inject(AuthService);
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

  checkout() {
    if (this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.purchase.createPurchase(ids).subscribe({
      next: (res) => {
        this.message = `${res.squareCount} blokke gekoop vir R${res.amount}!`;
        this.selectedIds.set(new Set());
        this.purchase.getMySquares().subscribe(s => this.mySquareIds.set(s.map(x => x.id)));
        this.road.getSquares().subscribe(data => this.squares = data);
      },
      error: (err) => {
        this.message = err.error?.message || 'Kon nie koop nie.';
        this.isError = true;
      }
    });
  }
}
