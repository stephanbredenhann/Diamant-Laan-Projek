import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SettingsService } from '../../services/settings.service';
import { HomeStatsSettings } from '../../models/site-settings';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-content">
      <h3>Tuisblad instellings</h3>

      @if (loading) {
        <p class="muted">Laai instellings...</p>
      } @else {
        <div class="settings-card">
          <label class="toggle-row" [class.disabled]="saving">
            <input
              type="checkbox"
              [ngModel]="settings.showStatsSection"
              (ngModelChange)="onShowStatsSectionChange($event)"
              [disabled]="saving" />
            <span>Wys statistieke-afdeling op tuisblad</span>
          </label>

          <label class="toggle-row" [class.disabled]="saving">
            <input
              type="checkbox"
              [ngModel]="settings.showTotalRaised"
              (ngModelChange)="onShowTotalRaisedChange($event)"
              [disabled]="saving" />
            <span>Wys totale ingesamelde bedrag</span>
          </label>
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
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      color: var(--color-text);
      cursor: pointer;
    }
    .toggle-row:last-child { margin-bottom: 0; }
    .toggle-row.disabled { opacity: 0.6; cursor: not-allowed; }
    .toggle-row input {
      width: 18px;
      height: 18px;
      accent-color: var(--color-orange);
      cursor: pointer;
    }
    .toggle-row.disabled input { cursor: not-allowed; }
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
export class AdminSettingsComponent implements OnInit, OnDestroy {
  private settingsService = inject(SettingsService);
  private destroy$ = new Subject<void>();

  settings: HomeStatsSettings = { showStatsSection: true, showTotalRaised: true };
  loading = true;
  saving = false;
  message = '';
  isError = false;

  ngOnInit() {
    this.settingsService.getHomeStatsSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          this.settings = value;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.showError('Kon nie instellings laai nie.');
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onShowStatsSectionChange(value: boolean) {
    const previousSettings = { ...this.settings };
    this.settings = { ...this.settings, showStatsSection: value };
    this.save(previousSettings);
  }

  onShowTotalRaisedChange(value: boolean) {
    const previousSettings = { ...this.settings };
    this.settings = { ...this.settings, showTotalRaised: value };
    this.save(previousSettings);
  }

  save(previousSettings?: HomeStatsSettings) {
    if (this.saving) return;

    this.message = '';
    this.isError = false;
    this.saving = true;

    const revertTo = previousSettings ?? { ...this.settings };
    const valuesSent = { ...this.settings };

    this.settingsService.updateHomeStatsSettings(valuesSent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.message = 'Instellings gestoor.';

          const changed =
            this.settings.showStatsSection !== valuesSent.showStatsSection ||
            this.settings.showTotalRaised !== valuesSent.showTotalRaised;

          if (changed) {
            this.save();
          }
        },
        error: () => {
          this.settings = revertTo;
          this.saving = false;
          this.showError('Kon nie instellings stoor nie.');
        }
      });
  }

  private showError(text: string) {
    this.message = text;
    this.isError = true;
  }
}
