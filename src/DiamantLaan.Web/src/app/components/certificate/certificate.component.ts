import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CertificateNames, PurchaseService, PurchaseTransaction } from '../../services/purchase.service';
import { BouStepBarComponent } from '../shared/bou-step-bar/bou-step-bar.component';
import { CertificateCardComponent, CertificateSquare } from '../shared/certificate-card/certificate-card.component';

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [FormsModule, RouterLink, BouStepBarComponent, CertificateCardComponent],
  template: `
    <div class="container">
      <!-- Only when the buy flow sent them straight here after registering. The
           "Sertifikaat" link on My blokke carries no flag, so the rail shows once. -->
      @if (vanafVloei) {
        <app-bou-step-bar [active]="4" [gesluit]="true" />
      }
      <div class="page-header">
        <p class="eyebrow">My rekening</p>
        <h2 class="display page-title">Sertifikaat</h2>
      </div>

      @if (squares.length > 0) {
        <details class="naam-paneel">
          <summary class="paneel-kop">
            <span class="kop-teks">
              <span class="paneel-titel">Naam op jou sertifikate</span>
              <span class="kop-naam">{{ kopNaam() }}</span>
            </span>
            <span class="kop-aksie">
              <span class="kop-woord">Wysig</span>
              <svg class="kop-pyl" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </summary>

          <div class="paneel-lyf">
          <p class="paneel-lei">
            Dit is die naam wat gedruk word. Maak seker dit is reg, en stoor daarna.
          </p>

          @if (squares.length > 1) {
            <div class="keuse" role="group" aria-label="Hoe wil jy die name stel">
              <button
                type="button"
                class="keuse-btn"
                [class.is-active]="sameForAll"
                [attr.aria-pressed]="sameForAll"
                (click)="stelSelfde(true)"
              >Een naam vir almal</button>
              <button
                type="button"
                class="keuse-btn"
                [class.is-active]="!sameForAll"
                [attr.aria-pressed]="!sameForAll"
                (click)="stelSelfde(false)"
              >Naam per sertifikaat</button>
            </div>
          }

          @if (sameForAll) {
            <div class="naam-veld">
              <label for="naam-almal">Naam op alle sertifikate</label>
              <input
                id="naam-almal"
                type="text"
                name="naamAlmal"
                maxlength="100"
                placeholder="Bv. Jan van der Merwe"
                [(ngModel)]="summaryName">
            </div>
          } @else {
            <div class="naam-veld">
              <label for="naam-opsomming">Opsomming-sertifikaat</label>
              <input
                id="naam-opsomming"
                type="text"
                name="naamOpsomming"
                maxlength="100"
                placeholder="Bv. Jan van der Merwe"
                [(ngModel)]="summaryName">
            </div>
            @for (blok of blocks; track blok.squareId) {
              <div class="naam-veld">
                <label [attr.for]="'naam-' + blok.squareId">Blok {{ blok.squareId }}</label>
                <input
                  [id]="'naam-' + blok.squareId"
                  type="text"
                  [name]="'naam' + blok.squareId"
                  maxlength="100"
                  placeholder="Bv. Anna van der Merwe"
                  [(ngModel)]="blok.name">
              </div>
            }
          }

          @if (fout) {
            <p class="error-alert" role="alert">{{ fout }}</p>
          }

          <button
            type="button"
            class="btn btn-primary btn-xl btn-full"
            [disabled]="besig"
            (click)="stoor()"
          >{{ besig ? 'Besig om te stoor...' : 'Stoor name' }}</button>

          @if (gestoor) {
            <p class="klaar" role="status">Gestoor. Die sertifikate hieronder wys nou die nuwe name.</p>
          }
          </div>
        </details>
      }

      <app-certificate-card
        [ownerName]="ownerName"
        [squares]="squares">
        <a routerLink="/my-blokke" class="btn btn-outline">Terug na my blokke</a>
      </app-certificate-card>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; max-width: 800px; }
    .page-header { margin-bottom: 1.5rem; }
    .page-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      margin: 0.35rem 0 0;
    }

    /* A plain <details>: closed it is one big row showing the name that will
       print, open it is the editor. No toggle state to keep in the component. */
    .naam-paneel {
      background: var(--surface);
      border: 3px solid var(--action);
      box-shadow: 0 0 0 4px rgba(3, 78, 162, 0.08), var(--shadow);
      margin-bottom: 2rem;
    }
    .paneel-kop {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 1.5rem 1.75rem;
      min-height: var(--tap-large);
      cursor: pointer;
      list-style: none;
    }
    .paneel-kop::-webkit-details-marker { display: none; }
    .paneel-kop:hover { background: rgba(3, 78, 162, 0.05); }
    .kop-teks { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    .paneel-titel {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 800;
      line-height: 1.1;
      color: var(--ink);
    }
    .kop-naam {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
    .kop-aksie {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      min-height: var(--tap-min);
      background: var(--action);
      color: #fff;
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .kop-pyl { transition: transform 0.15s ease; }
    .naam-paneel[open] .kop-pyl { transform: rotate(180deg); }

    .paneel-lyf {
      padding: 0 1.75rem 1.75rem;
      border-top: 2px solid var(--border-soft);
      padding-top: 1.5rem;
    }
    .paneel-lei {
      font-size: var(--fs-lg);
      color: var(--text-body);
      margin: 0 0 1.5rem;
    }

    /* Two big, unmissable choices rather than a switch: the audience reads words
       far more reliably than a toggle's on/off state. */
    .keuse {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .keuse-btn {
      min-height: var(--tap-large);
      padding: 1rem 0.75rem;
      background: var(--surface);
      border: 3px solid var(--border-strong);
      color: var(--ink);
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 800;
      line-height: 1.15;
      cursor: pointer;
    }
    .keuse-btn:hover { border-color: var(--action); }
    .keuse-btn.is-active {
      background: var(--action);
      border-color: var(--action);
      color: #fff;
    }

    .naam-veld { margin-bottom: 1.25rem; }
    .naam-veld label {
      display: block;
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 800;
      color: var(--ink);
      margin-bottom: 0.5rem;
    }
    .naam-veld input {
      width: 100%;
      min-height: var(--tap-large);
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
    }

    .klaar {
      margin: 1rem 0 0;
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--route-blue);
      text-align: center;
    }

    @media (max-width: 600px) {
      .paneel-kop { padding: 1.25rem; }
      .paneel-lyf { padding: 1.25rem 1.25rem 1.5rem; }
      .kop-aksie { width: 100%; justify-content: center; }
      .keuse { grid-template-columns: 1fr; }
    }
  `]
})
export class CertificateComponent implements OnInit {
  private auth = inject(AuthService);
  private purchase = inject(PurchaseService);
  private route = inject(ActivatedRoute);

  ownerName = '';
  squares: CertificateSquare[] = [];
  vanafVloei = false;

  sameForAll = true;
  summaryName = '';
  blocks: { squareId: number; name: string }[] = [];
  besig = false;
  gestoor = false;
  fout = '';

  ngOnInit() {
    this.vanafVloei = this.route.snapshot.queryParamMap.has('vloei');

    const user = this.auth.currentUser();
    const rekeningNaam = user ? `${user.firstName} ${user.lastName}`.trim() : '';

    // The squares endpoint carries no date, so pair it with the transactions to stamp each
    // certificate with the day that block was actually bought. A failure there is not worth
    // blocking the certificate over, the date row just stays blank, as it was before.
    forkJoin({
      squares: this.purchase.getMySquares(),
      transactions: this.purchase.getMyTransactions().pipe(catchError(() => of([] as PurchaseTransaction[]))),
      // Same story for the names: fall back to the account name rather than an empty page.
      names: this.purchase.getCertificateNames().pipe(catchError(() => of(null))),
    }).subscribe(({ squares, transactions, names }) => {
      const boughtOn = new Map<number, string>();
      for (const transaction of transactions) {
        for (const id of transaction.squareIds) {
          const seen = boughtOn.get(id);
          // Blocks can in principle appear more than once; the first purchase is the true one.
          if (!seen || transaction.purchaseDate < seen) {
            boughtOn.set(id, transaction.purchaseDate);
          }
        }
      }

      this.sameForAll = names?.sameForAll ?? true;
      this.summaryName = names?.summaryName || rekeningNaam;
      this.blocks = squares
        .map(s => ({
          squareId: s.id,
          name: names?.blocks.find(b => b.squareId === s.id)?.name || this.summaryName,
        }))
        .sort((a, b) => a.squareId - b.squareId);

      this.squares = [...squares]
        .sort((a, b) => a.id - b.id)
        .map(square => ({ ...square, purchaseDate: boughtOn.get(square.id) }));

      this.wysNaKaart();
    });
  }

  /** What the closed panel shows: the shared name, or a count once they differ. */
  kopNaam(): string {
    if (this.sameForAll || this.blocks.length <= 1) return this.summaryName;

    const verskil = this.blocks.filter(b => b.name.trim() !== this.summaryName.trim()).length;
    if (verskil === 0) return this.summaryName;
    return verskil === 1
      ? `${this.summaryName}, met 1 blok onder ’n ander naam`
      : `${this.summaryName}, met ${verskil} blokke onder ander name`;
  }

  /**
   * Switching to per-certificate names starts everything on the shared name, so the visitor
   * edits the one or two that differ instead of retyping all of them.
   */
  stelSelfde(same: boolean) {
    if (this.sameForAll === same) return;
    this.sameForAll = same;
    this.gestoor = false;
    this.fout = '';
    if (!same) {
      for (const blok of this.blocks) {
        if (blok.name.trim().length < 2) blok.name = this.summaryName;
      }
    }
  }

  stoor() {
    if (this.besig) return;

    this.fout = '';
    this.gestoor = false;

    if (this.summaryName.trim().length < 2) {
      this.fout = 'Voer asseblief die naam in wat op die sertifikaat moet verskyn.';
      return;
    }

    if (!this.sameForAll) {
      const leeg = this.blocks.find(b => b.name.trim().length < 2);
      if (leeg) {
        this.fout = `Voer asseblief ’n naam vir blok ${leeg.squareId} in.`;
        return;
      }
    }

    this.besig = true;
    const versoek: CertificateNames = {
      sameForAll: this.sameForAll,
      summaryName: this.summaryName.trim(),
      blocks: this.blocks.map(b => ({ squareId: b.squareId, name: b.name.trim() })),
    };

    this.purchase.saveCertificateNames(versoek).subscribe({
      next: (opgedateer) => {
        this.sameForAll = opgedateer.sameForAll;
        this.summaryName = opgedateer.summaryName;
        this.blocks = opgedateer.blocks.map(b => ({ ...b }));
        this.wysNaKaart();
        this.besig = false;
        this.gestoor = true;
      },
      error: (err) => {
        this.besig = false;
        this.fout = err.error?.message || 'Kon nie die name stoor nie. Probeer asseblief weer.';
      },
    });
  }

  /** Pushes the saved names onto the sheets. A new array so the card re-fits the name. */
  private wysNaKaart() {
    this.ownerName = this.summaryName;
    this.squares = this.squares.map(square => ({
      ...square,
      ownerName: this.blocks.find(b => b.squareId === square.id)?.name || this.summaryName,
    }));
  }
}
