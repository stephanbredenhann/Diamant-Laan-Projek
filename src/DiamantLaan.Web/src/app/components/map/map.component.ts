import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoadService } from '../../services/road.service';
import { PurchaseService } from '../../services/purchase.service';
import { AuthService } from '../../services/auth.service';
import { Square, SquareStatus } from '../../models/square';
import { SEGMENTS, SegmentDef } from './map-segments';

const STATUS_COLORS: Record<number, string> = {
  0: '#d1d5db', 1: '#fbbf24', 2: '#3b82f6', 3: '#22c55e'
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container map-page">
      <div class="map-header">
        <h2>Diamant Laan — Kies jou blokke</h2>
        <div class="legend">
          <span><span class="dot" style="background:#d1d5db"></span> Nog nie begin nie</span>
          <span><span class="dot" style="background:#fbbf24"></span> Voorberei</span>
          <span><span class="dot" style="background:#3b82f6"></span> Besig om te teer</span>
          <span><span class="dot" style="background:#22c55e"></span> Klaar geteer</span>
        </div>
      </div>
      <div class="map-layout">
        <div class="svg-container">
          <svg viewBox="0 0 500 620" class="road-map-svg">
            @for (seg of segments; track seg.name) {
              @for (row of range(seg.rows); track row) {
                @for (col of range(seg.cols); track col) {
                  @let sqId = seg.startId + col * seg.rows + row;
                  @if (sqId <= seg.endId) {
                    @let sx = seg.x + col * seg.cellW;
                    @let sy = seg.y + row * seg.cellH;
                    <rect
                      [attr.x]="sx" [attr.y]="sy"
                      [attr.width]="seg.cellW - 0.5" [attr.height]="seg.cellH - 0.5"
                      [attr.fill]="getColor(sqId)"
                      [attr.stroke]="selectedIds().has(sqId) ? '#f97316' : 'rgba(0,0,0,0.08)'"
                      [attr.stroke-width]="selectedIds().has(sqId) ? 2 : 0.5"
                      [attr.rx]="1"
                      style="cursor:pointer"
                      (click)="toggleSquare(sqId)"
                      (mouseenter)="hoveredId = sqId"
                      (mouseleave)="hoveredId = null">
                      <title>Blok #{{ sqId }}</title>
                    </rect>
                  }
                }
              }
            }
          </svg>
        </div>
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
    .map-layout { display: flex; gap: 1rem; }
    .svg-container { flex: 1; min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; background: #fafafa; }
    .road-map-svg { width: 100%; height: auto; display: block; }
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
  hoveredId: number | null = null;

  ngOnInit() {
    this.road.getSquares().subscribe(data => this.squares = data);
    if (this.auth.currentUser()) {
      this.purchase.getMySquares().subscribe(s => this.mySquareIds.set(s.map(x => x.id)));
    }
  }

  getColor(squareId: number): string {
    const sq = this.squares.find(s => s.id === squareId);
    return sq ? STATUS_COLORS[sq.status] : STATUS_COLORS[0];
  }

  toggleSquare(sqId: number) {
    if (!this.auth.currentUser()) {
      this.router.navigate(['/meld-aan']);
      return;
    }
    const sq = this.squares.find(s => s.id === sqId);
    if (sq && sq.status !== SquareStatus.NogNieBeginNie) return;
    if (sqId > this.segments[this.segments.length-1].endId) return;

    const selected = new Set(this.selectedIds());
    if (selected.has(sqId)) {
      selected.delete(sqId);
    } else {
      selected.add(sqId);
    }
    this.selectedIds.set(selected);
    this.message = '';
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

  range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
