import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';


const STATUS_OPTIONS: SquareStatus[] = [SquareStatus.Voorberei, SquareStatus.BesigOmTeTeer, SquareStatus.KlaarGeteer];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h2>Admin Paneel</h2>
      <div class="stats-bar">
        <div class="stat"><strong>Progress:</strong> {{ stats.progress }}%</div>
        <div class="stat"><strong>Ingesamel:</strong> R{{ stats.totalRaised | number:'1.0-0' }}</div>
      </div>
      <div class="controls">
        <select [(ngModel)]="filterStatus">
          <option value="">Alle statusse</option>
          <option value="0">Nog nie begin nie</option>
          <option value="1">Voorberei</option>
          <option value="2">Besig om te teer</option>
          <option value="3">Klaar geteer</option>
        </select>
        @if (selectedIds().size > 0) {
          <select [(ngModel)]="targetStatus" (change)="updateStatus()">
            <option value="">Stel in as...</option>
            @for (s of STATUS_OPTIONS; track s) {
              <option [value]="s">{{ STATUS_LABELS[s] }}</option>
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
      <div class="square-grid">
        @for (sq of filteredSquares(); track sq.id) {
          <div
            class="sq"
            [class.selected]="selectedIds().has(sq.id)"
            [style.background]="colorMap[sq.status]"
            [title]="'#' + sq.id + ' \u2014 ' + STATUS_LABELS[sq.status]"
            (click)="toggle(sq)"
          ></div>
        }
      </div>
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
    .square-grid {
      display: grid;
      grid-template-columns: repeat(50, minmax(0, 1fr));
      gap: 1px;
      border: 1px solid var(--color-border);
      background: #e5e7eb;
      max-height: 70vh;
      overflow-y: auto;
    }
    .sq {
      aspect-ratio: 1;
      cursor: pointer;
      transition: transform 0.1s;
    }
    .sq:hover { transform: scale(1.3); z-index: 1; }
    .sq.selected { outline: 2px solid #f97316; outline-offset: -1px; }
    @media (max-width: 480px) {
      .square-grid { grid-template-columns: repeat(25, minmax(0, 1fr)); }
    }
  `]
})
export class AdminComponent implements OnInit {
  private admin = inject(AdminService);
  private road = inject(RoadService);

  squares: Square[] = [];
  stats = { progress: 0, totalRaised: 0 };
  selectedIds = signal<Set<number>>(new Set());
  filterStatus = '';
  targetStatus: SquareStatus | null = null;
  message = '';
  isError = false;
  colorMap: Record<number, string> = { 0: '#d1d5db', 1: '#fbbf24', 2: '#3b82f6', 3: '#22c55e' };
  STATUS_LABELS = STATUS_LABELS;
  STATUS_OPTIONS = STATUS_OPTIONS;

  ngOnInit() {
    this.refresh();
  }

  filteredSquares() {
    if (this.filterStatus === '') return this.squares;
    return this.squares.filter(s => s.status === parseInt(this.filterStatus));
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
    this.admin.getStats().subscribe(s => this.stats = s);
    this.road.getSquares().subscribe(s => this.squares = s);
  }
}
