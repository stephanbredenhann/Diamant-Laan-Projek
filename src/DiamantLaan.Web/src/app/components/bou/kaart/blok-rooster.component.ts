import { Component, computed, input, output } from '@angular/core';
import { Square } from '../../../models/square';
import { BlokStaat, blokState } from './blok-staat';

/**
 * The same hundred blocks as a plain grid of big buttons.
 *
 * On a phone the road-shaped strip is unusable: seventeen blocks across a
 * 360 px screen leaves each one about twenty pixels wide, which is below any
 * reasonable tap target and far below readable. Here the road's shape is given
 * up on purpose. What is left is what actually matters on a phone: a big
 * number, a clear colour, and a target nobody can miss. The overview map above
 * still shows where the stretch is.
 */
@Component({
  selector: 'app-blok-rooster',
  standalone: true,
  template: `
    <ul class="rooster" [attr.aria-label]="'Blokke ' + van() + ' tot ' + tot()">
      @for (b of blokke(); track b.id) {
        <li>
          <button
            type="button"
            [class]="'blok ' + b.klas"
            [class.beklemtoon]="beklemtoon() === b.id"
            [disabled]="!b.kiesbaar"
            [attr.aria-pressed]="b.kiesbaar ? b.klas === 'gekies' : null"
            [attr.aria-label]="b.etiket"
            (click)="kies(b)"
          >
            @if (b.klas === 'onbeskikbaar') {
              <span class="streep" aria-hidden="true">&times;</span>
            } @else {
              <span class="nommer">{{ b.id }}</span>
            }
            @if (b.klas === 'gekies') {
              <span class="tiek" aria-hidden="true">&check;</span>
            }
          </button>
        </li>
      }
    </ul>
  `,
  styles: [`
    :host { display: block; }
    .rooster {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(4.75rem, 1fr));
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .blok {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 4rem;
      padding: 0.5rem 0.25rem;
      border: 2px solid var(--border-soft);
      font-family: var(--font-display);
      cursor: pointer;
    }
    .nommer {
      font-size: 1.4rem;
      font-weight: 800;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .tiek {
      position: absolute;
      top: 0.15rem;
      right: 0.3rem;
      font-size: 1rem;
      line-height: 1;
    }
    .streep { font-size: 1.5rem; line-height: 1; opacity: 0.55; }

    .beskikbaar { background: var(--blok-beskikbaar); color: var(--ink); }
    .gekies {
      background: var(--blok-gekies);
      border-color: var(--ink);
      color: #FFFFFF;
    }
    .verkoop { background: var(--blok-verkoop); color: #FFFFFF; }
    .onbeskikbaar { background: var(--blok-onbeskikbaar); color: #FFFFFF; }
    .blok:disabled { cursor: not-allowed; opacity: 1; }

    .beklemtoon {
      outline: 4px solid var(--ob-blue);
      outline-offset: 2px;
    }
  `]
})
export class BlokRoosterComponent {
  readonly van = input.required<number>();
  readonly tot = input.required<number>();
  readonly squares = input<Square[]>([]);
  readonly selectedIds = input<number[]>([]);
  readonly beklemtoon = input<number | null>(null);

  readonly blokGekliek = output<number>();

  readonly blokke = computed(() =>
    blokState(this.van(), this.tot(), this.squares(), this.selectedIds()));

  kies(b: BlokStaat) {
    if (b.kiesbaar) this.blokGekliek.emit(b.id);
  }
}
