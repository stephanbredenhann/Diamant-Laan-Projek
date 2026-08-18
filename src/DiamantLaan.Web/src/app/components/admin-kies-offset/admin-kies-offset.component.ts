import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-kies-offset',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-content">
      <h3>Kies vir my — offset</h3>

      @if (loading) {
        <p class="muted">Laai instelling...</p>
      } @else {
        <div class="settings-card">
          <p class="intro">
            Vanaf watter blok moet nuwe “Kies vir my”-blokke toegeken word? Die offset is
            inklusief: tik 2000 in en blok 2000 self is die eerste een wat uitgedeel word.
          </p>

          <div class="offset-row">
            <label for="offset">Ken toe vanaf blok</label>
            <input
              id="offset"
              type="number"
              min="0"
              max="4000"
              step="1"
              [(ngModel)]="offset"
              [disabled]="saving" />
            <button class="btn btn-primary" (click)="save()" [disabled]="saving">
              {{ saving ? 'Besig...' : 'Stoor' }}
            </button>
          </div>

          <p class="hint">
            @if (savedOffset > 0) {
              <strong>{{ availableAtOrAboveOffset | number }}</strong> beskikbare blokke vanaf
              blok {{ savedOffset | number }}.
              @if (availableAtOrAboveOffset === 0) {
                <span class="warn">Die reeks is op — toekennings val terug na die laagste beskikbare blokke.</span>
              }
            } @else {
              Offset is af. Blokke word van die laagste beskikbare nommer af toegeken.
            }
          </p>

          <p class="note">
            Gebruik <strong>0</strong> om die offset af te skakel. Raak die reeks bo die offset
            op, val toekennings vanself terug na die laagste beskikbare blokke — niks misluk nie.
          </p>
        </div>
      }

      @if (message) {
        <div class="msg" [class.error]="isError">{{ message }}</div>
      }
    </div>
  `,
  styles: [`
    .admin-content { max-width: 600px; }
    h3 {
      font-family: var(--font-heading);
      font-size: 1.125rem;
      margin-bottom: 1rem;
      color: var(--color-text);
    }
    .muted { color: var(--color-muted); }
    .settings-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    .intro {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--color-text);
    }
    .offset-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .offset-row label {
      font-size: 0.875rem;
      color: var(--color-text);
    }
    .offset-row input {
      width: 7rem;
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: #fff;
      color: var(--color-text);
      font-size: 0.9375rem;
    }
    .offset-row input:disabled { opacity: 0.6; }
    .hint {
      margin: 1rem 0 0;
      font-size: 0.8125rem;
      color: var(--color-text);
    }
    .hint .warn { display: block; margin-top: 0.25rem; color: #B45309; }
    .note {
      margin: 0.75rem 0 0;
      font-size: 0.75rem;
      color: var(--color-muted);
      line-height: 1.5;
    }
    .msg {
      margin-top: 1rem;
      font-size: 0.8125rem;
      padding: 0.625rem 1rem;
      border-radius: var(--radius-sm);
      background: #E8ECD8;
      color: #5A6A32;
    }
    .msg.error {
      background: #FEF2F2;
      color: #DC2626;
    }
  `]
})
export class AdminKiesOffsetComponent implements OnInit {
  private admin = inject(AdminService);

  /** Bound to the input, so it can drift from savedOffset until Stoor is pressed. */
  offset = 0;
  savedOffset = 0;
  availableAtOrAboveOffset = 0;

  loading = true;
  saving = false;
  message = '';
  isError = false;

  ngOnInit() {
    this.admin.getKiesVirMyOffset().subscribe({
      next: (value) => {
        this.offset = value.offset;
        this.savedOffset = value.offset;
        this.availableAtOrAboveOffset = value.availableAtOrAboveOffset;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.showError(err.status === 401 || err.status === 403
          ? 'Geen toegang nie. Meld asseblief weer as admin aan.'
          : 'Kon nie die offset laai nie.');
      }
    });
  }

  save() {
    if (this.saving) return;

    // The input is type=number, so a cleared field arrives as null and a decimal as a float.
    const value = Math.trunc(Number(this.offset));
    if (!Number.isFinite(value) || value < 0 || value > 4000) {
      this.showError('Offset moet tussen 0 en 4000 wees.');
      return;
    }

    this.message = '';
    this.isError = false;
    this.saving = true;

    this.admin.setKiesVirMyOffset(value).subscribe({
      next: (result) => {
        this.offset = result.offset;
        this.savedOffset = result.offset;
        this.availableAtOrAboveOffset = result.availableAtOrAboveOffset;
        this.saving = false;
        this.message = 'Offset gestoor.';
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.showError(err.error?.message ?? 'Kon nie die offset stoor nie.');
      }
    });
  }

  private showError(text: string) {
    this.message = text;
    this.isError = true;
  }
}
