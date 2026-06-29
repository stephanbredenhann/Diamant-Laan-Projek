import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { getSquareCentroid } from '../shared/road-map/coordinate-config';

@Component({
  selector: 'app-my-squares',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="container">
      <div class="page-header">
        <h2>My Blokke</h2>
        @if (squares.length > 0) {
          <p class="summary">{{ squares.length }} blokke gekoop — <strong>R{{ squares.length * 500 | number:'1.0-0' }}</strong> totaal</p>
        }
      </div>
      @if (squares.length === 0) {
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <h3>Nog geen blokke gekoop nie</h3>
          <p>Gaan na die kaart om jou eerste vierkante meter te borg.</p>
          <a routerLink="/kaart" class="btn btn-primary">Sien Kaart & Koop</a>
        </div>
      } @else {
        <div class="grid">
          @for (sq of squares; track sq.id) {
            <div class="sq-card">
              <div class="sq-info">
                <span class="sq-id">Blok #{{ sq.id }}</span>
                <app-status-badge [status]="sq.status"></app-status-badge>
              </div>
              <div class="sq-progress">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getProgressPercent(sq.status)"></div>
                </div>
              </div>
              @if (getCoords(sq.id); as coords) {
                <p class="sq-coords">
                  Koördinate (benaderd): {{ coords.lat | number:'1.4-4' }}°, {{ coords.lng | number:'1.4-4' }}°
                </p>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { padding: 2.5rem 1.5rem 4rem; max-width: 900px; }
    .page-header { margin-bottom: 2rem; }
    .page-header h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
      margin-bottom: 0.375rem;
    }
    .summary {
      font-size: 0.9375rem;
      color: var(--color-muted);
    }
    .summary strong { color: var(--color-terracotta); }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius);
      color: var(--color-muted);
    }
    .empty-state svg { stroke: var(--color-sand); margin-bottom: 1rem; }
    .empty-state h3 {
      font-family: var(--font-heading);
      font-size: 1.125rem;
      color: var(--color-text);
      margin-bottom: 0.375rem;
    }
    .empty-state p { font-size: 0.875rem; margin-bottom: 1.25rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .sq-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .sq-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }
    .sq-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.625rem;
    }
    .sq-id {
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--color-text);
    }
    .sq-progress { margin-top: 0.25rem; }
    .progress-bar {
      height: 4px;
      background: var(--color-sand-light);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-olive);
      border-radius: 2px;
      transition: width 0.4s ease;
    }
    .sq-coords {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin-top: 0.5rem;
      font-family: monospace;
    }
    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MySquaresComponent implements OnInit {
  private purchase = inject(PurchaseService);
  squares: { id: number; status: SquareStatus }[] = [];

  ngOnInit() {
    this.purchase.getMySquares().subscribe(s => this.squares = s);
  }

  getProgressPercent(status: SquareStatus): number {
    const map: Record<SquareStatus, number> = {
      [SquareStatus.NogNieBeginNie]: 0,
      [SquareStatus.Voorberei]: 33,
      [SquareStatus.BesigOmTeTeer]: 66,
      [SquareStatus.KlaarGeteer]: 100,
    };
    return map[status] ?? 0;
  }

  getCoords(id: number) {
    return getSquareCentroid(id);
  }
}
