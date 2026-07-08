import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { ImageService } from '../../services/image.service';
import { AdminProgressImage, STATUS_LABELS } from '../../models/square';
import { AlertComponent } from '../shared/alert/alert.component';

interface ImageCardState extends AdminProgressImage {
  blobUrl?: string;
  loadingThumb: boolean;
  thumbError: boolean;
  deleting: boolean;
  replacing: boolean;
  confirmDelete: boolean;
}

@Component({
  selector: 'app-admin-images',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  template: `
    <div class="admin-content">
      <p class="gallery-hint">Nuwe foto's word op die Kaart-oortjie bygevoeg.</p>
      <app-alert [message]="message" [type]="isError ? 'error' : 'success'"></app-alert>

      @if (loading) {
        <p class="muted">Laai foto's...</p>
      } @else if (cards.length === 0) {
        <p class="empty">Geen vorderingsfoto's opgelaai nie.</p>
      } @else {
        <div class="image-grid">
          @for (card of cards; track card.id) {
            <div class="image-card">
              <div class="thumb-wrap">
                @if (card.loadingThumb) {
                  <div class="thumb-placeholder">Laai...</div>
                } @else if (card.thumbError || !card.blobUrl) {
                  <div class="thumb-placeholder">Geen voorskou</div>
                } @else {
                  <img [src]="card.blobUrl" [alt]="card.caption || 'Vorderingsfoto'" />
                }
              </div>
              <div class="card-body">
                <span class="status-badge">{{ STATUS_LABELS[card.status] }}</span>
                @if (card.caption) {
                  <p class="caption">{{ card.caption }}</p>
                }
                <p class="date">{{ card.createdAt | date:'dd MMM yyyy HH:mm' }}</p>
              </div>
              <div class="card-footer" [title]="formatSquareIds(card.squareIds)">
                <span class="footer-label">Blokke:</span>
                <span class="footer-ids">{{ formatSquareIdsShort(card.squareIds) }}</span>
              </div>
              @if (card.confirmDelete) {
                <div class="confirm-strip">
                  <p>Verwyder hierdie foto?</p>
                  <div class="confirm-actions">
                    <button class="btn btn-outline btn-sm danger" type="button" [disabled]="card.deleting" (click)="deleteImage(card)">
                      {{ card.deleting ? 'Besig...' : 'Ja, verwyder' }}
                    </button>
                    <button class="btn btn-outline btn-sm" type="button" [disabled]="card.deleting" (click)="card.confirmDelete = false">
                      Kanselleer
                    </button>
                  </div>
                </div>
              } @else {
                <div class="card-actions">
                  <button class="btn btn-outline btn-sm danger" type="button" [disabled]="card.deleting || card.replacing" (click)="card.confirmDelete = true">
                    Verwyder
                  </button>
                  <button class="btn btn-outline btn-sm" type="button" [disabled]="card.deleting || card.replacing" (click)="replaceInput.click()">
                    {{ card.replacing ? 'Besig...' : 'Vervang' }}
                  </button>
                  <input
                    type="file"
                    class="hidden-file"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="onReplaceSelected(card, $event)"
                    #replaceInput
                  >
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-content { }
    .gallery-hint {
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin-bottom: 1rem;
    }
    .muted, .empty {
      font-size: 0.875rem;
      color: var(--color-muted);
    }
    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }
    .image-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
    }
    .thumb-wrap {
      aspect-ratio: 4 / 3;
      background: var(--color-cream);
      overflow: hidden;
    }
    .thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: var(--color-muted);
    }
    .card-body {
      padding: 0.75rem 0.75rem 0.5rem;
      flex: 1;
    }
    .status-badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text);
      background: var(--color-cream);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.2rem 0.5rem;
    }
    .caption {
      font-size: 0.8125rem;
      margin: 0.5rem 0 0.25rem;
      color: var(--color-text);
    }
    .date {
      font-size: 0.6875rem;
      color: var(--color-muted);
      margin: 0;
    }
    .card-footer {
      margin: 0 0.75rem 0.75rem;
      padding: 0.5rem 0.625rem;
      background: var(--color-cream);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      line-height: 1.4;
      color: var(--color-muted);
    }
    .footer-label {
      font-weight: 600;
      color: var(--color-text);
      margin-right: 0.25rem;
    }
    .footer-ids {
      word-break: break-word;
    }
    .card-actions, .confirm-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0 0.75rem 0.75rem;
      flex-wrap: wrap;
    }
    .confirm-strip {
      padding: 0 0.75rem 0.75rem;
    }
    .confirm-strip p {
      font-size: 0.75rem;
      margin: 0 0 0.5rem;
      color: var(--color-text);
    }
    .btn-sm { padding: 0.4rem 0.75rem; font-size: 0.75rem; }
    .btn.danger {
      color: #DC2626;
      border-color: #FECACA;
    }
    .btn.danger:hover {
      background: #FEF2F2;
    }
    .hidden-file {
      display: none;
    }
  `]
})
export class AdminImagesComponent implements OnInit, OnDestroy {
  private admin = inject(AdminService);
  private imageService = inject(ImageService);

  cards: ImageCardState[] = [];
  loading = true;
  message = '';
  isError = false;
  STATUS_LABELS = STATUS_LABELS;
  private blobUrls: string[] = [];

  ngOnInit() {
    this.loadImages();
  }

  ngOnDestroy() {
    this.revokeBlobUrls();
  }

  loadImages() {
    this.loading = true;
    this.revokeBlobUrls();
    this.admin.getProgressImages().subscribe({
      next: (images) => {
        this.cards = images.map(img => ({
          ...img,
          status: Number(img.status) as ImageCardState['status'],
          loadingThumb: true,
          thumbError: false,
          deleting: false,
          replacing: false,
          confirmDelete: false
        }));
        this.loading = false;
        for (const card of this.cards) {
          this.loadThumbnail(card);
        }
      },
      error: () => {
        this.message = 'Kon nie foto\'s laai nie.';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  private loadThumbnail(card: ImageCardState) {
    this.imageService.fetchImageBlob(card.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.blobUrls.push(url);
        card.blobUrl = url;
        card.loadingThumb = false;
      },
      error: () => {
        card.thumbError = true;
        card.loadingThumb = false;
      }
    });
  }

  formatSquareIds(ids: number[]): string {
    return ids.join(', ');
  }

  formatSquareIdsShort(ids: number[]): string {
    if (ids.length <= 8) return ids.join(', ');
    return ids.slice(0, 8).join(', ') + ` … (${ids.length} totaal)`;
  }

  onReplaceSelected(card: ImageCardState, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    card.replacing = true;
    this.message = '';
    this.isError = false;

    this.admin.replaceProgressImage(card.id, file).subscribe({
      next: () => {
        card.replacing = false;
        this.message = 'Foto vervang.';
        this.isError = false;
        if (card.blobUrl) {
          URL.revokeObjectURL(card.blobUrl);
          this.blobUrls = this.blobUrls.filter(u => u !== card.blobUrl);
        }
        card.loadingThumb = true;
        card.thumbError = false;
        card.blobUrl = undefined;
        this.loadThumbnail(card);
      },
      error: (err) => {
        card.replacing = false;
        this.message = err.error?.message || 'Kon nie foto vervang nie.';
        this.isError = true;
      }
    });
  }

  deleteImage(card: ImageCardState) {
    card.deleting = true;
    this.message = '';
    this.isError = false;

    this.admin.deleteProgressImage(card.id).subscribe({
      next: () => {
        if (card.blobUrl) {
          URL.revokeObjectURL(card.blobUrl);
          this.blobUrls = this.blobUrls.filter(u => u !== card.blobUrl);
        }
        this.cards = this.cards.filter(c => c.id !== card.id);
        this.message = 'Foto verwyder.';
        this.isError = false;
      },
      error: (err) => {
        card.deleting = false;
        card.confirmDelete = false;
        this.message = err.error?.message || 'Kon nie foto verwyder nie.';
        this.isError = true;
      }
    });
  }

  private revokeBlobUrls() {
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls = [];
  }
}
