import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { Square, SquareStatus, STATUS_LABELS } from '../../../models/square';
import { SEGMENTS } from '../../map/map-segments';

const STATUS_COLORS: Record<number, string> = {
  [SquareStatus.NogNieBeginNie]: '#d1d5db',
  [SquareStatus.Voorberei]:      '#fbbf24',
  [SquareStatus.BesigOmTeTeer]:  '#3b82f6',
  [SquareStatus.KlaarGeteer]:    '#22c55e',
};
const SOLD_COLOR = '#fb923c';

// SVG coordinate space (6px cells, 1px gap between blocks)
const SVG_W = 1700;
const SVG_H = 2640;

@Component({
  selector: 'app-road-map',
  standalone: true,
  template: `
    <div class="map-outer">
      <!-- Zoom toolbar – always visible above the scroll area -->
      <div class="zoom-bar">
        <button class="zoom-btn" (click)="zoomOut()" [disabled]="zoom() <= 0.5" title="Zoom uit">−</button>
        <span class="zoom-label">{{ zoomLabel() }}</span>
        <button class="zoom-btn" (click)="zoomIn()"  [disabled]="zoom() >= 4"   title="Zoom in">+</button>
        <button class="zoom-btn zoom-reset" (click)="zoomReset()" title="Herstel zoom">⟳</button>
        <span class="zoom-hint">Sleep / scroll om te beweeg</span>
      </div>

      <!-- Scrollable viewport -->
      <div class="map-scroll">
        <svg
          [attr.viewBox]="viewBox"
          [style.width.px]="svgW * zoom()"
          [style.height.px]="svgH * zoom()"
          class="road-map-svg">

          <!-- Light road-bed background strip so gaps are visible -->
          <rect x="0" y="0" [attr.width]="svgW" [attr.height]="svgH" fill="#f3f4f6"/>

          @for (seg of segments; track seg.name) {
            @for (row of range(seg.rows); track row) {
              @for (col of range(seg.cols); track col) {
                @let sqId = seg.startId + col * seg.rows + row;
                @if (sqId <= seg.endId) {
                  @let sx = seg.x + col * seg.cellW;
                  @let sy = seg.y + row * seg.cellH;
                  <rect
                    [attr.x]="sx + 0.5"
                    [attr.y]="sy + 0.5"
                    [attr.width]="seg.cellW - 1"
                    [attr.height]="seg.cellH - 1"
                    [attr.fill]="getColor(sqId)"
                    [attr.opacity]="getOpacity(sqId)"
                    [attr.stroke]="isSelected(sqId) ? '#f97316' : 'none'"
                    [attr.stroke-width]="isSelected(sqId) ? 2 : 0"
                    rx="1"
                    style="cursor:pointer"
                    (click)="onSquareClick(sqId)">
                    <title>{{ getTooltip(sqId) }}</title>
                  </rect>
                }
              }
            }
          }
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .map-outer {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
      display: flex;
      flex-direction: column;
    }

    /* ── Zoom toolbar ────────────────────────────────────── */
    .zoom-bar {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }
    .zoom-btn {
      width: 30px;
      height: 30px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: #fff;
      font-size: 1.125rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
      transition: background 0.12s, border-color 0.12s;
    }
    .zoom-btn:hover:not(:disabled) {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }
    .zoom-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .zoom-reset { font-size: 0.875rem; }
    .zoom-label {
      font-size: 0.75rem;
      font-weight: 700;
      min-width: 42px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .zoom-hint {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      margin-left: 0.25rem;
    }

    /* ── Scroll container ────────────────────────────────── */
    .map-scroll {
      overflow: auto;
      max-height: 70vh;
      background: #f3f4f6;
    }
    .road-map-svg { display: block; }
  `]
})
export class RoadMapComponent {
  @Input() squares: Square[] = [];
  @Input() selectedIds: number[] = [];
  /** When set, squares with a different status are dimmed (admin filter). */
  @Input() statusFilter: number | null = null;
  @Output() squareClicked = new EventEmitter<number>();

  segments = SEGMENTS;
  svgW = SVG_W;
  svgH = SVG_H;
  viewBox = `0 0 ${SVG_W} ${SVG_H}`;

  zoom = signal<number>(1);
  zoomLabel = computed(() => Math.round(this.zoom() * 100) + '%');

  zoomIn()    { this.zoom.update(z => Math.min(4,   +(z + 0.25).toFixed(2))); }
  zoomOut()   { this.zoom.update(z => Math.max(0.5, +(z - 0.25).toFixed(2))); }
  zoomReset() { this.zoom.set(1); }

  onSquareClick(sqId: number) { this.squareClicked.emit(sqId); }
  isSelected(sqId: number)    { return this.selectedIds.includes(sqId); }

  getColor(squareId: number): string {
    const sq = this.squares.find(s => s.id === squareId);
    if (!sq) return STATUS_COLORS[SquareStatus.NogNieBeginNie];
    if (sq.status === SquareStatus.NogNieBeginNie && sq.isSold) return SOLD_COLOR;
    return STATUS_COLORS[sq.status] ?? STATUS_COLORS[SquareStatus.NogNieBeginNie];
  }

  getOpacity(squareId: number): number {
    if (this.statusFilter === null) return 1;
    const sq = this.squares.find(s => s.id === squareId);
    if (!sq) return 0.25;
    return sq.status === this.statusFilter ? 1 : 0.25;
  }

  getTooltip(squareId: number): string {
    const sq = this.squares.find(s => s.id === squareId);
    if (!sq) return `Blok #${squareId}`;
    if (sq.status === SquareStatus.NogNieBeginNie && sq.isSold) {
      return `Blok #${squareId} — Verkoop`;
    }
    return `Blok #${squareId} — ${STATUS_LABELS[sq.status]}`;
  }

  range(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }
}
