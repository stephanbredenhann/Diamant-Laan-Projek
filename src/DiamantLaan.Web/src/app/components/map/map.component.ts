import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
  imports: [RoadMapComponent, RouterLink, DecimalPipe, FormsModule],
  template: `
    <div class="map-page">
      <div class="map-header">
        <div class="container">
          <div class="map-header-controls">
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
          </div>
          <div class="map-pill-controls-group">
            <div class="auto-pick-section">
              <span class="auto-pick-label">Outomatiese keuse</span>
              <p class="auto-pick-hint">Kies hoeveel blokke jy wil hê, dan druk die knoppie.</p>
              <div class="auto-pick-panel">
                <div class="view-toggle pick-amount-toggle">
                  @for (preset of pickPresets; track preset) {
                    <button
                      type="button"
                      [class.active]="pickPreset() === preset"
                      (click)="setPreset(preset)"
                    >{{ preset }}</button>
                  }
                  <div
                    class="pick-custom-segment"
                    [class.active]="pickCustomMode()"
                    (click)="setCustomMode()"
                  >
                    @if (pickCustomMode()) {
                      <input
                        #customCountInput
                        type="number"
                        name="customCount"
                        class="pick-custom-input"
                        min="1"
                        [(ngModel)]="customCount"
                        (click)="$event.stopPropagation()"
                      />
                    } @else {
                      Eie hoeveelheid
                    }
                  </div>
                </div>
                <button
                  type="button"
                  class="pick-action-btn"
                  (click)="pickForMe()"
                  [disabled]="picking()"
                >{{ picking() ? 'Besig...' : 'Kies vir my' }}</button>
              </div>
              @if (pickError()) {
                <div class="msg error">{{ pickError() }}</div>
              }
            </div>
            <div class="search-block-section">
              <span class="auto-pick-label">Soek n spesifiek blok</span>
              <p class="auto-pick-hint">Voer die bloknommer in, dan druk Soek.</p>
              <div class="auto-pick-panel search-block-panel">
                <input
                  #searchBlockInput
                  type="number"
                  name="searchBlockNumber"
                  class="search-block-input"
                  min="1"
                  max="4200"
                  placeholder="Bloknommer"
                  [(ngModel)]="searchBlockNumber"
                  (keydown.enter)="searchBlock()"
                />
                <button
                  type="button"
                  class="pick-action-btn"
                  (click)="searchBlock()"
                >Soek</button>
              </div>
              @if (searchError()) {
                <div class="msg error">{{ searchError() }}</div>
              }
            </div>
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
                <span class="per-block">R500 per blok</span>
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
    .map-header-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .map-pill-controls-group {
      display: inline-flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
      width: fit-content;
      max-width: 100%;
      margin-bottom: 0.625rem;
    }
    .auto-pick-section,
    .search-block-section {
      margin-bottom: 0;
    }
    .auto-pick-label {
      display: block;
      font-family: var(--font-heading);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 0.25rem;
    }
    .auto-pick-hint {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin-bottom: 0.5rem;
    }
    .auto-pick-panel {
      display: flex;
      align-items: stretch;
      width: 100%;
      max-width: 100%;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      overflow: hidden;
    }
    .search-block-panel {
      min-width: 0;
    }
    .search-block-input {
      flex: 1;
      min-width: 0;
      padding: 0.5rem 1.25rem;
      margin: 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.25rem;
      outline: none;
      -moz-appearance: textfield;
    }
    .search-block-input::placeholder {
      color: var(--color-muted);
      font-weight: 600;
    }
    .search-block-input::-webkit-outer-spin-button,
    .search-block-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .auto-pick-panel .pick-amount-toggle {
      border: none;
      border-radius: 0;
    }
    .view-toggle {
      display: inline-flex;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
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
    .view-toggle button + button,
    .view-toggle button + .pick-custom-segment,
    .view-toggle .pick-custom-segment {
      border-left: 1px solid var(--color-border);
    }
    .view-toggle button.active,
    .pick-custom-segment.active {
      background: var(--ob-orange);
      color: #fff;
    }
    .view-toggle button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .pick-custom-segment {
      padding: 0.5rem 1.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      background: var(--color-surface);
      color: var(--color-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
    }
    .pick-custom-segment.active {
      padding: 0.5rem 0.75rem;
    }
    .pick-custom-input {
      width: 3.5rem;
      min-width: 3ch;
      height: 1.25rem;
      padding: 0;
      margin: 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
      background: transparent;
      color: #fff;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.25rem;
      text-align: center;
      outline: none;
      -moz-appearance: textfield;
    }
    .pick-custom-input::-webkit-outer-spin-button,
    .pick-custom-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .pick-action-btn {
      flex-shrink: 0;
      padding: 0.5rem 1.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      border: none;
      border-left: 1px solid var(--color-border);
      border-radius: 0;
      background: var(--ob-orange);
      color: #fff;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .pick-action-btn:hover:not(:disabled) {
      background: var(--color-primary-hover);
      color: #fff;
    }
    .pick-action-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .auto-pick-section .msg.error,
    .search-block-section .msg.error {
      margin-top: 0.5rem;
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
      border: 2px solid var(--ob-orange);
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
      color: var(--ob-orange);
      line-height: 1.1;
    }
    .per-block {
      display: block;
      font-size: 0.6875rem;
      color: var(--color-muted);
      margin-top: 0.25rem;
    }
    .label {
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn-full { width: 100%; margin-bottom: 0.5rem; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    .sidebar-card .btn-primary {
      color: #fff;
    }
    .sidebar-card .btn-primary:hover {
      color: #fff;
    }
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
      background: var(--ob-blue);
      color: #FFFFFF;
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      margin: 2px;
    }
    @media (max-width: 768px) {
      .map-pill-controls-group {
        width: 100%;
      }
      .auto-pick-panel {
        flex-direction: column;
        width: 100%;
        border-radius: var(--radius-sm);
      }
      .search-block-input {
        width: 100%;
        text-align: center;
        padding: 0.75rem 1rem;
      }
      .pick-amount-toggle {
        flex-wrap: wrap;
        width: 100%;
      }
      .pick-amount-toggle button,
      .pick-custom-segment {
        flex: 1 1 auto;
        min-width: 2.5rem;
        text-align: center;
      }
      .pick-action-btn {
        width: 100%;
        min-height: 44px;
        border-left: none;
        border-top: 1px solid var(--color-border);
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
      }
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

  @ViewChild('customCountInput') customCountInput?: ElementRef<HTMLInputElement>;
  @ViewChild('searchBlockInput') searchBlockInput?: ElementRef<HTMLInputElement>;
  @ViewChild(RoadMapComponent) roadMap?: RoadMapComponent;

  segments = SEGMENTS;
  squares: Square[] = [];
  selectedIds = signal<Set<number>>(new Set());
  mySquareIds = signal<number[]>([]);
  viewMode = signal<MapViewMode>('status');
  pickPreset = signal<1 | 2 | 5 | 10 | null>(null);
  pickCustomMode = signal(false);
  customCount: number | null = null;
  pickError = signal<string | null>(null);
  picking = signal(false);
  searchBlockNumber: number | null = null;
  searchError = signal<string | null>(null);
  readonly pickPresets = [1, 2, 5, 10] as const;
  private readonly maxBlockId = SEGMENTS[SEGMENTS.length - 1].endId;
  readonly blokLabel = blokLabel;

  totalAmount = computed(() => this.selectedIds().size * 500);
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

  setPreset(preset: 1 | 2 | 5 | 10) {
    this.pickPreset.set(preset);
    this.pickCustomMode.set(false);
    this.customCount = null;
    this.pickError.set(null);
  }

  setCustomMode() {
    this.pickCustomMode.set(true);
    this.pickPreset.set(null);
    this.pickError.set(null);
    setTimeout(() => this.customCountInput?.nativeElement.focus());
  }

  pickForMe() {
    if (!this.auth.currentUser()) {
      this.router.navigate(['/meld-aan']);
      return;
    }

    if (!this.pickCustomMode() && this.pickPreset() === null) {
      this.pickError.set('Kies eers hoeveel blokke jy wil hê.');
      return;
    }

    let resolvedCount: number;
    if (this.pickCustomMode()) {
      resolvedCount = Math.floor(Number(this.customCount));
      if (!Number.isFinite(resolvedCount) || resolvedCount < 1) {
        this.pickError.set('Voer \'n geldige aantal in.');
        return;
      }
    } else {
      resolvedCount = this.pickPreset()!;
    }

    if (resolvedCount > 4000) {
      this.pickError.set('Maksimum 4000 blokke kan gekies word.');
      return;
    }

    this.pickError.set(null);
    this.picking.set(true);

    this.road.pickSquares(resolvedCount).subscribe({
      next: (res) => {
        const ids = res?.squareIds;
        if (!ids || ids.length < resolvedCount) {
          this.pickError.set('Nie genoeg beskikbare blokke nie.');
          this.picking.set(false);
          return;
        }
        this.selectedIds.set(new Set(ids));
        this.picking.set(false);
        this.roadMap?.focusSquare(ids[0]);
      },
      error: (err: HttpErrorResponse) => {
        console.error('pick-squares failed', { status: err.status, error: err.error, message: err.message });
        this.picking.set(false);
        this.pickError.set(err.error?.message ?? `Kon nie blokke kies nie. (${err.status})`);
      }
    });
  }

  searchBlock() {
    this.searchError.set(null);

    const id = Math.floor(Number(this.searchBlockNumber));
    if (!Number.isFinite(id) || id < 1 || id > this.maxBlockId) {
      this.searchError.set('Voer \'n geldige bloknommer in.');
      setTimeout(() => this.searchBlockInput?.nativeElement.focus());
      return;
    }

    const sq = this.squares.find(s => s.id === id) ?? { id, isSold: false, status: 0 };

    this.roadMap?.focusSquare(id, { showTooltip: true });

    if (sq.isSold) {
      this.searchError.set('Hierdie blok is reeds toegeken.');
      return;
    }

    if (!this.auth.currentUser()) {
      this.router.navigate(['/meld-aan']);
      return;
    }

    const selected = new Set(this.selectedIds());
    selected.add(id);
    this.selectedIds.set(selected);
  }

  checkout() {
    if (this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.purchase.pendingSquareIds = ids;
    this.router.navigate(['/betaal']);
  }
}
