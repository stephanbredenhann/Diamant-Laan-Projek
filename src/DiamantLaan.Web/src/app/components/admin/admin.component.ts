import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { RoadMapComponent } from '../shared/road-map/road-map.component';

const STATUS_OPTIONS: SquareStatus[] = [SquareStatus.Voorberei, SquareStatus.BesigOmTeTeer, SquareStatus.KlaarGeteer];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RoadMapComponent],
  template: `
    <div class="container">
      <h2>Admin Paneel</h2>
      <div class="stats-bar">
        <div class="stat"><strong>Progress:</strong> {{ stats.progress }}%</div>
        <div class="stat"><strong>Ingesamel:</strong> R{{ stats.totalRaised | number:'1.0-0' }}</div>
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
        <p class="msg" [class.error]="isError">{{ message }}</p>
      }
      <div class="legend">
        <span><span class="dot" style="background:#d1d5db"></span> Beskikbaar</span>
        <span><span class="dot" style="background:#fb923c"></span> Verkoop</span>
        <span><span class="dot" style="background:#fbbf24"></span> Voorberei</span>
        <span><span class="dot" style="background:#3b82f6"></span> Besig om te teer</span>
        <span><span class="dot" style="background:#22c55e"></span> Klaar geteer</span>
      </div>
      <app-road-map
        [squares]="squares"
        [selectedIds]="selectedIdsArray()"
        (squareClicked)="toggleById($event)"
      />
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1rem; }
    h2 { margin-bottom: 0.5rem; }
    .stats-bar { display: flex; gap: 2rem; margin-bottom: 1rem; font-size: 0.875rem; }
    .controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .controls select { width: auto; min-width: 180px; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .msg { font-size: 0.8125rem; margin-bottom: 0.5rem; color: var(--color-success); }
    .msg.error { color: #ef4444; }
    .legend { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; margin-bottom: 1rem; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 3px; vertical-align: middle; }
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
