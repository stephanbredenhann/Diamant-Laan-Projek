import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { ImageService } from '../../../services/image.service';
import { ProgressImage, SquareStatus, STATUS_LABELS } from '../../../models/square';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="lightbox-backdrop" (click)="close()">
        <div class="lightbox" (click)="$event.stopPropagation()">
          @if (loading) {
            <div class="lightbox-loading">Laai beelde...</div>
          } @else if (images.length === 0) {
            <div class="lightbox-empty">Geen beelde beskikbaar nie.</div>
          } @else {
            <div class="lightbox-body">
              <div class="image-frame">
                @if (currentBlobUrl) {
                  <img [src]="currentBlobUrl" [alt]="currentCaption || 'Vorderingsfoto'" />
                }
                <div class="lightbox-overlay lightbox-overlay-top">
                  <div class="lightbox-meta">
                    <span class="lightbox-title">Blok #{{ squareId }}</span>
                    <span class="lightbox-status">{{ currentStatusLabel }}</span>
                  </div>
                  <button class="lightbox-close" type="button" (click)="close()" aria-label="Sluit">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                @if (images.length > 1) {
                  <button
                    class="nav-btn prev"
                    type="button"
                    [disabled]="currentIndex === 0"
                    (click)="prev()"
                    aria-label="Vorige beeld"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button
                    class="nav-btn next"
                    type="button"
                    [disabled]="currentIndex >= images.length - 1"
                    (click)="next()"
                    aria-label="Volgende beeld"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                }
                <div class="lightbox-overlay lightbox-overlay-bottom">
                  @if (currentCaption) {
                    <p class="lightbox-caption">{{ currentCaption }}</p>
                  }
                  <p class="lightbox-counter">{{ currentIndex + 1 }} / {{ images.length }}</p>
                </div>
              </div>
            </div>
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
      width: fit-content;
      max-width: 90vw;
      max-height: 90vh;
      position: relative;
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    }
    .lightbox-loading, .lightbox-empty {
      padding: 3rem 2rem;
      text-align: center;
      color: var(--color-muted);
      background: var(--color-surface);
      border-radius: var(--radius);
    }
    .lightbox-body {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .image-frame {
      position: relative;
      display: inline-block;
      line-height: 0;
      border-radius: var(--radius);
      overflow: hidden;
      background: #0a0a0a;
    }
    .image-frame img {
      display: block;
      max-width: 90vw;
      max-height: 80vh;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .lightbox-overlay {
      position: absolute;
      left: 0;
      right: 0;
      z-index: 2;
      pointer-events: none;
    }
    .lightbox-overlay-top {
      top: 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 0.875rem;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.65), transparent);
    }
    .lightbox-overlay-bottom {
      bottom: 0;
      padding: 1.5rem 1rem 0.75rem;
      text-align: center;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.65), transparent);
    }
    .lightbox-meta {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }
    .lightbox-title {
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 0.9375rem;
      color: #fff;
    }
    .lightbox-status {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 500;
    }
    .lightbox-close {
      flex-shrink: 0;
      pointer-events: auto;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: pointer;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s;
    }
    .lightbox-close:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.05);
    }
    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 3;
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: pointer;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s, opacity 0.2s;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }
    .nav-btn.prev { left: 0.75rem; }
    .nav-btn.next { right: 0.75rem; }
    .nav-btn:disabled {
      opacity: 0;
      pointer-events: none;
    }
    .nav-btn:not(:disabled):hover {
      background: rgba(0, 0, 0, 0.65);
      transform: translateY(-50%) scale(1.08);
    }
    .lightbox-caption {
      margin: 0;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.95);
      line-height: 1.4;
    }
    .lightbox-counter {
      margin: 0.25rem 0 0;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.7);
      font-variant-numeric: tabular-nums;
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
