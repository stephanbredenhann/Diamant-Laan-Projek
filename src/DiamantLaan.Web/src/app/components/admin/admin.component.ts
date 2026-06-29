import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { RoadMapComponent } from '../shared/road-map/road-map.component';

const STATUS_OPTIONS: SquareStatus[] = [SquareStatus.Voorberei, SquareStatus.BesigOmTeTeer, SquareStatus.KlaarGeteer];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RoadMapComponent],
  template: `
    <div class="container">
      <div class="page-header">
        <h2>Admin Paneel</h2>
      </div>
      <div class="admin-tabs">
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Kaart</a>
        <a routerLink="/admin/stats" routerLinkActive="active">Statistieke</a>
        <a routerLink="/admin/gebruikers" routerLinkActive="active">Gebruikers</a>
        <a routerLink="/admin/telefoon-aankoop" routerLinkActive="active">Telefoniese Aankoop</a>
      </div>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ stats.progress }}<small>%</small></div>
          <div class="stat-label">Gefinansier</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">R{{ stats.totalRaised | number:'1.0-0' }}</div>
          <div class="stat-label">Ingesamel</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ selectedIds().size }}</div>
          <div class="stat-label">Gekies</div>
        </div>
      </div>
      <div class="controls">
        @if (selectedIds().size > 0) {
          <select [(ngModel)]="targetStatus" (change)="updateStatus()">
            <option [ngValue]="null">Stel in as...</option>
            @for (s of STATUS_OPTIONS; track s) {
              <option [ngValue]="s">{{ STATUS_LABELS[s] }}</option>
            }
          </select>
        }
        <button class="btn btn-outline btn-sm" (click)="clearSelection()">
          Maak Keuses Skoon ({{ selectedIds().size }})
        </button>
      </div>
      @if (message) {
        <div class="msg" [class.error]="isError">{{ message }}</div>
      }
      <div class="legend">
        <span><span class="dot free"></span> Beskikbaar</span>
        <span><span class="dot sold"></span> Verkoop</span>
        <span><span class="dot prep"></span> Voorberei</span>
        <span><span class="dot busy"></span> Besig om te teer</span>
        <span><span class="dot done"></span> Klaar geteer</span>
      </div>
      <app-road-map
        [squares]="squares"
        [selectedIds]="selectedIdsArray()"
        (squareClicked)="toggleById($event)"
        (squaresRangeSelected)="selectRange($event)"
      />
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; }
    .page-header { margin-bottom: 1.5rem; }
    .page-header h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
    }
    .stats-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .stat-card {
      flex: 1;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      text-align: center;
      box-shadow: var(--shadow-sm);
    }
    .stat-value {
      font-family: var(--font-heading);
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .stat-value small {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-muted);
    }
    .stat-label {
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 0.125rem;
    }
    .controls {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .controls select {
      width: auto;
      min-width: 200px;
    }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    .msg {
      font-size: 0.8125rem;
      padding: 0.625rem 1rem;
      border-radius: var(--radius-sm);
      background: #E8ECD8;
      color: #5A6A32;
      margin-bottom: 1rem;
    }
    .msg.error {
      background: #FEF2F2;
      color: #DC2626;
    }
    .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
    .admin-tabs a {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      color: var(--color-muted);
      text-decoration: none;
      font-size: 0.875rem;
    }
    .admin-tabs a.active {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-weight: 600;
    }
    .legend { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--color-muted); margin-bottom: 0.75rem; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    .dot.free { background: #D4C4A8; }
    .dot.sold { background: #C67B5C; }
    .dot.prep { background: #B5651D; }
    .dot.busy { background: #8B7355; }
    .dot.done { background: #6B7B3C; }
    @media (max-width: 640px) {
      .stats-row { flex-direction: column; }
    }
  `]
})
export class AdminComponent implements OnInit {
  private admin = inject(AdminService);
  private road = inject(RoadService);

  squares: Square[] = [];
  stats = { progress: 0, totalRaised: 0 };
  selectedIds = signal<Set<number>>(new Set());
  targetStatus: SquareStatus | null = null;
  message = '';
  isError = false;
  STATUS_LABELS = STATUS_LABELS;
  STATUS_OPTIONS = STATUS_OPTIONS;

  ngOnInit() {
    this.refresh();
  }

  selectedIdsArray(): number[] {
    return Array.from(this.selectedIds());
  }

  toggleById(sqId: number) {
    const sq = this.squares.find(s => s.id === sqId);
    if (!sq) return;
    this.toggle(sq);
  }

  toggle(sq: Square) {
    const selected = new Set(this.selectedIds());
    selected.has(sq.id) ? selected.delete(sq.id) : selected.add(sq.id);
    this.selectedIds.set(selected);
  }

  clearSelection() { this.selectedIds.set(new Set()); this.message = ''; }

  selectRange(ids: number[]) {
    const selected = new Set(this.selectedIds());
    for (const id of ids) selected.add(id);
    this.selectedIds.set(selected);
  }

  updateStatus() {
    this.message = ''; this.isError = false;
    if (!this.targetStatus || this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.admin.updateStatus(ids, this.targetStatus).subscribe({
      next: () => {
        this.message = `${ids.length} blokke opgedateer.`;
        this.targetStatus = null;
        this.refresh();
        this.clearSelection();
      },
      error: (err) => {
        this.message = err.error?.message || 'Opdatering het misluk.';
        this.isError = true;
      }
    });
  }

  private refresh() {
    this.admin.getStats().subscribe({
      next: s => this.stats = s,
      error: () => {
        this.message = 'Kon nie statistieke laai nie.';
        this.isError = true;
      }
    });
    this.road.getSquares().subscribe(s => this.squares = s);
  }
}
