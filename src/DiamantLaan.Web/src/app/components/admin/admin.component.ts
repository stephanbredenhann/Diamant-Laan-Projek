import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { RoadMapComponent } from '../shared/road-map/road-map.component';
import { blokLabel } from '../../utils/afrikaans.util';

const STATUS_OPTIONS: SquareStatus[] = [SquareStatus.Voorberei, SquareStatus.BesigOmTeTeer, SquareStatus.KlaarGeteer];
const IMAGE_STATUS_OPTIONS: SquareStatus[] = [
  SquareStatus.NogNieBeginNie,
  SquareStatus.Voorberei,
  SquareStatus.BesigOmTeTeer,
  SquareStatus.KlaarGeteer
];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RoadMapComponent],
  template: `
    <div class="admin-content">
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
        @if (selectedIds().size > 0) {
          <div class="upload-panel">
            <h4>Voeg foto by</h4>
            @if (imageConflictPrompt) {
              <div class="conflict-prompt">
                <p>
                  {{ imageConflictPrompt.conflictingCount }} van {{ imageConflictPrompt.totalSelected }}
                  gekose blokke het reeds 'n foto vir {{ STATUS_LABELS[imageStatus] }}.
                </p>
                <div class="conflict-actions">
                  <button class="btn btn-primary btn-sm" type="button" [disabled]="uploadingImage" (click)="confirmUpload(true)">
                    Vervang bestaande
                  </button>
                  <button class="btn btn-outline btn-sm" type="button" [disabled]="uploadingImage" (click)="confirmUpload(false)">
                    Net nuwe blokke
                  </button>
                  <button class="btn btn-outline btn-sm" type="button" [disabled]="uploadingImage" (click)="cancelConflictPrompt()">
                    Kanselleer
                  </button>
                </div>
              </div>
            }
            <div class="upload-fields">
              <div class="field">
                <label for="imageStatus">Status</label>
                <select id="imageStatus" [(ngModel)]="imageStatus">
                  @for (s of IMAGE_STATUS_OPTIONS; track s) {
                    <option [ngValue]="s">{{ STATUS_LABELS[s] }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label for="imageFile">Foto</label>
                <input #imageFileInput id="imageFile" type="file" accept="image/jpeg,image/png,image/webp" (change)="onImageSelected($event)">
              </div>
              <div class="field">
                <label for="imageCaption">Byskrif (opsioneel)</label>
                <input id="imageCaption" type="text" [(ngModel)]="imageCaption" placeholder="Bv. Teerwerk begin">
              </div>
              <button
                class="btn btn-primary btn-sm"
                type="button"
                [disabled]="!selectedImageFile || uploadingImage || !!imageConflictPrompt"
                (click)="startUpload()"
              >
                {{ uploadingImage ? 'Laai op...' : 'Laai foto op' }}
              </button>
            </div>
          </div>
        }
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
    .admin-content { }
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
    .legend { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--color-muted); margin-bottom: 0.75rem; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    .dot.free { background: #D4C4A8; }
    .dot.sold { background: #C67B5C; }
    .dot.prep { background: #B5651D; }
    .dot.busy { background: #8B7355; }
    .dot.done { background: #6B7B3C; }
    .upload-panel {
      width: 100%;
      background: var(--color-cream);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 1rem;
      margin-top: 0.5rem;
    }
    .upload-panel h4 {
      font-family: var(--font-heading);
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
      color: var(--color-text);
    }
    .conflict-prompt {
      background: #F5F0E1;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .conflict-prompt p {
      font-size: 0.8125rem;
      margin-bottom: 0.625rem;
      color: var(--color-text);
    }
    .conflict-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .upload-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
    }
    .upload-fields .field {
      flex: 1;
      min-width: 140px;
    }
    .upload-fields label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: var(--color-text);
    }
    .upload-fields input, .upload-fields select {
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }
    @media (max-width: 640px) {
      .stats-row { flex-direction: column; }
    }
  `]
})
export class AdminComponent implements OnInit {
  @ViewChild('imageFileInput') imageFileInput?: ElementRef<HTMLInputElement>;

  private admin = inject(AdminService);
  private road = inject(RoadService);

  squares: Square[] = [];
  stats = { progress: 0, totalRaised: 0 };
  selectedIds = signal<Set<number>>(new Set());
  targetStatus: SquareStatus | null = null;
  message = '';
  isError = false;
  imageStatus: SquareStatus = SquareStatus.Voorberei;
  imageCaption = '';
  selectedImageFile: File | null = null;
  uploadingImage = false;
  imageConflictPrompt: { conflictingCount: number; totalSelected: number } | null = null;
  STATUS_LABELS = STATUS_LABELS;
  STATUS_OPTIONS = STATUS_OPTIONS;
  IMAGE_STATUS_OPTIONS = IMAGE_STATUS_OPTIONS;

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
    this.updateDefaultImageStatus();
  }

  private updateDefaultImageStatus() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    const first = this.squares.find(s => s.id === ids[0]);
    if (first) this.imageStatus = first.status;
  }

  clearSelection() {
    this.selectedIds.set(new Set());
    this.message = '';
    this.imageConflictPrompt = null;
  }

  selectRange(ids: number[]) {
    const selected = new Set(this.selectedIds());
    for (const id of ids) selected.add(id);
    this.selectedIds.set(selected);
    this.updateDefaultImageStatus();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedImageFile = input.files?.[0] ?? null;
    this.imageConflictPrompt = null;
  }

  startUpload() {
    if (!this.selectedImageFile || this.selectedIds().size === 0) return;
    this.message = '';
    this.isError = false;
    this.imageConflictPrompt = null;

    const ids = Array.from(this.selectedIds());
    this.admin.checkImageConflicts(ids, this.imageStatus).subscribe({
      next: (result) => {
        if (result.conflictingSquareIds.length > 0) {
          this.imageConflictPrompt = {
            conflictingCount: result.conflictingSquareIds.length,
            totalSelected: result.totalSelected
          };
        } else {
          this.performUpload(false);
        }
      },
      error: (err) => {
        this.message = err.error?.message || 'Kon nie konflikte kontroleer nie.';
        this.isError = true;
      }
    });
  }

  confirmUpload(replaceExisting: boolean) {
    this.performUpload(replaceExisting);
  }

  cancelConflictPrompt() {
    this.imageConflictPrompt = null;
  }

  private performUpload(replaceExisting: boolean) {
    if (!this.selectedImageFile || this.selectedIds().size === 0) return;

    this.uploadingImage = true;
    this.message = '';
    this.isError = false;
    this.imageConflictPrompt = null;

    const formData = new FormData();
    for (const id of this.selectedIds()) {
      formData.append('squareIds', String(id));
    }
    formData.append('status', String(this.imageStatus));
    formData.append('image', this.selectedImageFile);
    if (this.imageCaption.trim()) {
      formData.append('caption', this.imageCaption.trim());
    }

    this.admin.uploadProgressImage(formData, replaceExisting).subscribe({
      next: (res) => {
        this.message = this.buildUploadSuccessMessage(res);
        this.uploadingImage = false;
        this.resetImageForm();
      },
      error: (err) => {
        this.message = err.error?.message || 'Foto-oplaai het misluk.';
        this.isError = true;
        this.uploadingImage = false;
      }
    });
  }

  private buildUploadSuccessMessage(res: { squareCount: number; replacedCount?: number; skippedCount?: number }) {
    const label = blokLabel(res.squareCount);
    let msg = `Foto opgelaai vir ${res.squareCount} ${label}.`;
    if (res.skippedCount && res.skippedCount > 0) {
      msg = `Foto opgelaai vir ${res.squareCount} ${label} (${res.skippedCount} het reeds 'n foto en is oorgeslaan).`;
    } else if (res.replacedCount && res.replacedCount > 0) {
      msg = `Foto opgelaai vir ${res.squareCount} ${label} (${res.replacedCount} bestaande foto's vervang).`;
    }
    return msg;
  }

  private resetImageForm() {
    this.selectedImageFile = null;
    this.imageCaption = '';
    if (this.imageFileInput?.nativeElement) {
      this.imageFileInput.nativeElement.value = '';
    }
  }

  updateStatus() {
    this.message = ''; this.isError = false;
    if (!this.targetStatus || this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    this.admin.updateStatus(ids, this.targetStatus).subscribe({
      next: () => {
        this.message = `${ids.length} ${blokLabel(ids.length)} opgedateer.`;
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
