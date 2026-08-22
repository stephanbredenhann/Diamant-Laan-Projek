import { ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService, CertificateSummary } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';
import {
  CertificateCardComponent,
  CertificateSquare,
  sanitizeFilename,
} from '../shared/certificate-card/certificate-card.component';
import { PaginatorComponent, PAGE_SIZE } from '../shared/paginator/paginator.component';

/** One row in the "which certificate?" chooser: a sheet the buyer's blocks add up to. */
interface SheetChoice {
  target: 'summary' | number;
  label: string;
}

interface Buyer {
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  isOraniaResident?: boolean;
  squares: number;
  totalSpent: number;
  spendPerBlock: number;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, CertificateCardComponent, PaginatorComponent],
  template: `
    <div class="admin-content">

      <!-- Certificate Download Table -->
      <div class="table-card">
        <div class="table-header">
          <h3>Sertifikate</h3>
          <div class="table-actions">
            <input
              type="text"
              [(ngModel)]="search"
              (input)="applyFilters()"
              placeholder="Soek naam of e-pos...">
          </div>
        </div>

        @if (loadingBuyers) {
          <p class="muted">Laai kopers...</p>
        } @else if (loadError) {
          <p class="error-msg">{{ loadError }}</p>
        } @else {
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th (click)="sortBy('name')" [class.sorted]="sortKey === 'name'">
                    Naam <span class="sort-icon">{{ sortIcon('name') }}</span>
                  </th>
                  <th (click)="sortBy('email')" [class.sorted]="sortKey === 'email'">
                    E-pos <span class="sort-icon">{{ sortIcon('email') }}</span>
                  </th>
                  <th (click)="sortBy('squares')" class="numeric" [class.sorted]="sortKey === 'squares'">
                    Blokke <span class="sort-icon">{{ sortIcon('squares') }}</span>
                  </th>
                  <th (click)="sortBy('totalSpent')" class="numeric" [class.sorted]="sortKey === 'totalSpent'">
                    Totaal bestee <span class="sort-icon">{{ sortIcon('totalSpent') }}</span>
                  </th>
                  <th class="cert-col">Sertifikaat</th>
                </tr>
              </thead>
              <tbody>
                @for (b of filteredBuyers | slice:page * pageSize:(page + 1) * pageSize; track b.userId) {
                  <tr>
                    <td>{{ b.name }}</td>
                    <td>{{ b.email }}</td>
                    <td class="numeric">{{ b.squares }}</td>
                    <td class="numeric">R{{ b.totalSpent | number:'1.0-0' }}</td>
                    <td class="cert-col">
                      <div class="cert-actions">
                        <button
                          class="btn btn-outline btn-sm"
                          type="button"
                          [disabled]="busyUserId !== null"
                          (click)="downloadCertificate(b)">
                          {{ downloadingUserId === b.userId ? 'Besig...' : 'Laai af' }}
                        </button>
                        <button
                          class="btn btn-outline btn-sm"
                          type="button"
                          [disabled]="busyUserId !== null"
                          (click)="editNames(b)">
                          {{ namingUserId === b.userId ? 'Besig...' : 'Naam' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
                @if (filteredBuyers.length === 0) {
                  <tr>
                    <td colspan="5" class="empty">Geen kopers gevind nie.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-paginator [total]="filteredBuyers.length" [(page)]="page" />
        }

        @if (certError) {
          <p class="error-msg">{{ certError }}</p>
        }
      </div>

      <!-- Make Admin Form -->
      <div class="form-card">
        <h3>Gebruikersbestuur</h3>
        <p class="hint">Maak ’n bestaande geregistreerde gebruiker ’n admin.</p>
        <form (ngSubmit)="submit()" class="admin-form">
          <div class="field">
            <label for="email-admin">E-pos</label>
            <input id="email-admin" type="email" [(ngModel)]="email" name="email" required placeholder="gebruiker@voorbeeld.co.za">
          </div>
          <app-alert [message]="message" [type]="isError ? 'error' : 'success'"></app-alert>
          <button type="submit" class="btn btn-primary" [disabled]="loading || !email.trim()">
            {{ loading ? 'Besig...' : 'Maak tot admin' }}
          </button>
        </form>
      </div>

    </div>

    <!-- Off-screen real summary certificate used only for PDF export -->
    <div class="cert-export-host" aria-hidden="true">
      <app-certificate-card
        #certCard
        [ownerName]="certOwnerName"
        [squares]="certSquares"
        [lockedMode]="'summary'"
        [viewOnly]="true" />
    </div>

    <!-- Guest checkout leaves no name to print, so the admin fills it in before the PDF renders. -->
    @if (namePrompt) {
      <div class="modal-backdrop" (click)="closeNamePrompt()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-name-title"
          (click)="$event.stopPropagation()">
          <h3 id="cert-name-title">Naam op sertifikaat</h3>
          <p class="hint">
            {{ namePrompt.download
              ? 'Hierdie gebruiker het nie hulle naam gelos nie, vul dit hier in.'
              : 'Verander die naam wat op hierdie gebruiker se sertifikate gedruk word.' }}
          </p>

          <div class="field">
            <label for="prompt-name">Naam op sertifikaat</label>
            <input
              id="prompt-name"
              [(ngModel)]="promptName"
              name="promptName"
              maxlength="100"
              placeholder="Koper se naam">
          </div>

          @if (namePrompt.squares.length > 1) {
            <div class="field checkbox">
              <label>
                <input type="checkbox" [(ngModel)]="promptIndividual" name="promptIndividual">
                Elke blok kry sy eie naam
              </label>
            </div>

            @if (promptIndividual) {
              <p class="sub-hint">Los ’n blok leeg om die naam hierbo daarop te druk.</p>
              @for (id of namePrompt.squares; track id) {
                <div class="field cert-name-row">
                  <label [attr.for]="'promptBlock-' + id">Blok #{{ id }}</label>
                  <input
                    [id]="'promptBlock-' + id"
                    [ngModel]="promptBlockNames[id]"
                    (ngModelChange)="promptBlockNames[id] = $event"
                    [name]="'promptBlock' + id"
                    maxlength="100"
                    [placeholder]="promptName.trim() || 'Koper se naam'">
                </div>
              }
            }
          }

          @if (certError) {
            <p class="error-msg">{{ certError }}</p>
          }

          <button
            type="button"
            class="btn btn-primary btn-sm btn-wide"
            [disabled]="promptSaving || promptName.trim().length < 2"
            (click)="saveNamesAndContinue()">
            {{ promptSaving ? 'Besig...' : (namePrompt.download ? 'Stoor en laai af' : 'Stoor') }}
          </button>
          <button
            type="button"
            class="btn btn-outline btn-sm btn-wide"
            [disabled]="promptSaving"
            (click)="closeNamePrompt()">
            Kanselleer
          </button>
        </div>
      </div>
    }

    <!-- A buyer holding several blocks has several sheets, so ask which one before rendering. -->
    @if (sheetChoices.length > 0) {
      <div class="modal-backdrop" (click)="closeChooser()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-chooser-title"
          (click)="$event.stopPropagation()">
          <h3 id="cert-chooser-title">Sertifikate vir {{ certOwnerName }}</h3>
          <p class="hint">Kies een sertifikaat, of laai almal saam af as ’n zip-lêer.</p>

          <button
            type="button"
            class="btn btn-primary btn-sm btn-wide"
            [disabled]="sheetBusy !== null"
            (click)="downloadAllSheets()">
            {{ sheetBusy === 'all' ? 'Besig... ' + zipProgress : 'Laai alles af (zip)' }}
          </button>

          <ul class="sheet-list">
            @for (choice of sheetChoices; track choice.target) {
              <li>
                <span>{{ choice.label }}</span>
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  [disabled]="sheetBusy !== null"
                  (click)="downloadSheet(choice.target)">
                  {{ sheetBusy === choice.target ? 'Besig...' : 'Laai af' }}
                </button>
              </li>
            }
          </ul>

          @if (certError) {
            <p class="error-msg">{{ certError }}</p>
          }

          <button type="button" class="btn btn-outline btn-sm btn-wide" (click)="closeChooser()">
            Maak toe
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-content { display: flex; flex-direction: column; gap: 1.5rem; }
    .muted { color: var(--color-muted); }
    .error-msg {
      color: #b33;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0.75rem;
      background: #fdf0f0;
      border: 1px solid #f0c0c0;
      border-radius: var(--radius-sm);
    }

    /* Table card — same style as Statistieke */
    .table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .table-header h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      color: var(--color-text);
      margin: 0;
    }
    .table-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .table-actions input {
      width: 220px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }
    .table-scroll { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    th, td {
      padding: 0.625rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    th {
      font-family: var(--font-heading);
      font-weight: 600;
      color: var(--color-muted);
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
    }
    th.sorted { color: var(--color-text); }
    th:hover { color: var(--color-terracotta); }
    th.cert-col { cursor: default; }
    th.cert-col:hover { color: var(--color-muted); }
    .sort-icon {
      font-size: 0.625rem;
      margin-left: 0.125rem;
      opacity: 0.4;
    }
    th.sorted .sort-icon { opacity: 1; color: var(--color-terracotta); }
    td { color: var(--color-muted); }
    .numeric { text-align: right; }
    .cert-col { text-align: center; }
    .empty {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-muted);
    }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
    .cert-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }

    /* Make Admin form */
    .form-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      max-width: 560px;
    }
    .form-card h3 {
      font-family: var(--font-heading);
      font-size: 1rem;
      margin-bottom: 0.375rem;
    }
    .hint {
      font-size: 0.8125rem;
      color: var(--color-muted);
      margin-bottom: 1.25rem;
    }
    .field { margin-bottom: 1rem; }
    .field label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 0.375rem;
    }
    /* Not the checkbox: this rule outranks the global input[type="checkbox"] sizing (the
       encapsulation attribute adds specificity), and a 100%-wide checkbox pushed its own
       label clean out of the modal. */
    .field input:not([type="checkbox"]) {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }

    .cert-export-host {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 820px;
      pointer-events: none;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.45);
    }
    .modal {
      width: 100%;
      max-width: 420px;
      max-height: 85vh;
      overflow-y: auto;
      background: var(--color-surface);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.25));
    }
    .modal h3 {
      font-family: var(--font-heading);
      font-size: 1rem;
      margin-bottom: 0.375rem;
    }
    .btn-wide { width: 100%; }
    .btn-wide + .btn-wide { margin-top: 0.5rem; }
    .modal .field { margin-bottom: 0.75rem; }
    .modal .field.checkbox label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 400;
    }
    .sub-hint {
      font-size: 0.75rem;
      color: var(--color-muted);
      margin-bottom: 0.5rem;
    }
    .sheet-list {
      list-style: none;
      margin: 1rem 0;
      padding: 0;
    }
    .sheet-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.8125rem;
      color: var(--color-muted);
    }

    @media (max-width: 992px) {
      .table-actions { width: 100%; }
      .table-actions input { flex: 1; }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('certCard') certCard!: CertificateCardComponent;

  private admin = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  buyers: Buyer[] = [];
  filteredBuyers: Buyer[] = [];
  search = '';
  page = 0;
  readonly pageSize = PAGE_SIZE;
  sortKey: keyof Buyer = 'totalSpent';
  sortDesc = true;
  loadingBuyers = true;
  loadError = '';
  downloadingUserId: string | null = null;
  namingUserId: string | null = null;

  certOwnerName = '';
  certSquares: CertificateSquare[] = [];
  certError = '';
  /** Non-empty while the chooser is open; the off-screen card must stay loaded until it closes. */
  sheetChoices: SheetChoice[] = [];
  /** Which sheet is rendering: a target, 'all' for the zip, or null when idle. */
  sheetBusy: 'summary' | number | 'all' | null = null;
  zipProgress = '';

  /**
   * Set while the admin is typing certificate names: either the missing ones for a buyer who
   * left none (download follows), or a correction to names already printed (download does not).
   */
  namePrompt: { buyer: Buyer; squares: number[]; download: boolean } | null = null;
  promptName = '';
  promptIndividual = false;
  promptBlockNames: Record<number, string> = {};
  promptSaving = false;

  email = '';
  message = '';
  isError = false;
  loading = false;

  ngOnInit() {
    this.admin.getPurchases().subscribe({
      next: (data) => {
        this.buyers = data.map((b: Omit<Buyer, 'spendPerBlock'>) => ({
          ...b,
          spendPerBlock: b.squares > 0 ? b.totalSpent / b.squares : 0
        }));
        this.applyFilters();
        this.loadingBuyers = false;
      },
      error: () => {
        this.loadError = 'Kon nie kopers laai nie.';
        this.loadingBuyers = false;
      }
    });
  }

  applyFilters() {
    const term = this.search.trim().toLowerCase();
    let result = this.buyers.filter(b =>
      !term ||
      b.name.toLowerCase().includes(term) ||
      b.email.toLowerCase().includes(term)
    );

    result = result.sort((a, b) => {
      const va = a[this.sortKey];
      const vb = b[this.sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return this.sortDesc ? -1 : 1;
      if (vb == null) return this.sortDesc ? 1 : -1;
      if (typeof va === 'string' && typeof vb === 'string') {
        return this.sortDesc ? vb.localeCompare(va) : va.localeCompare(vb);
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return this.sortDesc ? vb - va : va - vb;
      }
      if (typeof va === 'boolean' && typeof vb === 'boolean') {
        return this.sortDesc ? (vb === va ? 0 : vb ? 1 : -1) : (va === vb ? 0 : va ? 1 : -1);
      }
      return 0;
    });

    this.filteredBuyers = result;
  }

  sortBy(key: keyof Buyer) {
    if (this.sortKey === key) {
      this.sortDesc = !this.sortDesc;
    } else {
      this.sortKey = key;
      this.sortDesc = true;
    }
    this.applyFilters();
  }

  sortIcon(key: keyof Buyer): string {
    if (this.sortKey !== key) return '⇅';
    return this.sortDesc ? '▼' : '▲';
  }

  /** Whichever row is mid-request, so every button in the table stays disabled until it lands. */
  get busyUserId(): string | null {
    return this.downloadingUserId ?? this.namingUserId;
  }

  async downloadCertificate(buyer: Buyer) {
    if (this.busyUserId) return;

    this.downloadingUserId = buyer.userId;
    this.certError = '';

    try {
      const summary = await firstValueFrom(this.admin.getCertificateSummary(buyer.userId));

      // A guest who checked out without an account often left no name at all, and a blank
      // certificate is worse than no certificate. Ask before anything renders.
      if (!summary.ownerName.trim()) {
        const squares = (summary.squares ?? []).map(s => s.id);
        if (squares.length === 0) {
          this.certError = `${buyer.name} besit geen blokke nie.`;
          return;
        }
        this.namePrompt = { buyer, squares, download: true };
        this.promptName = '';
        this.promptIndividual = false;
        this.promptBlockNames = {};
        return;
      }

      await this.renderSummary(summary, buyer);
    } catch {
      this.certError = `Kon nie ${buyer.name} se sertifikate laai nie.`;
      this.clearCert();
    } finally {
      this.downloadingUserId = null;
    }
  }

  /**
   * Corrects names that are already on issued certificates. The buyer's own 15-minute window is
   * long shut by then; an admin's is never shut, because a wrong name has to stay fixable.
   */
  async editNames(buyer: Buyer) {
    if (this.busyUserId) return;

    this.namingUserId = buyer.userId;
    this.certError = '';

    try {
      const summary = await firstValueFrom(this.admin.getCertificateSummary(buyer.userId));
      const squares = (summary.squares ?? []).map(s => s.id);
      if (squares.length === 0) {
        this.certError = `${buyer.name} besit geen blokke nie.`;
        return;
      }

      this.namePrompt = { buyer, squares, download: false };
      this.promptName = summary.ownerName;
      this.promptIndividual = !summary.sameForAll;
      // Prefilled with what each sheet prints today, so an admin fixing one name does not
      // have to retype the rest.
      this.promptBlockNames = Object.fromEntries(
        (summary.squares ?? []).map(sq => [sq.id, sq.ownerName]));
    } catch {
      this.certError = `Kon nie ${buyer.name} se sertifikaatname laai nie.`;
    } finally {
      this.namingUserId = null;
    }
  }

  /** Writes the names the admin just typed, then carries straight on to the download. */
  async saveNamesAndContinue() {
    const prompt = this.namePrompt;
    if (!prompt || this.promptSaving) return;

    const summaryName = this.promptName.trim();
    if (summaryName.length < 2) return;

    this.promptSaving = true;
    this.certError = '';
    try {
      const individual = this.promptIndividual && prompt.squares.length > 1;
      const summary = await firstValueFrom(this.admin.saveCertificateNames(prompt.buyer.userId, {
        sameForAll: !individual,
        summaryName,
        // Blanks go through too: the API reads a short name as "print the summary name", which
        // is what the hint above the fields promises.
        blocks: individual
          ? prompt.squares.map(id => ({ squareId: id, name: (this.promptBlockNames[id] ?? '').trim() }))
          : [],
      }));
      this.namePrompt = null;
      if (prompt.download) await this.renderSummary(summary, prompt.buyer);
    } catch {
      this.certError = 'Kon nie die name stoor nie. Probeer asseblief weer.';
    } finally {
      this.promptSaving = false;
    }
  }

  closeNamePrompt() {
    if (this.promptSaving) return;
    this.namePrompt = null;
    this.certError = '';
  }

  /** Renders the off-screen card, then either downloads the one sheet or opens the chooser. */
  private async renderSummary(summary: CertificateSummary, buyer: Buyer) {
    this.certOwnerName = summary.ownerName;
    this.certSquares = (summary.squares ?? []).map(s => ({
      id: s.id,
      purchaseDate: s.purchaseDate ?? undefined,
      ownerName: s.ownerName,
    }));
    this.cdr.detectChanges();

    // Let the certificate card apply lockedMode / sheet layout before capture.
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const targets = this.certCard.sheetTargets();
    if (targets.length === 0) {
      this.certError = `${buyer.name} besit geen blokke nie.`;
      this.clearCert();
      return;
    }

    // A lone block is the only sheet there is, so there is nothing to ask about.
    if (targets.length === 1) {
      await this.saveSheet(targets[0]);
      this.clearCert();
      return;
    }

    this.sheetChoices = targets.map(target => ({
      target,
      label: this.certCard.sheetLabel(target),
    }));
  }

  async downloadSheet(target: 'summary' | number) {
    if (this.sheetBusy !== null) return;

    this.sheetBusy = target;
    this.certError = '';
    try {
      await this.saveSheet(target);
    } catch {
      this.certError = 'Kon nie die PDF genereer nie. Probeer asseblief weer.';
    } finally {
      this.sheetBusy = null;
    }
  }

  /**
   * Every sheet in one zip, because a browser blocks the second of several downloads fired in a
   * row. Rendered one at a time off the single off-screen card.
   * ponytail: sequential render, roughly a second a sheet; only worth batching if a buyer with
   * dozens of blocks makes the wait a complaint.
   */
  async downloadAllSheets() {
    if (this.sheetBusy !== null) return;

    this.sheetBusy = 'all';
    this.certError = '';
    this.zipProgress = `(0/${this.sheetChoices.length})`;

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (const [index, choice] of this.sheetChoices.entries()) {
        const sheet = await this.certCard.sheetPdf(choice.target);
        zip.file(sheet.filename, sheet.blob);
        this.zipProgress = `(${index + 1}/${this.sheetChoices.length})`;
        this.cdr.detectChanges();
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      this.saveBlob(blob, `sertifikate-${sanitizeFilename(this.certOwnerName)}.zip`);
    } catch {
      this.certError = 'Kon nie die zip-lêer maak nie. Probeer asseblief weer.';
    } finally {
      this.sheetBusy = null;
      this.zipProgress = '';
    }
  }

  closeChooser() {
    if (this.sheetBusy !== null) return;
    this.clearCert();
  }

  private async saveSheet(target: 'summary' | number) {
    const sheet = await this.certCard.sheetPdf(target);
    this.saveBlob(sheet.blob, sheet.filename);
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private clearCert() {
    this.sheetChoices = [];
    this.certSquares = [];
    this.certOwnerName = '';
  }

  submit() {
    this.message = '';
    this.isError = false;
    this.loading = true;

    this.admin.makeAdmin(this.email.trim()).subscribe({
      next: (res) => {
        this.message = res.message || 'Gebruiker is nou admin.';
        this.email = '';
        this.loading = false;
      },
      error: (err) => {
        this.message = err.error?.message || (Array.isArray(err.error) ? err.error.join(', ') : 'Kon nie admin maak nie.');
        this.isError = true;
        this.loading = false;
      }
    });
  }
}
