import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CertificateNames, PurchaseService, PurchaseTransaction } from '../../services/purchase.service';
import { BouStepBarComponent } from '../shared/bou-step-bar/bou-step-bar.component';
import { CertificateCardComponent, CertificateSquare } from '../shared/certificate-card/certificate-card.component';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [FormsModule, RouterLink, BouStepBarComponent, CertificateCardComponent, TPipe],
  template: `
    <div class="container">
      <!-- Only when the buy flow sent them straight here after registering. The
           "Sertifikaat" link on My blokke carries no flag, so the rail shows once. -->
      @if (vanafVloei) {
        <app-bou-step-bar [active]="4" />
      }
      <div class="page-header">
        <p class="eyebrow">{{ 'My rekening' | t }}</p>
        <h2 class="display page-title">{{ 'Sertifikaat' | t }}</h2>
      </div>

      <!-- Only inside the 15-minute window after a purchase. Once that closes the names are
           settled, so there is nothing to show here and the certificates stand on their own. -->
      @if (kanWysig && squares.length > 0) {
        <div class="naam-paneel">
          <div class="paneel-kop">
            <span class="paneel-titel">
              {{ (squares.length > 1 ? 'Hoe wil jy jou sertifikate hê?' : 'Naam op jou sertifikaat') | t }}
            </span>
            @if (sluitTyd) {
              <span class="kop-tyd">{{ 'Jy kan dit tot' | t }} {{ sluitTyd }} {{ 'verander. Daarna is dit vasgestel.' | t }}</span>
            }
          </div>

          <div class="paneel-lyf">
          @if (squares.length > 1) {
            <div class="keuse" role="group" [attr.aria-label]="'Hoe wil jy jou sertifikate hê' | t">
              <button
                type="button"
                class="keuse-btn"
                [class.is-active]="sameForAll"
                [attr.aria-pressed]="sameForAll"
                (click)="stelSelfde(true)"
              >{{ 'Een sertifikaat' | t }}<small>{{ 'Al' | t }} {{ squares.length }} {{ 'blokke saam, op een naam' | t }}</small></button>
              <button
                type="button"
                class="keuse-btn"
                [class.is-active]="!sameForAll"
                [attr.aria-pressed]="!sameForAll"
                (click)="stelSelfde(false)"
              >{{ 'Een per blok' | t }}<small>{{ 'Elke blok op sy eie naam' | t }}</small></button>
            </div>
          }

          <p class="paneel-lei">{{ 'Dit is die naam wat op jou sertifikate gedruk sal word. Maak seker dat dit korrek is en stoor jou veranderinge.' | t }}</p>

          @if (sameForAll) {
            <div class="naam-veld">
              <label for="naam-almal">{{ 'Naam op alle sertifikate' | t }}</label>
              <input
                id="naam-almal"
                type="text"
                name="naamAlmal"
                maxlength="100"
                [placeholder]="'Bv. Jan van der Merwe' | t"
                [(ngModel)]="summaryName">
            </div>
          } @else {
            <!-- No summary field here: a per-block choice means they never see a summary sheet.
                 The name still goes to the server, because it is what a block without one of its
                 own falls back to, and what the public share link prints. -->
            @for (blok of blocks; track blok.squareId) {
              <div class="naam-veld">
                <label [attr.for]="'naam-' + blok.squareId">{{ 'Blok' | t }} {{ blok.squareId }}</label>
                @if (blok.canEdit) {
                  <input
                    [id]="'naam-' + blok.squareId"
                    type="text"
                    [name]="'naam' + blok.squareId"
                    maxlength="100"
                    [placeholder]="'Bv. Anna van der Merwe' | t"
                    [(ngModel)]="blok.name">
                } @else {
                  <!-- Bought on an earlier trip, so its own window has already closed. -->
                  <p class="naam-vas" [id]="'naam-' + blok.squareId">
                    {{ blok.name }}<span class="vas-merk">{{ 'vasgestel' | t }}</span>
                  </p>
                }
              </div>
            }
          }

          @if (fout) {
            <p class="error-alert" role="alert">{{ fout | t }}</p>
          }

          <button
            type="button"
            class="btn btn-primary btn-xl btn-full"
            [disabled]="besig"
            (click)="stoor()"
          >{{ (besig ? 'Besig om te stoor...' : (wagOpKeuse ? 'Stoor en wys my sertifikate' : 'Stoor name')) | t }}</button>

          @if (gestoor) {
            <p class="klaar" role="status">{{ 'Gestoor. Die sertifikate hieronder wys nou die nuwe name.' | t }}</p>
          }
          </div>
        </div>
      }

      <!-- Straight from a purchase the choice above is the page, not a panel above the answer:
           the sheets appear once they have said which shape they want. -->
      @if (!wagOpKeuse) {
        <app-certificate-card
          [ownerName]="ownerName"
          [squares]="squares"
          [lockedMode]="vasteModus">
          <a routerLink="/my-blokke" class="btn btn-outline">{{ 'Terug na my blokke' | t }}</a>
        </app-certificate-card>
      }
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; max-width: 800px; }
    .page-header { margin-bottom: 1.5rem; }
    .page-title {
      font-size: clamp(2.5rem, 6vw, 3.5rem);
      margin: 0.35rem 0 0;
    }

    /* Always open, never a collapsed accordion: while the window is running this panel is the
       question the page exists to ask, so it must not look like something to skip past. */
    .naam-paneel {
      background: var(--surface);
      border: 3px solid var(--action);
      box-shadow: 0 0 0 4px rgba(3, 78, 162, 0.08), var(--shadow);
      margin-bottom: 2rem;
    }
    .paneel-kop {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1.5rem 1.75rem;
    }
    .paneel-titel {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 800;
      line-height: 1.1;
      color: var(--ink);
    }
    .kop-tyd {
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--text-muted);
    }

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
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: var(--tap-large);
      padding: 1.25rem 0.75rem;
      background: var(--surface);
      border: 3px solid var(--border-strong);
      color: var(--ink);
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 800;
      line-height: 1.15;
      cursor: pointer;
    }
    .keuse-btn small {
      font-family: var(--font-body, inherit);
      font-size: var(--fs-base);
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-muted);
    }
    .keuse-btn:hover { border-color: var(--action); }
    .keuse-btn.is-active {
      background: var(--action);
      border-color: var(--action);
      color: #fff;
    }
    .keuse-btn.is-active small { color: rgba(255, 255, 255, 0.85); }

    .naam-veld { margin-bottom: 1.25rem; }
    /* A block bought on an earlier trip: its own window is long closed, so the name is shown
       as the fact it now is rather than as a field that quietly refuses to save. */
    .naam-vas {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin: 0;
      padding: 0.85rem 1rem;
      min-height: var(--tap-large);
      background: var(--color-cream, rgba(0, 0, 0, 0.04));
      border: 2px solid var(--border-soft);
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
    .vas-merk {
      font-size: var(--fs-sm);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }
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
  blocks: { squareId: number; name: string; canEdit: boolean }[] = [];
  besig = false;
  gestoor = false;
  fout = '';

  /** True while at least one block is inside its 15-minute window. Nothing is editable after. */
  kanWysig = false;
  /** The shared name as last loaded or saved, so switching modes can tell "untouched" from "theirs". */
  private geleiNaam = '';
  /** Local clock time the last open window closes, e.g. "14:37". Blank once locked. */
  sluitTyd = '';

  /** Arrived straight from a purchase and has not answered yet: the choice comes before the sheets. */
  get wagOpKeuse(): boolean {
    return this.vanafVloei && this.kanWysig && !this.gestoor;
  }

  /**
   * The shape the account settled on, which the card renders without offering a toggle. A single
   * block has nothing to summarise, so it keeps the card's own default.
   */
  get vasteModus(): 'summary' | 'block' | null {
    if (this.squares.length <= 1) return null;
    return this.sameForAll ? 'summary' : 'block';
  }

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
      this.geleiNaam = this.summaryName.trim();
      this.kanWysig = names?.canEdit ?? false;
      this.sluitTyd = this.tydVan(names?.editableUntil);
      this.blocks = squares
        .map(s => {
          const gestoorde = names?.blocks.find(b => b.squareId === s.id);
          return {
            squareId: s.id,
            name: gestoorde?.name || this.summaryName,
            canEdit: gestoorde?.canEdit ?? false,
          };
        })
        .sort((a, b) => a.squareId - b.squareId);

      this.squares = [...squares]
        .sort((a, b) => a.id - b.id)
        .map(square => ({ ...square, purchaseDate: boughtOn.get(square.id) }));

      this.wysNaKaart();
    });
  }

  /**
   * The name the server still needs even when the panel never showed a field for it: it is the
   * fallback for a block with no name of its own, and the name the public share link prints. A
   * per-block choice leaves it on the account name, or on the first block if that is somehow blank.
   */
  private opsommingNaam(): string {
    const naam = this.summaryName.trim();
    if (naam.length >= 2) return naam;
    return this.blocks.map(b => b.name.trim()).find(n => n.length >= 2) ?? naam;
  }

  /** The window's closing time in the visitor's own clock, which is how they will read it. */
  private tydVan(iso?: string | null): string {
    if (!iso) return '';
    // The server sends UTC without a zone suffix, which Date would read as local time.
    const stamp = /(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
    const when = new Date(stamp);
    return isNaN(when.getTime())
      ? ''
      : when.toLocaleTimeString('af-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
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
      // Carry whatever they typed for the shared name onto the blocks, so they correct the one
      // or two that differ instead of retyping all of them. A block already bearing a name of
      // its own is left alone; the summary field is gone from here on.
      for (const blok of this.blocks) {
        if (blok.name.trim().length < 2 || blok.name.trim() === this.geleiNaam) {
          blok.name = this.summaryName;
        }
      }
    }
  }

  stoor() {
    if (this.besig) return;

    this.fout = '';
    this.gestoor = false;

    if (this.sameForAll) {
      if (this.summaryName.trim().length < 2) {
        this.fout = 'Voer asseblief die naam in wat op die sertifikaat moet verskyn.';
        return;
      }
    } else {
      const leeg = this.blocks.find(b => b.canEdit && b.name.trim().length < 2);
      if (leeg) {
        this.fout = `Voer asseblief ’n naam vir blok ${leeg.squareId} in.`;
        return;
      }
    }

    this.besig = true;
    const versoek: CertificateNames = {
      sameForAll: this.sameForAll,
      summaryName: this.opsommingNaam(),
      blocks: this.blocks.map(b => ({ squareId: b.squareId, name: b.name.trim() })),
    };

    this.purchase.saveCertificateNames(versoek).subscribe({
      next: (opgedateer) => {
        this.sameForAll = opgedateer.sameForAll;
        this.summaryName = opgedateer.summaryName;
        this.geleiNaam = this.summaryName.trim();
        this.blocks = opgedateer.blocks.map(b => ({ ...b, canEdit: b.canEdit ?? false }));
        this.kanWysig = opgedateer.canEdit ?? false;
        this.sluitTyd = this.tydVan(opgedateer.editableUntil);
        this.wysNaKaart();
        this.besig = false;
        this.gestoor = true;
      },
      error: (err) => {
        this.besig = false;
        this.fout = err.error?.message || 'Kon nie die name stoor nie. Probeer asseblief weer.';
        // The window closed while they were typing. Show the sheets as they stand rather than
        // leaving them in an editor whose save can no longer succeed.
        if (err.status === 403) {
          this.kanWysig = false;
          this.gestoor = true;
        }
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
