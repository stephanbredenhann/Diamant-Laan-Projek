import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { MapViewMode, Square, SquareStatus, STATUS_LABELS } from '../../models/square';
import { RoadMapComponent } from '../shared/road-map/road-map.component';
import { blokLabel } from '../../utils/afrikaans.util';

const STATUS_OPTIONS: SquareStatus[] = [SquareStatus.Voorberei, SquareStatus.BesigOmTeTeer, SquareStatus.KlaarGeteer];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RoadMapComponent],
  template: `
    <div class="admin-content">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">R{{ stats.totalRaised | number:'1.0-0' }}</div>
          <div class="stat-label">Ingesamel</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ selectedIds().size }}</div>
          <div class="stat-label">Gekies</div>
        </div>
      </div>

      @if (selectedIds().size > 0) {
        <div class="action-panel" [class.has-drafts]="hasUnsavedChanges">
          <div class="action-section">
            <h4>Status</h4>
            <select
              class="status-select"
              [(ngModel)]="draftStatus"
              name="draftStatus"
              [disabled]="!!imageConflictPrompt"
              (ngModelChange)="onDraftChanged()"
            >
              <option [ngValue]="null">Geen statusverandering</option>
              @for (s of STATUS_OPTIONS; track s) {
                <option [ngValue]="s">{{ STATUS_LABELS[s] }}</option>
              }
            </select>
          </div>

          <div class="action-section">
            <h4>Foto</h4>
            @if (imageConflictPrompt) {
              <div class="conflict-prompt">
                <p>
                  {{ imageConflictPrompt.conflictingCount }} van {{ imageConflictPrompt.totalSelected }}
                  gekose blokke het reeds 'n foto vir {{ STATUS_LABELS[pendingImageStatus!] }}.
                </p>
                <div class="conflict-actions">
                  <button class="btn btn-primary btn-sm" type="button" [disabled]="saving" (click)="confirmUpload(true)">
                    Vervang bestaande
                  </button>
                  <button class="btn btn-outline btn-sm" type="button" [disabled]="saving" (click)="confirmUpload(false)">
                    Net nuwe blokke
                  </button>
                  <button class="btn btn-outline btn-sm" type="button" [disabled]="saving" (click)="cancelConflictPrompt()">
                    Kanselleer
                  </button>
                </div>
              </div>
            }
            <div class="upload-fields">
              <div class="field">
                <label for="imageFile">Foto</label>
                <input #imageFileInput id="imageFile" type="file" accept="image/jpeg,image/png,image/webp" (change)="onImageSelected($event)">
              </div>
              <div class="field">
                <label for="imageCaption">Byskrif (opsioneel)</label>
                <input id="imageCaption" type="text" [(ngModel)]="draftImageCaption" name="draftImageCaption" placeholder="Bv. Teerwerk begin">
              </div>
            </div>
            @if (draftImageFile) {
              <p class="draft-file-hint">Gekose lêer: {{ draftImageFile.name }}</p>
            }
          </div>

          <div class="action-footer">
            <button
              class="btn btn-primary btn-sm"
              type="button"
              [disabled]="!hasUnsavedChanges || saving || !!imageConflictPrompt"
              (click)="saveChanges()"
            >
              {{ saving ? 'Besig...' : 'Stoor veranderinge' }}
            </button>
            <button class="btn btn-outline btn-sm" type="button" [disabled]="saving" (click)="cancelDrafts()">
              Kanselleer
            </button>
            <button class="btn btn-outline btn-sm" type="button" [disabled]="saving" (click)="clearSelection()">
              Maak keuses skoon ({{ selectedIds().size }})
            </button>
          </div>
        </div>
      } @else {
        <div class="controls">
          <p class="select-hint">Kies blokke op die kaart om status of 'n foto by te werk.</p>
        </div>
      }

      @if (message) {
        <div class="msg" [class.error]="isError">{{ message }}</div>
      }
      <div class="map-header-controls">
        <div class="view-toggle">
          <button
            type="button"
            [class.active]="viewMode() === 'status'"
            (click)="viewMode.set('status')"
          >Vordering</button>
          <button
            type="button"
            [class.active]="viewMode() === 'photos'"
            (click)="viewMode.set('photos')"
          >Het foto</button>
        </div>
      </div>
      <div class="legend">
        @if (viewMode() === 'photos') {
          <span><span class="dot has-photo"></span> Het foto</span>
          <span><span class="dot no-photo"></span> Geen foto</span>
        } @else {
          <span><span class="dot free"></span> Beskikbaar</span>
          <span><span class="dot sold"></span> Verkoop</span>
          <span><span class="dot prep"></span> Voorberei</span>
          <span><span class="dot busy"></span> Besig om te teer</span>
          <span><span class="dot done"></span> Klaar geteer</span>
        }
      </div>
      <app-road-map
        [squares]="squares"
        [selectedIds]="selectedIdsArray()"
        [viewMode]="viewMode()"
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
    .stat-label {
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 0.125rem;
    }
    .controls {
      margin-bottom: 1rem;
    }
    .select-hint {
      font-size: 0.875rem;
      color: var(--color-muted);
    }
    .action-panel {
      background: var(--color-cream);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .action-panel.has-drafts {
      border-color: #D97706;
      box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.15);
    }
    .action-section h4 {
      font-family: var(--font-heading);
      font-size: 0.875rem;
      margin-bottom: 0.625rem;
      color: var(--color-text);
    }
    .action-section .status-select {
      width: 100%;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }
    .action-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-top: 0.25rem;
      border-top: 1px solid var(--color-border);
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
    .map-header-controls { margin-bottom: 0.75rem; }
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
    .view-toggle button + button {
      border-left: 1px solid var(--color-border);
    }
    .view-toggle button.active {
      background: var(--ob-orange);
      color: #fff;
    }
    .legend { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--color-muted); margin-bottom: 0.75rem; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
    .dot.free { background: #D4C4A8; }
    .dot.sold { background: #C67B5C; }
    .dot.prep { background: #B5651D; }
    .dot.busy { background: #8B7355; }
    .dot.done { background: #6B7B3C; }
    .dot.has-photo { background: #034EA2; }
    .dot.no-photo { background: #D4C4A8; }
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
    .draft-file-hint {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--color-muted);
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
  stats = { totalRaised: 0 };
  selectedIds = signal<Set<number>>(new Set());
  viewMode = signal<MapViewMode>('status');

  draftStatus: SquareStatus | null = null;
  draftImageCaption = '';
  draftImageFile: File | null = null;

  message = '';
  isError = false;
  saving = false;
  imageConflictPrompt: { conflictingCount: number; totalSelected: number } | null = null;
  /** Snapshot of image status used for the open conflict prompt / pending upload. */
  pendingImageStatus: SquareStatus | null = null;

  STATUS_LABELS = STATUS_LABELS;
  STATUS_OPTIONS = STATUS_OPTIONS;

  get hasUnsavedChanges(): boolean {
    return this.draftStatus !== null || this.draftImageFile !== null;
  }

  ngOnInit() {
    this.refresh();
  }

  onDraftChanged() {
    // Triggers change detection for hasUnsavedChanges when status select changes
  }

  selectedIdsArray(): number[] {
    return Array.from(this.selectedIds());
  }

  toggleById(sqId: number) {
    if (this.imageConflictPrompt) return;
    const sq = this.squares.find(s => s.id === sqId);
    if (!sq) return;
    this.toggle(sq);
  }

  toggle(sq: Square) {
    if (this.imageConflictPrompt) return;
    const selected = new Set(this.selectedIds());
    selected.has(sq.id) ? selected.delete(sq.id) : selected.add(sq.id);
    this.selectedIds.set(selected);
  }

  /** Status used for photo upload: draft status if set, else shared status of selected blocks. */
  effectiveImageStatus(): SquareStatus | null {
    if (this.draftStatus !== null) return this.draftStatus;

    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return null;

    let shared: SquareStatus | null = null;
    for (const id of ids) {
      const sq = this.squares.find(s => s.id === id);
      if (!sq) return null;
      if (shared === null) {
        shared = sq.status;
      } else if (shared !== sq.status) {
        return null;
      }
    }
    return shared;
  }

  clearSelection() {
    this.selectedIds.set(new Set());
    this.cancelDrafts();
    this.message = '';
  }

  cancelDrafts() {
    this.draftStatus = null;
    this.draftImageCaption = '';
    this.draftImageFile = null;
    this.imageConflictPrompt = null;
    this.pendingImageStatus = null;
    this.resetImageInput();
  }

  selectRange(ids: number[]) {
    if (this.imageConflictPrompt) return;
    const selected = new Set(this.selectedIds());
    for (const id of ids) selected.add(id);
    this.selectedIds.set(selected);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.draftImageFile = input.files?.[0] ?? null;
    this.imageConflictPrompt = null;
    this.pendingImageStatus = null;
  }

  saveChanges() {
    if (!this.hasUnsavedChanges || this.selectedIds().size === 0) return;
    this.message = '';
    this.isError = false;
    this.saving = true;

    const afterStatus = () => {
      if (this.draftImageFile) {
        this.startImageConflictCheck();
      } else {
        this.finishSaveSuccess(this.buildStatusOnlyMessage());
      }
    };

    if (this.draftStatus !== null) {
      const ids = Array.from(this.selectedIds());
      const status = this.draftStatus;
      this.admin.updateStatus(ids, status).subscribe({
        next: () => afterStatus(),
        error: (err) => {
          this.message = err.error?.message || 'Statusopdatering het misluk.';
          this.isError = true;
          this.saving = false;
        }
      });
    } else {
      afterStatus();
    }
  }

  private startImageConflictCheck() {
    if (!this.draftImageFile || this.selectedIds().size === 0) return;

    const imageStatus = this.effectiveImageStatus();
    if (imageStatus === null) {
      this.message = 'Gekose blokke het verskillende statusse — kies blokke met dieselfde status, of stel \'n nuwe status.';
      this.isError = true;
      this.saving = false;
      return;
    }

    this.pendingImageStatus = imageStatus;
    const ids = Array.from(this.selectedIds());
    this.admin.checkImageConflicts(ids, imageStatus).subscribe({
      next: (result) => {
        if (result.conflictingSquareIds.length > 0) {
          this.imageConflictPrompt = {
            conflictingCount: result.conflictingSquareIds.length,
            totalSelected: result.totalSelected
          };
          this.saving = false;
        } else {
          this.performUpload(false);
        }
      },
      error: (err) => {
        this.pendingImageStatus = null;
        this.message = err.error?.message || 'Kon nie konflikte kontroleer nie.';
        this.isError = true;
        this.saving = false;
      }
    });
  }

  confirmUpload(replaceExisting: boolean) {
    this.saving = true;
    this.performUpload(replaceExisting);
  }

  cancelConflictPrompt() {
    this.imageConflictPrompt = null;
    this.pendingImageStatus = null;
  }

  private performUpload(replaceExisting: boolean) {
    if (!this.draftImageFile || this.selectedIds().size === 0) return;

    const imageStatus = this.pendingImageStatus ?? this.effectiveImageStatus();
    if (imageStatus === null) {
      this.message = 'Gekose blokke het verskillende statusse — kies blokke met dieselfde status, of stel \'n nuwe status.';
      this.isError = true;
      this.saving = false;
      return;
    }

    this.message = '';
    this.isError = false;
    this.imageConflictPrompt = null;
    this.pendingImageStatus = null;

    const formData = new FormData();
    for (const id of this.selectedIds()) {
      formData.append('squareIds', String(id));
    }
    formData.append('status', String(imageStatus));
    formData.append('image', this.draftImageFile);
    if (this.draftImageCaption.trim()) {
      formData.append('caption', this.draftImageCaption.trim());
    }

    const statusPart = this.draftStatus !== null
      ? `${this.selectedIds().size} ${blokLabel(this.selectedIds().size)} se status opgedateer. `
      : '';

    this.admin.uploadProgressImage(formData, replaceExisting).subscribe({
      next: (res) => {
        this.finishSaveSuccess(statusPart + this.buildUploadSuccessMessage(res));
      },
      error: (err) => {
        this.message = err.error?.message || 'Foto-oplaai het misluk.';
        this.isError = true;
        this.saving = false;
      }
    });
  }

  private finishSaveSuccess(msg: string) {
    this.message = msg;
    this.isError = false;
    this.saving = false;
    this.cancelDrafts();
    this.selectedIds.set(new Set());
    this.refresh();
  }

  private buildStatusOnlyMessage(): string {
    const n = this.selectedIds().size;
    return `${n} ${blokLabel(n)} se status opgedateer.`;
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

  private resetImageInput() {
    if (this.imageFileInput?.nativeElement) {
      this.imageFileInput.nativeElement.value = '';
    }
  }

  private refresh() {
    this.admin.getStats().subscribe({
      next: s => this.stats = { totalRaised: s.totalRaised ?? 0 },
      error: () => {
        this.message = 'Kon nie statistieke laai nie.';
        this.isError = true;
      }
    });
    this.road.getSquares().subscribe(s => this.squares = s);
  }
}
