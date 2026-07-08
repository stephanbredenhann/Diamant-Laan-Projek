import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoadService } from '../../../services/road.service';
import { Square } from '../../../models/square';
import { RoadMapComponent } from '../road-map/road-map.component';
import { SEGMENTS } from '../../map/map-segments';
import { blokLabel } from '../../../utils/afrikaans.util';

@Component({
  selector: 'app-block-picker-modal',
  standalone: true,
  imports: [FormsModule, RoadMapComponent],
  template: `
    <div class="picker-backdrop" (click)="cancel()" role="presentation">
      <div
        class="picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-picker-title"
        (click)="$event.stopPropagation()"
      >
        <div class="picker-header">
          <h3 id="block-picker-title">Kies blokke op die kaart</h3>
          <p class="picker-hint">Beskikbaarheid-aansig — soek of klik/sleep om blokke te kies.</p>
        </div>

        <div class="picker-search">
          <input
            #searchInput
            type="number"
            class="search-input"
            min="1"
            [max]="maxBlockId"
            placeholder="Bloknommer"
            [(ngModel)]="searchBlockNumber"
            (keydown.enter)="searchBlock()"
          />
          <button type="button" class="btn btn-outline btn-sm" (click)="searchBlock()">Soek</button>
        </div>
        @if (searchError()) {
          <p class="search-error">{{ searchError() }}</p>
        }

        <div class="picker-map">
          <app-road-map
            [squares]="squares"
            [selectedIds]="selectedIdsArray()"
            [viewMode]="'availability'"
            (squareClicked)="toggleSquare($event)"
            (squaresRangeSelected)="selectRange($event)"
          />
        </div>

        <div class="picker-footer">
          <span class="selection-count">{{ selectedIds().size }} {{ blokLabel(selectedIds().size) }} gekies</span>
          <div class="picker-actions">
            <button type="button" class="btn btn-outline btn-sm" (click)="cancel()">Kanselleer</button>
            <button type="button" class="btn btn-primary btn-sm" (click)="confirm()">
              Bevestig keuse ({{ selectedIds().size }})
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .picker-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(61, 43, 31, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 1100;
    }
    .picker-dialog {
      width: min(100%, 960px);
      max-height: calc(100vh - 2rem);
      background: var(--color-surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .picker-header {
      padding: 1.25rem 1.5rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }
    .picker-header h3 {
      font-family: var(--font-heading);
      font-size: 1.125rem;
      color: var(--color-text);
      margin: 0 0 0.25rem;
    }
    .picker-hint {
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin: 0;
    }
    .picker-search {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      align-items: center;
    }
    .search-input {
      flex: 1;
      max-width: 200px;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }
    .search-error {
      padding: 0 1.5rem 0.5rem;
      font-size: 0.8125rem;
      color: #DC2626;
      margin: 0;
    }
    .picker-map {
      flex: 1;
      min-height: 360px;
      padding: 0 1.5rem;
      overflow: hidden;
    }
    .picker-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border);
    }
    .selection-count {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text);
    }
    .picker-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    @media (max-width: 640px) {
      .picker-dialog { max-height: 100vh; border-radius: 0; width: 100%; }
      .picker-map { min-height: 280px; }
      .picker-footer { flex-direction: column; align-items: stretch; }
      .picker-actions { width: 100%; }
      .picker-actions .btn { flex: 1; }
    }
  `]
})
export class BlockPickerModalComponent implements OnInit {
  private road = inject(RoadService);

  initialIds = input<number[]>([]);
  confirmed = output<number[]>();
  cancelled = output<void>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild(RoadMapComponent) roadMap?: RoadMapComponent;

  squares: Square[] = [];
  selectedIds = signal<Set<number>>(new Set());
  searchBlockNumber: number | null = null;
  searchError = signal<string | null>(null);
  readonly blokLabel = blokLabel;
  readonly maxBlockId = SEGMENTS[SEGMENTS.length - 1].endId;

  selectedIdsArray(): number[] {
    return Array.from(this.selectedIds());
  }

  ngOnInit() {
    this.selectedIds.set(new Set(this.initialIds()));
    this.road.getSquares().subscribe(s => this.squares = s);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.cancel();
  }

  toggleSquare(sqId: number) {
    const sq = this.squares.find(s => s.id === sqId);
    if (!sq || sq.isSold) return;
    if (sqId > this.maxBlockId) return;

    const selected = new Set(this.selectedIds());
    if (selected.has(sqId)) selected.delete(sqId);
    else selected.add(sqId);
    this.selectedIds.set(selected);
  }

  selectRange(ids: number[]) {
    const selected = new Set(this.selectedIds());
    for (const id of ids) {
      const sq = this.squares.find(s => s.id === id);
      if (sq && !sq.isSold && id <= this.maxBlockId) selected.add(id);
    }
    this.selectedIds.set(selected);
  }

  searchBlock() {
    this.searchError.set(null);
    const id = Math.floor(Number(this.searchBlockNumber));
    if (!Number.isFinite(id) || id < 1 || id > this.maxBlockId) {
      this.searchError.set("Voer 'n geldige bloknommer in.");
      setTimeout(() => this.searchInput?.nativeElement.focus());
      return;
    }

    const sq = this.squares.find(s => s.id === id);
    this.roadMap?.focusSquare(id, { showTooltip: true });

    if (sq?.isSold) {
      this.searchError.set('Hierdie blok is reeds toegeken.');
      return;
    }

    const selected = new Set(this.selectedIds());
    selected.add(id);
    this.selectedIds.set(selected);
  }

  confirm() {
    this.confirmed.emit(Array.from(this.selectedIds()).sort((a, b) => a - b));
  }

  cancel() {
    this.cancelled.emit();
  }
}
