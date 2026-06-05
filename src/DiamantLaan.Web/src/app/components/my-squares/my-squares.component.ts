import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { PurchaseService } from '../../services/purchase.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-my-squares',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
    <div class="container">
      <h2>My Blokke</h2>
      @if (squares.length === 0) {
        <p class="empty">Jy het nog geen blokke gekoop nie.</p>
      } @else {
        <p>{{ squares.length }} blokke gekoop — R{{ squares.length * 500 | number:'1.0-0' }} totaal</p>
        <div class="grid">
          @for (sq of squares; track sq.id) {
            <div class="sq-card">
              <strong>#{{ sq.id }}</strong>
              <app-status-badge [status]="sq.status"></app-status-badge>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1rem; max-width: 800px; }
    h2 { margin-bottom: 0.5rem; }
    .empty { color: var(--color-text-muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .sq-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `]
})
export class MySquaresComponent implements OnInit {
  private purchase = inject(PurchaseService);
  squares: { id: number; status: SquareStatus }[] = [];

  ngOnInit() {
    this.purchase.getMySquares().subscribe(s => this.squares = s);
  }
}
