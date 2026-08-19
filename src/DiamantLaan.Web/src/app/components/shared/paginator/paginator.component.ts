import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

export const PAGE_SIZE = 30;

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (total > pageSize) {
      <div class="paginator">
        <span class="range">{{ total ? page * pageSize + 1 : 0 }}–{{ end }} van {{ total }}</span>
        <button type="button" (click)="go(page - 1)" [disabled]="page === 0">Vorige</button>
        <span class="pages">Bladsy {{ page + 1 }} van {{ lastPage + 1 }}</span>
        <button type="button" (click)="go(page + 1)" [disabled]="page >= lastPage">Volgende</button>
      </div>
    }
  `,
  styles: [`
    .paginator {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.75rem;
      font-size: 0.8125rem;
      color: var(--color-muted);
      flex-wrap: wrap;
    }
    button {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.8125rem;
      cursor: pointer;
    }
    button:hover:not(:disabled) { border-color: var(--color-terracotta); color: var(--color-terracotta); }
    button:disabled { opacity: 0.45; cursor: not-allowed; }
  `]
})
export class PaginatorComponent implements OnChanges {
  @Input({ required: true }) total = 0;
  @Input() page = 0;
  @Input() pageSize = PAGE_SIZE;
  @Output() pageChange = new EventEmitter<number>();

  get lastPage(): number { return Math.max(0, Math.ceil(this.total / this.pageSize) - 1); }
  get end(): number { return Math.min((this.page + 1) * this.pageSize, this.total); }

  ngOnChanges() {
    // Filtering can shrink the list out from under the current page.
    if (this.page > this.lastPage) this.go(this.lastPage);
  }

  go(page: number) {
    this.page = page;
    this.pageChange.emit(page);
  }
}
