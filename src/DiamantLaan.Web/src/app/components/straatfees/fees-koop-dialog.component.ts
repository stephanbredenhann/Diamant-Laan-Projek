import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StraatfeesInfo, StraatfeesService, postToPayFast } from '../../services/straatfees.service';
import { randBedrag } from '../../utils/afrikaans.util';
import { validateEmail } from '../../utils/validation.util';
import { TPipe } from '../../i18n/t.pipe';

/** The ticket purchase dialog: name, email and ticket count, then off to PayFast. No account. */
@Component({
  selector: 'app-fees-koop-dialog',
  standalone: true,
  imports: [FormsModule, TPipe],
  template: `
    <dialog #dialog class="fees-dialog" (close)="fout.set(null)" [attr.aria-label]="'Koop kaartjies' | t">
      <form (ngSubmit)="koop()" class="fees-form" novalidate>
        <div class="fees-form__kop">
          <h2>{{ 'Koop kaartjies' | t }}</h2>
          <button type="button" class="sluit" (click)="dialog.close()" [attr.aria-label]="'Maak toe' | t">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="fees-form__uitleg">{{ 'Geen rekening nodig nie. Ons e-pos jou kaartjie sodra jy betaal het.' | t }}</p>

        <label for="fees-naam">{{ 'Naam en van' | t }}</label>
        <input id="fees-naam" name="naam" type="text" autocomplete="name" [(ngModel)]="naam" required maxlength="120" />

        <label for="fees-epos">{{ 'E-posadres' | t }}</label>
        <input id="fees-epos" name="epos" type="email" autocomplete="email" [(ngModel)]="epos" required />

        <label for="fees-aantal">{{ 'Aantal kaartjies' | t }}</label>
        <div class="stepper">
          <button type="button" (click)="stel(aantal() - 1)" [disabled]="aantal() <= 1" [attr.aria-label]="'Een minder' | t">−</button>
          <input id="fees-aantal" name="aantal" type="number" inputmode="numeric" min="1" [max]="maks()"
                 [ngModel]="aantal()" (ngModelChange)="stel($event)" />
          <button type="button" (click)="stel(aantal() + 1)" [disabled]="aantal() >= maks()" [attr.aria-label]="'Een meer' | t">+</button>
        </div>

        <div class="totaal">
          <span>{{ 'Totaal' | t }}</span>
          <strong class="tabular">{{ totaal() }}</strong>
        </div>

        @if (fout(); as f) {
          <p class="fees-fout" role="alert">{{ f | t }}</p>
        }

        <button type="submit" class="btn btn-primary btn-xl" [disabled]="besig()">
          {{ (besig() ? 'Gaan na PayFast...' : 'Betaal met PayFast') | t }}
        </button>
      </form>
    </dialog>
  `,
  styles: [`
    .fees-dialog {
      border: none;
      border-radius: var(--radius-lg);
      padding: 0;
      width: min(28rem, calc(100vw - 2rem));
      margin: auto;
      box-shadow: 0 24px 60px rgba(20, 30, 60, 0.3);
    }
    .fees-dialog::backdrop { background: rgba(15, 25, 50, 0.55); }
    .fees-form { display: flex; flex-direction: column; padding: 1.5rem; }
    .fees-form__kop { display: flex; align-items: center; justify-content: space-between; border-top: 4px solid var(--fees-blue); margin: -1.5rem -1.5rem 0.75rem; padding: 1.25rem 1.5rem 0; }
    .fees-form__kop h2 { font-size: var(--fs-2xl); }
    .sluit { background: none; padding: 0.25rem; min-height: auto; color: var(--text-muted); }
    .sluit:hover { color: var(--ink); }
    .fees-form__uitleg { color: var(--text-muted); font-size: var(--fs-sm); margin-bottom: 1.25rem; }
    .fees-form label { font-weight: 600; margin-bottom: 0.35rem; }
    .fees-form input { margin-bottom: 1rem; width: 100%; }
    .stepper { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .stepper input { margin: 0; text-align: center; font-weight: 700; font-size: var(--fs-lg); -moz-appearance: textfield; }
    .stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .stepper button { background: var(--fees-blue-soft); color: var(--fees-blue); font-size: 1.5rem; padding: 0 1.1rem; flex-shrink: 0; }
    .stepper button:hover:not(:disabled) { background: color-mix(in srgb, var(--fees-blue) 18%, white); }
    .totaal { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--border-soft); padding: 0.85rem 0 1.1rem; font-size: var(--fs-lg); }
    .totaal strong { font-family: var(--font-display); font-size: var(--fs-2xl); color: var(--fees-blue); }
    .fees-fout { color: #B3261E; font-size: var(--fs-sm); margin-bottom: 0.85rem; }
  `]
})
export class FeesKoopDialogComponent {
  private service = inject(StraatfeesService);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  info = input<StraatfeesInfo | null>(null);

  naam = '';
  epos = '';
  aantal = signal(1);
  besig = signal(false);
  fout = signal<string | null>(null);

  maks = computed(() => this.info()?.maxPerOrder ?? 20);
  totaal = computed(() => randBedrag((this.info()?.ticketPrice ?? 0) * this.aantal()));

  open() {
    this.fout.set(null);
    const el = this.dialog().nativeElement;
    if (!el.open) el.showModal();
  }

  stel(value: number | string) {
    const n = Math.floor(Number(value));
    this.aantal.set(Number.isFinite(n) ? Math.min(this.maks(), Math.max(1, n)) : 1);
  }

  koop() {
    if (this.naam.trim().length < 2) return this.fout.set('Vul asseblief jou naam in.');
    const eposFout = validateEmail(this.epos);
    if (eposFout) return this.fout.set(eposFout);

    this.fout.set(null);
    this.besig.set(true);
    this.service.order(this.naam.trim(), this.epos.trim(), this.aantal()).subscribe({
      next: form => postToPayFast(form),
      error: err => {
        this.besig.set(false);
        this.fout.set(err.error?.message || 'Kon nie PayFast betaling voorberei nie.');
      }
    });
  }
}
