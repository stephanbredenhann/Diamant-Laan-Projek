import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RoadService } from '../../../services/road.service';
import { PurchaseService } from '../../../services/purchase.service';
import { BouStepBarComponent } from '../../shared/bou-step-bar/bou-step-bar.component';
import { TPipe } from '../../../i18n/t.pipe';


/**
 * Step 2 — Toekenning: auto-assign or open the map.
 */
@Component({
  selector: 'app-bou-stap2',
  standalone: true,
  imports: [RouterLink, BouStepBarComponent, TPipe],
  template: `
    <div class="container-wide bou-shell">
      <div class="header-row">
        <div>
          <p class="eyebrow page-eyebrow">{{ 'Stap 2 van 4 · Kies jou blokkie' | t }}</p>
          <div class="visually-hidden" aria-live="polite">{{ stepAnnouncement | t }}</div>
          <h1 class="page-title">{{ 'Hoe wil jy jou blokkie kies?' | t }}</h1>
          <p class="page-lead">{{ 'Jy het twee keuses: laat die stelsel outomaties blokkies aan jou toeken, of kies self presies waar op die pad jy jou blokkie wil borg.' | t }}</p>
        </div>
      </div>

      <app-bou-step-bar [active]="2" />

      <div class="options">
        <button
          type="button"
          class="option-card option-primary"
          (click)="onsKiesVirJou()"
          [disabled]="besig()"
        >
          <div class="option-top">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span class="option-badge">{{ 'Aanbeveel' | t }}</span>
          </div>
          <h2>{{ 'Kies beskikbare blokkies vir my' | t }}</h2>
          <p>{{ 'Die stelsel kies outomaties die korrekte aantal beskikbare blokkies vir jou.' | t }}</p>
          @if (besig()) {
            <span class="option-status">{{ 'Besig...' | t }}</span>
          } @else {
            <span class="option-cta">{{ 'Gaan voort →' | t }}</span>
          }
        </button>

        <button
          type="button"
          class="option-card option-secondary"
          (click)="ekKiesSelf()"
        >
          <div class="option-top">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <span class="option-badge quiet">{{ 'Maak die kaart oop' | t }}</span>
          </div>
          <h2>{{ 'Kies self op kaart' | t }}</h2>
          <p>{{ 'Kyk waar die pad gebou word en kies self watter m² jy wil borg.' | t }}</p>
          <span class="option-cta">{{ 'Maak kaart oop →' | t }}</span>
        </button>
      </div>

      @if (fout()) {
        <p class="error-alert">{{ fout() | t }}</p>
      }

      <div class="terug-row">
        <a routerLink="/bou" class="btn btn-outline btn-terug">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          {{ 'Gaan terug' | t }}
        </a>
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
    .terug-row { margin-top: 2rem; }
    .options {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr 1fr;
    }
    .option-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      text-align: left;
      padding: 1.75rem;
      cursor: pointer;
      font-family: var(--font-body);
      transition: transform 0.15s, box-shadow 0.15s;
      min-height: 18rem;
    }
    .option-card:hover:not(:disabled) {
      transform: translateY(-4px);
    }
    .option-primary {
      border: 2px solid var(--action-strong);
      background: var(--action-strong);
      color: #fff;
      box-shadow: var(--shadow-cta);
    }
    .option-secondary {
      border: 2px solid var(--border-soft);
      background: var(--surface);
      color: var(--ink);
    }
    .option-top {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }
    .option-badge {
      font-family: var(--font-display);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.7);
    }
    .option-badge.quiet {
      color: var(--text-muted);
      max-width: 10rem;
      text-align: right;
    }
    .option-card h2 {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.05;
      margin-bottom: 0.75rem;
      color: inherit;
    }
    .option-card p {
      font-size: 1.05rem;
      line-height: 1.55;
      opacity: 0.9;
      margin-bottom: auto;
    }
    .option-cta, .option-status {
      margin-top: 1.5rem;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.15rem;
    }
    .option-card:disabled {
      opacity: 0.75;
      cursor: not-allowed;
    }
    @media (max-width: 800px) {
      .options { grid-template-columns: 1fr; }
    }
    /* Phones: 18rem tall cards push the second option a whole screen down. */
    @media (max-width: 600px) {
      .option-card { min-height: 0; padding: 1.25rem; }
      .option-top { margin-bottom: 0.75rem; }
      .option-card h2 { font-size: 1.6rem; }
      .option-card p { font-size: 1rem; line-height: 1.5; }
      .option-cta, .option-status { margin-top: 1rem; font-size: 1.05rem; }
      .option-badge.quiet { max-width: 8rem; font-size: 0.65rem; }
      .terug-row { margin-top: 1.5rem; }
    }
  `]
})
export class BouStap2Component implements OnInit {
  private router = inject(Router);
  private road = inject(RoadService);
  private purchase = inject(PurchaseService);

  aantal = signal(0);
  besig = signal(false);
  fout = signal<string | null>(null);
  stepAnnouncement = 'Stap 2 van 4: Hoe wil jy jou blokkie kies?';

  ngOnInit() {
    const n = this.purchase.bouAantal;
    if (n === null) {
      this.router.navigate(['/bou']);
      return;
    }
    this.aantal.set(n);
  }

  onsKiesVirJou() {
    if (this.besig()) return;
    this.fout.set(null);
    this.besig.set(true);

    this.road.pickSquares(this.aantal()).subscribe({
      next: (res) => {
        const ids = res?.squareIds;
        if (!ids || ids.length < this.aantal()) {
          this.fout.set('Daar is nie meer genoeg vierkante meter beskikbaar nie. Probeer ’n kleiner hoeveelheid.');
          this.besig.set(false);
          return;
        }
        this.purchase.pendingSquareIds = ids;
        this.besig.set(false);
        this.router.navigate(['/bou/bevestig']);
      },
      error: (err) => {
        this.besig.set(false);
        this.fout.set(err.error?.message ?? 'Kon nie outomaties kies nie. Probeer weer.');
      }
    });
  }

  ekKiesSelf() {
    this.router.navigate(['/bou/kaart']);
  }
}
