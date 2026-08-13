import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertComponent } from '../shared/alert/alert.component';
import { blokLabel } from '../../utils/afrikaans.util';
import { Reeks, nommersNaReekse, ontleedBlokNommers, reeksTeks } from '../../utils/blok-nommers';

/**
 * Step 1 of the admin map flow: pick the blocks to work on.
 *
 * Presentational on purpose. It holds no services and makes no requests, so the
 * parsing and the chip arithmetic can be tested without an HTTP harness. The
 * parent owns the selection; this panel only reports what the admin asked for.
 */
@Component({
  selector: 'app-blok-keuse-paneel',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent],
  template: `
    <div class="keuse-paneel">
      <label for="blok-invoer">Tik bloknommers</label>
      <div class="invoer-ry">
        <input
          id="blok-invoer"
          type="text"
          [(ngModel)]="invoer"
          (keydown.enter)="voegBy()"
          placeholder="Bv. 1-50, 120, 300-310" />
        <button type="button" class="btn btn-primary" (click)="voegBy()">Voeg by</button>
      </div>
      <p class="hint">
        Skei met kommas. Gebruik ’n koppelteken vir ’n reeks. Jy kan ook op die kaart
        hieronder klik of sleep.
      </p>

      <app-alert [message]="fout()" type="error" />

      <div class="keuse-opsomming">
        @if (selectedIds().length === 0) {
          <p class="leeg">Nog geen blokke gekies nie.</p>
        } @else {
          <p class="telling" aria-live="polite">
            {{ selectedIds().length }} {{ blokLabel(selectedIds().length) }} gekies
          </p>
          <ul class="reekse">
            @for (r of reekse(); track r.van) {
              <li>
                <button
                  type="button"
                  class="reeks-blokkie"
                  (click)="removeRange.emit(r)"
                  [attr.aria-label]="'Haal ' + reeksTeks(r) + ' af'">
                  <span class="reeks-nommer">{{ reeksTeks(r) }}</span>
                  <span class="reeks-af" aria-hidden="true">Haal af</span>
                </button>
              </li>
            }
          </ul>
          <button type="button" class="btn btn-outline maak-skoon" (click)="clearAll.emit()">
            Maak keuses skoon
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.375rem;
      color: var(--color-text);
    }
    .invoer-ry { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .invoer-ry input {
      flex: 1 1 14rem;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 1rem;
    }
    .hint { font-size: 0.8125rem; color: var(--color-muted); margin: 0.5rem 0 1rem; }
    .keuse-opsomming { border-top: 1px solid var(--color-border); padding-top: 1rem; }
    .leeg { color: var(--color-muted); margin: 0; }
    .telling { font-weight: 600; color: var(--color-text); margin: 0 0 0.75rem; }
    .reekse {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
    }
    /* The whole chip removes its range, matching the bou wizard's selection chips. */
    .reeks-blokkie {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.1rem;
      min-width: 5rem;
      min-height: var(--tap-min);
      padding: 0.4rem 0.6rem;
      background: var(--blok-gekies);
      border: 2px solid #FFFFFF;
      border-radius: var(--radius-sm);
      color: #FFFFFF;
      cursor: pointer;
    }
    .reeks-blokkie:hover,
    .reeks-blokkie:focus-visible { background: var(--blok-verkoop); }
    .reeks-nommer {
      font-size: 1rem;
      font-weight: 800;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .reeks-af {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .maak-skoon { font-size: 0.875rem; }
  `]
})
export class BlokKeusePaneelComponent {
  selectedIds = input<number[]>([]);
  maxBlockId = input(4000);

  /** Block numbers the admin asked to add. */
  addIds = output<number[]>();
  /** A whole range chip the admin removed. */
  removeRange = output<Reeks>();
  clearAll = output<void>();
  /** The first added block, so the parent can fly the map to it. */
  flyTo = output<number>();

  readonly blokLabel = blokLabel;
  readonly reeksTeks = reeksTeks;

  invoer = '';
  fout = signal('');

  reekse = computed(() => nommersNaReekse(this.selectedIds()));

  voegBy() {
    const { ids, fout } = ontleedBlokNommers(this.invoer, this.maxBlockId());
    if (fout) {
      this.fout.set(fout);
      return;
    }

    this.fout.set('');
    this.invoer = '';
    this.addIds.emit(ids);
    this.flyTo.emit(ids[0]);
  }
}
