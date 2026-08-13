import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, UndoLastInfo } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import {
  AdminProgressImage,
  MapViewMode,
  Square,
  SquareStatus,
  STATUS_LABELS
} from '../../models/square';
import { RoadMapComponent } from '../shared/road-map/road-map.component';
import { AlertComponent } from '../shared/alert/alert.component';
import { BlokKeusePaneelComponent } from './blok-keuse-paneel.component';
import { blokLabel } from '../../utils/afrikaans.util';
import { Reeks, nommersNaReekse, reeksTeks } from '../../utils/blok-nommers';

const STAP_NAME = ['Kies blokke', 'Wat verander', 'Stoor'] as const;

const STATUS_OPTIONS: SquareStatus[] = [SquareStatus.Voorberei, SquareStatus.BesigOmTeTeer, SquareStatus.KlaarGeteer];

const PHOTO_VIEW_STATUSES: SquareStatus[] = [
  SquareStatus.NogNieBeginNie,
  SquareStatus.Voorberei,
  SquareStatus.BesigOmTeTeer,
  SquareStatus.KlaarGeteer
];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RoadMapComponent, AlertComponent, BlokKeusePaneelComponent],
  template: `
    <div class="admin-content">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">R{{ stats.totalRaised | number:'1.0-0' }}</div>
          <div class="stat-label">Ingesamel</div>
        </div>
      </div>

      @if (undoAvailable()) {
        <div class="undo-bar">
          <div class="undo-text">
            <strong>Laaste stoor kan ongedaan gemaak word</strong>
            <span class="undo-hint">Nog {{ undoMinutesLeft() }} min</span>
          </div>
          <button
            class="btn btn-outline btn-sm"
            type="button"
            [disabled]="undoing"
            (click)="undoLastSave()"
          >
            {{ undoing ? 'Besig...' : 'Maak ongedaan' }}
          </button>
        </div>
      }

      <nav class="stap-balk" [attr.aria-label]="'Stap ' + stap() + ' van 3'">
        @for (naam of STAP_NAME; track naam; let i = $index) {
          @let n = i + 1;
          <button
            type="button"
            class="stap-knop"
            [class.klaar]="n < stap()"
            [class.huidig]="n === stap()"
            [disabled]="n > stap() && !kanNaStap(n)"
            [attr.aria-current]="n === stap() ? 'step' : null"
            (click)="gaanNaStap(n)"
          >
            <span class="stap-nommer" aria-hidden="true">{{ n }}</span>
            <span class="stap-naam">{{ naam }}</span>
          </button>
        }
      </nav>

      <div class="stap-paneel">
        @if (stap() === 1) {
          <app-blok-keuse-paneel
            [selectedIds]="selectedIdsArray()"
            [maxBlockId]="maxBlockId"
            (addIds)="selectRange($event)"
            (removeRange)="removeRange($event)"
            (clearAll)="clearSelection()"
            (flyTo)="flyTo($event)"
          />
        } @else {
          <p class="keuse-lyn">
            <strong>{{ selectedIds().size }} {{ blokLabel(selectedIds().size) }} gekies:</strong>
            {{ keuseOpsomming() }}
          </p>
        }

        @if (stap() === 2) {
          <div class="veld">
            <label for="draftStatus">Nuwe status</label>
            <select id="draftStatus" [(ngModel)]="draftStatus" name="draftStatus" (ngModelChange)="onDraftChanged()">
              <option [ngValue]="null">Geen statusverandering</option>
              @for (s of STATUS_OPTIONS; track s) {
                <option [ngValue]="s">{{ STATUS_LABELS[s] }}</option>
              }
            </select>
          </div>

          <div class="veld-ry">
            <div class="veld">
              <label for="imageFile">Foto (opsioneel)</label>
              <input #imageFileInput id="imageFile" type="file" accept="image/jpeg,image/png,image/webp" (change)="onImageSelected($event)">
            </div>
            <div class="veld">
              <label for="imageCaption">Byskrif (opsioneel)</label>
              <input id="imageCaption" type="text" [(ngModel)]="draftImageCaption" name="draftImageCaption" placeholder="Bv. Teerwerk begin">
            </div>
          </div>

          @if (draftImageFile) {
            <p class="lêer-naam">Gekose lêer: {{ draftImageFile.name }}</p>
            @if (effectiveImageStatus() !== null) {
              <p class="foto-status">Foto word gestoor onder: <strong>{{ STATUS_LABELS[effectiveImageStatus()!] }}</strong></p>
            } @else {
              <app-alert
                message="Die gekose blokke het verskillende statusse. Kies hierbo ’n status vir almal, of gaan terug en kies blokke met dieselfde status."
                type="error" />
            }
          }
        }

        @if (stap() === 3) {
          <ul class="opsomming">
            @if (draftStatus !== null) {
              <li>Status word verander na <strong>{{ STATUS_LABELS[draftStatus] }}</strong>.</li>
            }
            @if (draftImageFile) {
              <li>
                Foto <strong>{{ draftImageFile.name }}</strong> word gestoor onder
                <strong>{{ STATUS_LABELS[effectiveImageStatus()!] }}</strong>.
              </li>
            }
          </ul>

          @if (imageConflictPrompt) {
            <div class="konflik">
              <p>
                {{ imageConflictPrompt.conflictingCount }} van {{ imageConflictPrompt.totalSelected }}
                gekose blokke het reeds ’n foto vir {{ STATUS_LABELS[pendingImageStatus!] }}.
                Niks is nog gestoor nie.
              </p>
              <div class="konflik-knoppies">
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
        }

        <app-alert [message]="message" [type]="isError ? 'error' : 'success'" />

        <div class="stap-voet">
          @if (stap() > 1) {
            <button class="btn btn-outline btn-sm" type="button" [disabled]="saving" (click)="gaanNaStap(stap() - 1)">
              Terug
            </button>
          }
          <span class="voet-vul"></span>
          @if (stap() < 3) {
            <button
              class="btn btn-primary btn-sm"
              type="button"
              [disabled]="!kanNaStap(stap() + 1)"
              (click)="gaanNaStap(stap() + 1)"
            >
              Volgende
            </button>
          } @else {
            <button
              class="btn btn-primary btn-sm"
              type="button"
              [disabled]="!hasUnsavedChanges || saving || !!imageConflictPrompt"
              (click)="saveChanges()"
            >
              {{ saving ? 'Besig...' : 'Stoor veranderinge' }}
            </button>
          }
        </div>
      </div>

      <div class="map-header-controls">
        <div class="view-toggle">
          <button
            type="button"
            [class.active]="viewMode() === 'status'"
            (click)="setStatusView()"
          >Vordering</button>
          <button
            type="button"
            [class.active]="viewMode() === 'photos'"
            (click)="setPhotosView()"
          >Het foto</button>
        </div>
        @if (viewMode() === 'photos') {
          <label class="photo-status-picker">
            <span class="photo-status-label">Fotostatus</span>
            <select
              class="photo-status-select"
              [ngModel]="photoViewStatus()"
              (ngModelChange)="onPhotoViewStatusChange($event)"
              name="photoViewStatus"
            >
              @for (s of PHOTO_VIEW_STATUSES; track s) {
                <option [ngValue]="s">{{ STATUS_LABELS[s] }}</option>
              }
            </select>
          </label>
        }
      </div>
      <div class="legend">
        @if (viewMode() === 'photos') {
          <span><span class="dot has-photo"></span> Het foto</span>
          <span><span class="dot no-photo"></span> Geen foto</span>
          <span class="photo-status-hint">Vir: {{ STATUS_LABELS[photoViewStatus()] }}</span>
        } @else {
          <span><span class="dot free"></span> Beskikbaar</span>
          <span><span class="dot sold"></span> Verkoop</span>
          <span><span class="dot unavailable"></span> Onbeskikbaar</span>
          <span><span class="dot prep"></span> Voorberei</span>
          <span><span class="dot busy"></span> Besig om te teer</span>
          <span><span class="dot done"></span> Klaar geteer</span>
        }
      </div>
      <app-road-map
        [squares]="mapDisplaySquares"
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
    .undo-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: #FEF3C7;
      border: 1px solid #F59E0B;
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }
    .undo-text {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      font-size: 0.8125rem;
      color: var(--color-text);
    }
    .undo-hint {
      font-size: 0.75rem;
      color: var(--color-muted);
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
    .stap-balk {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .stap-knop {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-muted);
      font-family: var(--font-heading);
      font-size: 0.875rem;
      cursor: pointer;
    }
    .stap-knop:disabled { opacity: 0.5; cursor: not-allowed; }
    .stap-knop.huidig {
      background: var(--color-surface);
      border-color: var(--color-orange);
      color: var(--color-text);
      font-weight: 700;
    }
    .stap-knop.klaar { color: var(--color-text); }
    .stap-nommer {
      display: grid;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--color-border);
      color: var(--color-text);
      font-size: 0.8125rem;
      font-weight: 700;
    }
    .stap-knop.huidig .stap-nommer { background: var(--color-orange); color: #fff; }
    .stap-paneel {
      background: var(--color-cream);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .keuse-lyn { font-size: 0.875rem; color: var(--color-text); margin: 0; }
    .veld-ry { display: flex; gap: 1rem; flex-wrap: wrap; }
    .veld { flex: 1 1 14rem; }
    .veld label {
      display: block;
      font-family: var(--font-heading);
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
      color: var(--color-text);
    }
    .veld select, .veld input {
      width: 100%;
      padding: 0.5rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 0.9375rem;
    }
    .lêer-naam { font-size: 0.8125rem; color: var(--color-muted); margin: 0; }
    .foto-status { font-size: 0.875rem; color: var(--color-text); margin: 0; }
    .opsomming { margin: 0; padding-left: 1.25rem; font-size: 0.9375rem; color: var(--color-text); }
    .opsomming li { margin-bottom: 0.375rem; }
    .konflik {
      background: #FFFBEB;
      border: 1px solid #F59E0B;
      border-radius: var(--radius-sm);
      padding: 0.875rem 1rem;
    }
    .konflik p { font-size: 0.875rem; margin: 0 0 0.75rem; color: var(--color-text); }
    .konflik-knoppies { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .stap-voet {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border);
    }
    .voet-vul { flex: 1; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    .map-header-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem 1rem;
      margin-bottom: 0.75rem;
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
    .view-toggle button + button {
      border-left: 1px solid var(--color-border);
    }
    .view-toggle button.active {
      background: var(--action-strong);
      color: #fff;
    }
    .photo-status-picker {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .photo-status-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-muted);
      white-space: nowrap;
    }
    .photo-status-select {
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      background: var(--color-surface);
      color: var(--color-text);
    }
    .photo-status-hint {
      font-weight: 600;
      color: var(--color-text);
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
    @media (max-width: 640px) {
      .stats-row { flex-direction: column; }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  @ViewChild('imageFileInput') imageFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild(RoadMapComponent) roadMap?: RoadMapComponent;

  private admin = inject(AdminService);
  private road = inject(RoadService);

  squares: Square[] = [];
  /** Lookup for squares, so per-block checks do not scan all 4000 each time. */
  private squaresById = new Map<number, Square>();
  /** Bound to the map; stable reference except when squares/view/photo overlay change. */
  mapDisplaySquares: Square[] = [];
  stats = { totalRaised: 0 };
  selectedIds = signal<Set<number>>(new Set());
  /** 1 = kies blokke, 2 = wat verander, 3 = stoor. The map stays visible in all three. */
  stap = signal<1 | 2 | 3>(1);
  viewMode = signal<MapViewMode>('status');
  photoViewStatus = signal<SquareStatus>(SquareStatus.Voorberei);
  photoSquareIds = signal<Set<number>>(new Set());

  private progressImages: AdminProgressImage[] = [];
  private undoExpiresAt: Date | null = null;
  private undoCountdownTimer: ReturnType<typeof setInterval> | null = null;
  private activeUndoBatchId: string | null = null;

  readonly maxBlockId = 4000;

  draftStatus: SquareStatus | null = null;
  draftImageCaption = '';
  draftImageFile: File | null = null;

  message = '';
  isError = false;
  saving = false;
  undoing = false;
  undoAvailable = signal(false);
  undoMinutesLeft = signal(0);
  imageConflictPrompt: { conflictingCount: number; totalSelected: number } | null = null;
  /** Snapshot of image status used for the open conflict prompt / pending upload. */
  pendingImageStatus: SquareStatus | null = null;

  STATUS_LABELS = STATUS_LABELS;
  STATUS_OPTIONS = STATUS_OPTIONS;
  PHOTO_VIEW_STATUSES = PHOTO_VIEW_STATUSES;
  STAP_NAME = STAP_NAME;
  readonly blokLabel = blokLabel;

  get hasUnsavedChanges(): boolean {
    return this.draftStatus !== null || this.draftImageFile !== null;
  }

  ngOnInit() {
    this.refresh();
    this.loadUndoState();
  }

  ngOnDestroy() {
    this.clearUndoCountdown();
  }

  private updateMapDisplaySquares() {
    if (this.viewMode() !== 'photos') {
      this.mapDisplaySquares = this.squares;
      return;
    }
    const ids = this.photoSquareIds();
    this.mapDisplaySquares = this.squares.map(sq => ({
      ...sq,
      imageCount: ids.has(sq.id) ? 1 : 0
    }));
  }

  onDraftChanged() {
    // Triggers change detection for hasUnsavedChanges when status select changes
  }

  setStatusView() {
    this.viewMode.set('status');
    this.updateMapDisplaySquares();
  }

  setPhotosView() {
    this.viewMode.set('photos');
    this.photoViewStatus.set(SquareStatus.Voorberei);
    this.loadPhotoOverlay();
  }

  onPhotoViewStatusChange(status: SquareStatus) {
    this.photoViewStatus.set(status);
    this.applyPhotoOverlayFromCache();
  }

  /**
   * Computed, not a method: the map re-styles all 4000 features whenever this input
   * reference changes, so a fresh array per change-detection tick froze the browser.
   */
  readonly selectedIdsArray = computed(() => Array.from(this.selectedIds()));

  toggleById(sqId: number) {
    if (this.imageConflictPrompt) return;
    const sq = this.squaresById.get(sqId);
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
      const sq = this.squaresById.get(id);
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
    this.stap.set(1);
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

  /** Removes a whole range chip from the selection. */
  removeRange(r: Reeks) {
    if (this.imageConflictPrompt) return;
    const selected = new Set(this.selectedIds());
    for (let id = r.van; id <= r.tot; id++) selected.delete(id);
    this.selectedIds.set(selected);
  }

  flyTo(id: number) {
    this.roadMap?.focusSquare(id, { showTooltip: true });
  }

  /** The selection as "1-15, 120", so steps 2 and 3 never hide what is being changed. */
  readonly keuseOpsomming = computed(() =>
    nommersNaReekse(this.selectedIdsArray()).map(reeksTeks).join(', '));

  /** Step 2 needs blocks; step 3 needs something to actually save. */
  kanNaStap(n: number): boolean {
    if (n <= 1) return true;
    if (this.selectedIds().size === 0) return false;
    return n === 2 || this.hasUnsavedChanges;
  }

  gaanNaStap(n: number) {
    if (n < 1 || n > 3 || !this.kanNaStap(n)) return;
    this.message = '';
    this.stap.set(n as 1 | 2 | 3);
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
    this.activeUndoBatchId = crypto.randomUUID();

    // Everything that can fail is checked before anything is written. The old order
    // committed the status PUT first, so a rejected or cancelled photo left the
    // statuses already changed with only the undo bar to recover.
    if (!this.draftImageFile) {
      this.commitStatusThenUpload(false);
      return;
    }

    const imageStatus = this.effectiveImageStatus();
    if (imageStatus === null) {
      this.message = 'Gekose blokke het verskillende statusse. Kies blokke met dieselfde status, of stel ’n nuwe status.';
      this.isError = true;
      this.saving = false;
      this.activeUndoBatchId = null;
      return;
    }

    this.pendingImageStatus = imageStatus;
    // A read, so nothing is committed yet even when this opens the prompt.
    this.admin.checkImageConflicts(Array.from(this.selectedIds()), imageStatus).subscribe({
      next: (result) => {
        if (result.conflictingSquareIds.length > 0) {
          this.imageConflictPrompt = {
            conflictingCount: result.conflictingSquareIds.length,
            totalSelected: result.totalSelected
          };
          this.saving = false;
        } else {
          this.commitStatusThenUpload(false);
        }
      },
      error: (err) => {
        this.pendingImageStatus = null;
        this.message = err.error?.message || 'Kon nie konflikte kontroleer nie.';
        this.isError = true;
        this.saving = false;
        this.activeUndoBatchId = null;
      }
    });
  }

  /** The only place that writes. Status first, then the photo, under one undo batch. */
  private commitStatusThenUpload(replaceExisting: boolean) {
    const afterStatus = () => {
      if (this.draftImageFile) this.performUpload(replaceExisting);
      else this.finishSaveSuccess(this.buildStatusOnlyMessage());
    };

    if (this.draftStatus === null) {
      afterStatus();
      return;
    }

    const ids = Array.from(this.selectedIds());
    this.admin.updateStatus(ids, this.draftStatus, this.activeUndoBatchId ?? undefined).subscribe({
      next: () => afterStatus(),
      error: (err) => {
        this.message = err.error?.message || 'Statusopdatering het misluk.';
        this.isError = true;
        this.saving = false;
        this.activeUndoBatchId = null;
        this.loadUndoState();
      }
    });
  }

  confirmUpload(replaceExisting: boolean) {
    this.saving = true;
    this.imageConflictPrompt = null;
    this.commitStatusThenUpload(replaceExisting);
  }

  cancelConflictPrompt() {
    // Nothing was written, so this is a clean abort back to the drafts.
    this.imageConflictPrompt = null;
    this.pendingImageStatus = null;
    this.activeUndoBatchId = null;
    this.saving = false;
  }

  private performUpload(replaceExisting: boolean) {
    if (!this.draftImageFile || this.selectedIds().size === 0) return;

    const imageStatus = this.pendingImageStatus ?? this.effectiveImageStatus();
    if (imageStatus === null) {
      this.message = 'Gekose blokke het verskillende statusse. Kies blokke met dieselfde status, of stel ’n nuwe status.';
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

    this.admin.uploadProgressImage(formData, replaceExisting, this.activeUndoBatchId ?? undefined).subscribe({
      next: (res) => {
        this.finishSaveSuccess(statusPart + this.buildUploadSuccessMessage(res));
      },
      error: (err) => {
        this.message = err.error?.message || 'Foto-oplaai het misluk.';
        this.isError = true;
        this.saving = false;
        this.activeUndoBatchId = null;
        this.loadUndoState();
      }
    });
  }

  undoLastSave() {
    if (!this.undoAvailable() || this.undoing) return;
    this.undoing = true;
    this.message = '';
    this.isError = false;
    this.admin.undoLast().subscribe({
      next: (res) => {
        this.undoing = false;
        this.clearUndoState();
        this.message = res.message || 'Laaste stoor is ongedaan gemaak.';
        this.isError = false;
        this.refresh();
      },
      error: (err) => {
        this.undoing = false;
        this.clearUndoState();
        this.message = err.error?.message || 'Kon nie ongedaan maak nie.';
        this.isError = true;
        this.loadUndoState();
      }
    });
  }

  private finishSaveSuccess(msg: string) {
    this.message = msg;
    this.isError = false;
    this.saving = false;
    this.activeUndoBatchId = null;
    this.cancelDrafts();
    this.selectedIds.set(new Set());
    this.stap.set(1);
    this.refresh();
    this.loadUndoState();
  }

  private buildStatusOnlyMessage(): string {
    const n = this.selectedIds().size;
    return `${n} ${blokLabel(n)} se status opgedateer.`;
  }

  private buildUploadSuccessMessage(res: { squareCount: number; replacedCount?: number; skippedCount?: number }) {
    const label = blokLabel(res.squareCount);
    let msg = `Foto opgelaai vir ${res.squareCount} ${label}.`;
    if (res.skippedCount && res.skippedCount > 0) {
      msg = `Foto opgelaai vir ${res.squareCount} ${label} (${res.skippedCount} het reeds ’n foto en is oorgeslaan).`;
    } else if (res.replacedCount && res.replacedCount > 0) {
      msg = `Foto opgelaai vir ${res.squareCount} ${label} (${res.replacedCount} bestaande foto’s vervang).`;
    }
    return msg;
  }

  private resetImageInput() {
    if (this.imageFileInput?.nativeElement) {
      this.imageFileInput.nativeElement.value = '';
    }
  }

  private loadPhotoOverlay() {
    this.admin.getProgressImages().subscribe({
      next: (images) => {
        this.progressImages = images;
        this.applyPhotoOverlayFromCache();
      },
      error: () => {
        this.progressImages = [];
        this.photoSquareIds.set(new Set());
        this.updateMapDisplaySquares();
        this.message = 'Kon nie fotodata laai nie.';
        this.isError = true;
      }
    });
  }

  private applyPhotoOverlayFromCache() {
    const status = this.photoViewStatus();
    const ids = new Set<number>();
    for (const image of this.progressImages) {
      if (Number(image.status) === status) {
        for (const squareId of image.squareIds) {
          ids.add(squareId);
        }
      }
    }
    this.photoSquareIds.set(ids);
    this.updateMapDisplaySquares();
  }

  private refresh() {
    this.admin.getStats().subscribe({
      next: s => this.stats = { totalRaised: s.totalRaised ?? 0 },
      error: () => {
        this.message = 'Kon nie statistieke laai nie.';
        this.isError = true;
      }
    });
    this.road.getSquares().subscribe(s => {
      this.squares = s;
      this.squaresById = new Map(s.map(sq => [sq.id, sq]));
      this.updateMapDisplaySquares();
    });
    if (this.viewMode() === 'photos') {
      this.loadPhotoOverlay();
    }
  }

  private loadUndoState() {
    this.admin.getUndoLast().subscribe({
      next: (info) => this.applyUndoInfo(info),
      error: () => this.clearUndoState()
    });
  }

  private applyUndoInfo(info: UndoLastInfo) {
    if (!info.available || !info.expiresAt) {
      this.clearUndoState();
      return;
    }
    this.undoExpiresAt = this.parseUtcDate(info.expiresAt);
    this.tickUndoCountdown();
    this.clearUndoCountdown();
    this.undoCountdownTimer = setInterval(() => this.tickUndoCountdown(), 15_000);
  }

  /** Treat API timestamps without Z as UTC (SQLite/EF often omit the offset). */
  private parseUtcDate(value: string): Date {
    const trimmed = value.trim();
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
      return new Date(trimmed);
    }
    return new Date(trimmed.endsWith('Z') ? trimmed : `${trimmed}Z`);
  }

  private tickUndoCountdown() {
    if (!this.undoExpiresAt) {
      this.clearUndoState();
      return;
    }
    const msLeft = this.undoExpiresAt.getTime() - Date.now();
    if (msLeft <= 0) {
      this.clearUndoState();
      return;
    }
    this.undoAvailable.set(true);
    this.undoMinutesLeft.set(Math.max(1, Math.ceil(msLeft / 60_000)));
  }

  private clearUndoState() {
    this.undoAvailable.set(false);
    this.undoMinutesLeft.set(0);
    this.undoExpiresAt = null;
    this.clearUndoCountdown();
  }

  private clearUndoCountdown() {
    if (this.undoCountdownTimer !== null) {
      clearInterval(this.undoCountdownTimer);
      this.undoCountdownTimer = null;
    }
  }
}
