import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../../services/purchase.service';
import { randBedrag } from '../../../utils/afrikaans.util';
import { BouStepBarComponent } from '../../shared/bou-step-bar/bou-step-bar.component';
import { TPipe } from '../../../i18n/t.pipe';

const PRYS_PER_METER = 500;
const MAKS_PER_TRANSAKSIE = 50;

/**
 * Step 1 of the donation wizard — amount selection (Bydrae).
 */
@Component({
  selector: 'app-bou-stap1',
  standalone: true,
  imports: [FormsModule, BouStepBarComponent, RouterLink, TPipe],
  template: `
    <div class="container-wide bou-shell">
      <div class="header-row">
        <div>
          <p class="eyebrow page-eyebrow">{{ 'Stap 1 van 4 · Hoeveelheid' | t }}</p>
          <div class="visually-hidden" aria-live="polite">{{ stepAnnouncement | t }}</div>
          <h1 class="page-title">{{ 'Hoeveel blokkies m² gaan jy borg?' | t }}</h1>
          <p class="page-lead">{{ 'Elke blokkie m² het ’n unieke nommer. Kies hoeveel blokkies jy wil borg en versamel ’n sertifikaat vir elke blokkie.' | t }}</p>
        </div>
      </div>

      <app-bou-step-bar [active]="1" />

      <div class="layout">
        <div>
          <div class="choices" role="group" [attr.aria-label]="'Hoeveel vierkante meter' | t">
            @for (opt of presets; track opt) {
              <button
                type="button"
                class="choice-btn"
                [class.active]="!eieModus() && gekoseAantal() === opt"
                (click)="kiesPreset(opt)"
              >
                <span class="choice-number">{{ opt }} <small>m²</small></span>
                <span class="choice-price">{{ randBedrag(opt * prysPerMeter) }}</span>
              </button>
            }
            <button
              type="button"
              class="choice-btn choice-eie"
              [class.active]="eieModus()"
              (click)="kiesEie()"
            >
              <span class="choice-eie-label">{{ 'Eie hoeveelheid' | t }}</span>
              <span class="choice-caption">{{ 'Besluit self hoeveel blokkies jy wil borg' | t }}</span>
            </button>
          </div>

          @if (eieModus()) {
            <div class="eie-panel">
              <p class="eyebrow">{{ 'Jou hoeveelheid' | t }}</p>
              <div class="stepper">
                <button type="button" class="stepper-btn" (click)="veranderEie(-1)" [attr.aria-label]="'Verminder hoeveelheid' | t">−</button>
                <input
                  id="eie-aantal"
                  type="number"
                  name="eieAantal"
                  min="1"
                  max="50"
                  inputmode="numeric"
                  [attr.aria-label]="'Aantal vierkante meter' | t"
                  [ngModel]="eieWaarde()"
                  (ngModelChange)="opEieVerander($event)"
                >
                <button type="button" class="stepper-btn" (click)="veranderEie(1)" [attr.aria-label]="'Verhoog hoeveelheid' | t">+</button>
              </div>
              @if (eieFout()) {
                <p class="error-alert">{{ eieFout() | t }}</p>
              }
              <p class="eie-hint">{{ 'Elke blokkie verteenwoordig 1 m² van die pad en ’n bydrae van R500.' | t }}</p>
            </div>
          }
        </div>

        <aside class="summary-card" aria-live="polite">
          <p class="eyebrow">{{ 'Hoeveelheid' | t }}</p>
          <p class="summary-meters">{{ gekoseAantal() || '—' }} <span>m²</span></p>
          <p class="summary-total">{{ gekoseAantal() ? randBedrag(totaalBedrag()) : 'R0' }}</p>
          <p class="summary-note">{{ 'R500 per m²' | t }}</p>
          <button type="button" class="btn btn-primary btn-xl" (click)="gaanVoort()" [disabled]="!kanGaanVoort()">
            {{ 'Gaan voort' | t }}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <a routerLink="/" class="btn btn-outline btn-terug">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            {{ 'Gaan terug' | t }}
          </a>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .header-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }
    .layout {
      display: grid;
      gap: 2rem;
      grid-template-columns: 1fr 360px;
      align-items: start;
    }
    .choices {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .choice-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      min-height: 8rem;
      padding: 1.25rem;
      background: var(--surface);
      border: 2px solid var(--border-soft);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-body);
      transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    }
    .choice-btn:hover {
      border-color: var(--action);
      transform: translateY(-2px);
    }
    .choice-btn.active {
      border-color: var(--action);
      background: color-mix(in srgb, var(--action) 8%, white);
      box-shadow: var(--shadow-cta);
    }
    .choice-number {
      font-family: var(--font-display);
      font-size: 3.5rem;
      font-weight: 800;
      color: var(--action);
      line-height: 0.9;
    }
    .choice-number small {
      font-size: 1.5rem;
      color: var(--ink);
    }
    .choice-caption {
      font-size: 1rem;
      color: var(--text-muted);
    }
    .choice-price {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--ink);
      margin-top: auto;
    }
    .choice-eie-label {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 0.95;
      color: var(--ink);
    }
    .eie-panel {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border-soft);
    }
    .stepper {
      display: grid;
      grid-template-columns: 3.5rem 1fr 3.5rem;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .stepper-btn {
      font-size: 1.75rem;
      background: var(--bg-chalk);
      border: 2px solid var(--border-soft);
      color: var(--ink);
    }
    .stepper input {
      text-align: center;
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 800;
    }
    .eie-hint { color: var(--text-muted); font-size: 1rem; }
    .summary-card {
      background: var(--tar);
      color: #fff;
      padding: 1.75rem;
      position: sticky;
      top: 5.5rem;
    }
    .summary-card .eyebrow { color: rgba(255,255,255,0.55); }
    .summary-meters {
      font-family: var(--font-display);
      font-size: 4rem;
      font-weight: 800;
      line-height: 1;
      margin: 0.75rem 0 0.25rem;
    }
    .summary-meters span { font-size: 1.5rem; opacity: 0.7; }
    .summary-total {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--action);
    }
    .summary-note {
      color: rgba(255,255,255,0.65);
      margin: 0.75rem 0 1.5rem;
      font-size: 1rem;
    }
    .summary-card .btn-primary { width: 100%; }
    /* The card sits on --tar, so the blue outline would fall below AA there. */
    .summary-card .btn-terug {
      margin-top: 0.75rem;
      width: 100%;
      border-color: rgba(255, 255, 255, 0.55);
      color: #fff;
    }
    .summary-card .btn-terug:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .summary-card { position: static; }
    }
    /* Phones: two cards per row leaves ~150px each, which crushes the big
       numbers. One card per row instead, number left, wording right. */
    @media (max-width: 600px) {
      .choices { grid-template-columns: 1fr; gap: 0.75rem; }
      .choice-btn {
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: 1rem;
        align-items: center;
        min-height: 0;
        padding: 1rem 1.25rem;
      }
      .choice-number { grid-row: span 2; font-size: 2.75rem; }
      .choice-number small { font-size: 1.25rem; }
      .choice-caption { align-self: end; }
      .choice-price { align-self: start; margin-top: 0; }
      .choice-eie { grid-template-columns: 1fr; row-gap: 0.15rem; }
      .choice-eie-label { font-size: 1.75rem; }
      .eie-panel { margin-top: 1rem; padding: 1rem; }
      .stepper { grid-template-columns: 3.5rem 1fr 3.5rem; margin: 0.75rem 0; }
      .summary-card { padding: 1.25rem; }
      .summary-head { display: grid; grid-template-columns: 1fr 1fr; align-items: baseline; gap: 1rem; }
      .summary-meters { font-size: 2.75rem; margin: 0.35rem 0 0; }
      .summary-total { font-size: 2.25rem; }
      .summary-note { margin: 0.5rem 0 1rem; }
    }
    /* Phones: two cards per row leaves ~150px each, which crushes the big
       numbers. One card per row instead, number left, wording right. */
    @media (max-width: 600px) {
      .choices { grid-template-columns: 1fr; gap: 0.75rem; }
      .choice-btn {
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: 1rem;
        align-items: center;
        min-height: 0;
        padding: 1rem 1.25rem;
      }
      .choice-number { grid-row: span 2; font-size: 2.75rem; }
      .choice-number small { font-size: 1.25rem; }
      .choice-caption { align-self: end; }
      .choice-price { align-self: start; margin-top: 0; }
      .choice-eie { grid-template-columns: 1fr; row-gap: 0.15rem; }
      .choice-eie-label { font-size: 1.75rem; }
      .eie-panel { margin-top: 1rem; padding: 1rem; }
      .stepper { grid-template-columns: 3.5rem 1fr 3.5rem; margin: 0.75rem 0; }
      .summary-card { padding: 1.25rem; }
      .summary-meters { font-size: 2.75rem; margin: 0.35rem 0 0; }
      .summary-total { font-size: 2.25rem; }
      .summary-note { margin: 0.5rem 0 1rem; }
    }
  `]
})
export class BouStap1Component implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private purchase = inject(PurchaseService);

  readonly presets = [1, 2, 5] as const;
  readonly prysPerMeter = PRYS_PER_METER;
  readonly randBedrag = randBedrag;

  private preset = signal<number>(1);
  eieModus = signal(false);
  eieWaarde = signal<number | null>(null);
  eieFout = signal<string | null>(null);
  stepAnnouncement = 'Stap 1 van 4: Hoeveel blokkies m² gaan jy borg?';

  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get('aantal');
    if (!raw) return;

    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) return;

    if ((this.presets as readonly number[]).includes(n)) {
      this.kiesPreset(n);
    } else {
      this.eieWaarde.set(n);
      this.kiesEie();
    }
  }

  gekoseAantal = computed(() => {
    if (this.eieModus()) {
      return this.geldigeEieWaarde() ?? 0;
    }
    return this.preset();
  });

  totaalBedrag = computed(() => this.gekoseAantal() * PRYS_PER_METER);

  kanGaanVoort = computed(() => this.gekoseAantal() > 0 && !this.eieFout());

  private geldigeEieWaarde(): number | null {
    const raw = this.eieWaarde();
    if (raw === null) return null;
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1) return null;
    return n;
  }

  kiesPreset(n: number) {
    this.eieModus.set(false);
    this.eieFout.set(null);
    this.preset.set(n);
  }

  kiesEie() {
    this.eieModus.set(true);
    if (this.eieWaarde() == null) this.eieWaarde.set(3);
    this.opEieVerander(this.eieWaarde());
  }

  veranderEie(delta: number) {
    const current = this.geldigeEieWaarde() ?? 1;
    this.eieWaarde.set(Math.max(1, current + delta));
    this.opEieVerander(this.eieWaarde());
  }

  opEieVerander(value: number | null) {
    this.eieWaarde.set(value === null || (value as unknown as string) === '' ? null : value);
    const n = Math.floor(Number(value));
    if (this.eieWaarde() === null) {
      this.eieFout.set(null);
      return;
    }
    if (!Number.isFinite(n) || n < 1) {
      this.eieFout.set('Voer ’n geldige aantal in.');
    } else if (n > MAKS_PER_TRANSAKSIE) {
      this.eieFout.set('Maksimum van 50 blokkies per transaksie');
    } else {
      // Availability is the other ceiling; the API says so in step 2 if there
      // are not enough blocks left.
      this.eieFout.set(null);
    }
  }

  gaanVoort() {
    this.opEieVerander(this.eieWaarde());
    if (!this.kanGaanVoort()) return;
    this.purchase.bouAantal = this.gekoseAantal();
    this.router.navigate(['/bou/kies']);
  }
}
