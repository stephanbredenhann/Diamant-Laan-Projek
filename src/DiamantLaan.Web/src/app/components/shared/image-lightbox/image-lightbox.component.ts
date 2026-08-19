import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { ImageService } from '../../../services/image.service';
import { ProgressImage, SquareStatus, STATUS_LABELS } from '../../../models/square';
import { TPipe } from '../../../i18n/t.pipe';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, TPipe],
  template: `
    @if (open) {
      <div class="lightbox-backdrop" (click)="close()">
        <div class="lightbox" (click)="$event.stopPropagation()">
          <header class="lightbox-head">
            <div class="lightbox-meta">
              <span class="lightbox-title">{{ 'Blok' | t }} #{{ squareId }}</span>
              @if (currentStatusLabel) {
                <span class="lightbox-status">{{ currentStatusLabel | t }}</span>
              }
            </div>
            <button class="lightbox-close" type="button" (click)="close()" [attr.aria-label]="'Sluit' | t">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          @if (loading) {
            <div class="lightbox-loading">{{ 'Laai foto’s...' | t }}</div>
          } @else if (images.length === 0) {
            <div class="lightbox-empty">{{ 'Geen foto’s beskikbaar nie.' | t }}</div>
          } @else {
            <div class="lightbox-body">
              @if (images.length > 1) {
                <button
                  class="nav-btn"
                  type="button"
                  [disabled]="currentIndex === 0"
                  (click)="prev()"
                  [attr.aria-label]="'Vorige foto' | t"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              }
              <div class="image-frame">
                @if (currentBlobUrl) {
                  <img [src]="currentBlobUrl" [alt]="currentCaption || ('Vorderingsfoto' | t)" />
                }
              </div>
              @if (images.length > 1) {
                <button
                  class="nav-btn"
                  type="button"
                  [disabled]="currentIndex >= images.length - 1"
                  (click)="next()"
                  [attr.aria-label]="'Volgende foto' | t"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              }
            </div>
            @if (currentCaption || images.length > 1) {
              <footer class="lightbox-foot">
                @if (currentCaption) {
                  <p class="lightbox-caption">{{ currentCaption }}</p>
                }
                @if (images.length > 1) {
                  <p class="lightbox-counter">{{ currentIndex + 1 }} / {{ images.length }}</p>
                }
              </footer>
            }
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .lightbox-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.82);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .lightbox {
      display: flex;
      flex-direction: column;
      width: fit-content;
      max-width: min(96vw, 60rem);
      max-height: 92vh;
      background: var(--color-surface);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    }
    .lightbox-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-soft);
      background: var(--surface-alt);
    }
    .lightbox-meta {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      min-width: 0;
    }
    .lightbox-title {
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: var(--fs-lg);
      color: var(--ink);
    }
    .lightbox-status {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .lightbox-close {
      flex-shrink: 0;
      width: 2.5rem;
      height: 2.5rem;
      min-height: 2.5rem;
      padding: 0;
      border: 2px solid var(--action);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--action);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox-close:hover {
      background: var(--action-strong);
      border-color: var(--action-strong);
      color: #fff;
    }
    .lightbox-loading, .lightbox-empty {
      padding: 3rem 2rem;
      text-align: center;
      color: var(--text-muted);
    }
    .lightbox-body {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.75rem;
      min-height: 0;
      background: var(--tar);
    }
    .image-frame {
      line-height: 0;
      min-width: 0;
    }
    .image-frame img {
      display: block;
      max-width: 100%;
      max-height: 70vh;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .nav-btn {
      flex-shrink: 0;
      width: 3rem;
      height: 3rem;
      min-height: 3rem;
      padding: 0;
      border: 2px solid var(--action);
      border-radius: var(--radius-sm);
      background: var(--tar);
      color: var(--action);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-btn:not(:disabled):hover {
      background: var(--action-strong);
      border-color: var(--action-strong);
      color: #fff;
    }
    .nav-btn:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .lightbox-foot {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-soft);
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }
    .lightbox-caption {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--text-body);
      line-height: 1.4;
    }
    .lightbox-counter {
      margin: 0;
      margin-left: auto;
      flex-shrink: 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 640px) {
      .lightbox-body { gap: 0.375rem; padding: 0.375rem; }
      .nav-btn { width: 2.5rem; height: 2.5rem; min-height: 2.5rem; }
      .image-frame img { max-height: 60vh; }
    }
  `]
})
export class ImageLightboxComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() squareId: number | null = null;
  @Output() closed = new EventEmitter<void>();

  private imageService = inject(ImageService);

  images: ProgressImage[] = [];
  loading = false;
  currentIndex = 0;
  blobUrls: string[] = [];

  get currentBlobUrl(): string | null {
    return this.blobUrls[this.currentIndex] ?? null;
  }

  get currentCaption(): string | undefined {
    return this.images[this.currentIndex]?.caption;
  }

  get currentStatusLabel(): string {
    const status = this.images[this.currentIndex]?.status;
    return status != null ? STATUS_LABELS[status] : '';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open']?.currentValue && this.squareId != null) {
      this.loadImages(this.squareId);
    }
    if (changes['open']?.currentValue === false) {
      this.cleanup();
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private loadImages(squareId: number) {
    this.loading = true;
    this.cleanup();
    this.imageService.getSquareImages(squareId).subscribe({
      next: images => {
        this.images = images.map(img => ({
          ...img,
          status: img.status as SquareStatus
        }));
        this.currentIndex = 0;
        this.loadBlobs();
      },
      error: () => {
        this.loading = false;
        this.images = [];
      }
    });
  }

  private loadBlobs() {
    if (this.images.length === 0) {
      this.loading = false;
      return;
    }

    let loaded = 0;
    this.blobUrls = new Array(this.images.length).fill('');
    for (let i = 0; i < this.images.length; i++) {
      const imageId = this.images[i].id;
      this.imageService.fetchImageBlob(imageId).subscribe({
        next: blob => {
          this.blobUrls[i] = URL.createObjectURL(blob);
          loaded++;
          if (loaded === this.images.length) this.loading = false;
        },
        error: () => {
          loaded++;
          if (loaded === this.images.length) this.loading = false;
        }
      });
    }
  }

  prev() {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  next() {
    if (this.currentIndex < this.images.length - 1) this.currentIndex++;
  }

  close() {
    this.cleanup();
    this.closed.emit();
  }

  private cleanup() {
    for (const url of this.blobUrls) {
      if (url) URL.revokeObjectURL(url);
    }
    this.blobUrls = [];
    this.images = [];
    this.currentIndex = 0;
    this.loading = false;
  }
}
