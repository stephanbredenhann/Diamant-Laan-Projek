import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService, AdminStadsbouer, PROOF_METHODS, PaymentMethod } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { normalizePhoneLocal, validatePhone } from '../../utils/validation.util';
import { AlertComponent } from '../shared/alert/alert.component';
import { BlockPickerModalComponent } from '../shared/block-picker-modal/block-picker-modal.component';
import { PhoneInputComponent } from '../shared/phone-input/phone-input.component';
import {
  CertificateCardComponent,
  CertificateSquare,
  sanitizeFilename,
} from '../shared/certificate-card/certificate-card.component';
import { PaginatorComponent, PAGE_SIZE } from '../shared/paginator/paginator.component';

interface Vorm {
  id: number | null;
  name: string;
  title: string;
  about: string;
  email: string;
  isActive: boolean;
  photo: File | null;
}

const LEE_VORM: Vorm = {
  id: null, name: '', title: '', about: '', email: '', isActive: true, photo: null
};

/** A telefoniese aankoop for one builder: the payer's details, and the one block it buys. */
interface Koop {
  bouer: AdminStadsbouer;
  blok: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneCountryCode: string;
  isOraniaResident: boolean;
  isOraniaBewegingMember: boolean;
  paymentMethod: PaymentMethod;
  proof: File | null;
}

/**
 * The road builders visitors can sponsor a block for. The email is the one an account gets
 * created under when a sponsorship is paid, so it is edited here and never shown publicly.
 */
@Component({
  selector: 'app-admin-stadsbouers',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AlertComponent, PaginatorComponent, CertificateCardComponent,
    PhoneInputComponent, BlockPickerModalComponent
  ],
  template: `
    <app-alert [message]="message" [type]="messageType" />

    <div class="table-card">
      <div class="table-header">
        <h3>Stadsbouers ({{ filtered.length }})</h3>
        <div class="table-actions">
          <input [(ngModel)]="search" (input)="applyFilter()" placeholder="Soek naam of e-pos" name="search">
          @if (bouers.length) {
            <button type="button" class="btn btn-outline btn-sm" [disabled]="busy" (click)="stelAlmalAktief(!almalAktief)">
              {{ almalAktief ? 'Deaktiveer almal' : 'Aktiveer almal' }}
            </button>
          }
          <button type="button" class="btn btn-primary btn-sm" (click)="openNew()">Nuwe stadsbouer</button>
        </div>
      </div>

      @if (loading) {
        <p class="empty">Besig om te laai...</p>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Naam en van</th>
                <th>Werkstitel</th>
                <th>E-pos</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (b of filtered | slice:page * pageSize:(page + 1) * pageSize; track b.id) {
                <tr [class.inaktief]="!b.isActive">
                  <td>
                    @if (b.hasPhoto) {
                      <img class="duim" [src]="fotos[b.id]" [alt]="b.name">
                    } @else {
                      <span class="duim geen">—</span>
                    }
                  </td>
                  <td class="naam">{{ b.name }}</td>
                  <td>{{ b.title || '—' }}</td>
                  <td>
                    {{ b.email || '-' }}
                    @if (b.isSponsored && !b.email) {
                      <span class="merk hangend">Wag vir e-pos</span>
                    }
                  </td>
                  <td>
                    @if (b.isSponsored) {
                      <span class="merk geborg">Geborg</span>
                      @if (b.handedOverAt) {
                        @if (b.handoverPhotoUrl) {
                          <a class="merk oorhandig" [href]="b.handoverPhotoUrl" target="_blank" rel="noopener">Oorhandig {{ b.handedOverAt | date:'d MMM y' }}</a>
                        } @else {
                          <span class="merk oorhandig">Oorhandig {{ b.handedOverAt | date:'d MMM y' }}</span>
                        }
                      }
                    } @else if (b.isPending) {
                      <span class="merk hangend">Hangend</span>
                    } @else if (!b.isActive) {
                      <span class="merk uit">Onaktief</span>
                    } @else {
                      <span class="merk oop">Beskikbaar</span>
                    }
                  </td>
                  <td class="rye-knoppies">
                    @if (confirmDeleteId === b.id) {
                      <span class="bevestig">Seker?</span>
                      <button type="button" class="btn btn-outline btn-sm danger" [disabled]="busy" (click)="remove(b)">Ja, verwyder</button>
                      <button type="button" class="btn btn-outline btn-sm" [disabled]="busy" (click)="confirmDeleteId = null">Nee</button>
                    } @else {
                      @if (!b.isSponsored && !b.isPending) {
                        <button type="button" class="btn btn-outline btn-sm" [disabled]="busy" (click)="openKoop(b)">Koop</button>
                      }
                      @if (b.isSponsored) {
                        <button type="button" class="btn btn-outline btn-sm" [disabled]="busy || certBusy" (click)="downloadCertificate(b)">Sertifikaat</button>
                        @if (!b.handedOverAt) {
                          <button type="button" class="btn btn-outline btn-sm" [disabled]="busy || certBusy" (click)="openHandover(b)">Oorhandig</button>
                        }
                      }
                      <button type="button" class="btn btn-outline btn-sm" [disabled]="busy" (click)="openEdit(b)">Wysig</button>
                      <button type="button" class="btn btn-outline btn-sm" [disabled]="busy || b.isSponsored" (click)="confirmDeleteId = b.id">Verwyder</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">Geen stadsbouers nie.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-paginator [total]="filtered.length" [(page)]="page" />
      }
    </div>

    <!-- Off-screen certificate used only for PDF export -->
    <div class="cert-export-host" aria-hidden="true">
      <app-certificate-card
        #certCard
        [ownerName]="certOwnerName"
        [squares]="certSquares"
        [lockedMode]="'summary'"
        [viewOnly]="true" />
    </div>

    @if (handover) {
      <div class="modal-backdrop" (click)="closeHandover()">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="oh-title" (click)="$event.stopPropagation()">
          <h3 id="oh-title">Oorhandig aan {{ handover.name }}</h3>
          <p class="hint">Dit kan net een keer gebeur. Die borg kry ’n dankie-e-pos, met die foto as jy een kies.</p>

          <div class="field">
            <input type="file" accept="image/*" capture="environment" aria-label="Foto" (change)="kiesHandoverFoto($event)">
            @if (handoverPreview) {
              <img class="voorskou" [src]="handoverPreview" alt="Voorskou van die foto">
            }
          </div>

          @if (formError) {
            <p class="error-msg">{{ formError }}</p>
          }

          <button type="button" class="btn btn-primary btn-sm btn-wide" [disabled]="saving" (click)="stuurHandover()">
            {{ saving ? 'Besig...' : 'Stuur' }}
          </button>
          <button type="button" class="btn btn-outline btn-sm btn-wide" [disabled]="saving" (click)="closeHandover()">Kanselleer</button>
        </div>
      </div>
    }

    @if (koop) {
      <div class="modal-backdrop" (click)="closeKoop()">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="koop-title" (click)="$event.stopPropagation()">
          <h3 id="koop-title">Koop ’n blok vir {{ koop.bouer.name }}</h3>
          <p class="hint">Vir ’n telefoniese bestelling. Die blok gaan na die stadsbouer, en die borg kry net die dankie-e-pos.</p>

          <div class="field">
            <label>Blok</label>
            <div class="blok-ry">
              <span class="blok">{{ koop.blok ? 'Blok #' + koop.blok : (blokBesig ? 'Besig...' : 'Geen blok nie') }}</span>
              <button type="button" class="btn btn-outline btn-sm" [disabled]="saving" (click)="pickerOpen = true">Kies op kaart</button>
            </div>
            <p class="sub-hint">Toegeken soos “kies vir my”. Totaal R500.</p>
          </div>

          <div class="grid">
            <div class="field">
              <label for="koop-voornaam">Voornaam <span aria-hidden="true">*</span></label>
              <input id="koop-voornaam" [(ngModel)]="koop.firstName" name="firstName" maxlength="100">
            </div>
            <div class="field">
              <label for="koop-van">Van <span aria-hidden="true">*</span></label>
              <input id="koop-van" [(ngModel)]="koop.lastName" name="lastName" maxlength="100">
            </div>
          </div>

          <div class="field">
            <label for="koop-epos">E-pos <span aria-hidden="true">*</span></label>
            <input id="koop-epos" type="email" [(ngModel)]="koop.email" name="email" maxlength="256">
          </div>

          <div class="field">
            <label>Foonnommer</label>
            <app-phone-input [(countryCode)]="koop.phoneCountryCode" [(phoneNumber)]="koop.phoneNumber" />
          </div>

          <div class="field checkbox">
            <label>
              <input type="checkbox" [(ngModel)]="koop.isOraniaResident" name="isOraniaResident">
              Inwoner van Orania?
            </label>
          </div>
          <div class="field checkbox">
            <label>
              <input type="checkbox" [(ngModel)]="koop.isOraniaBewegingMember" name="isOraniaBewegingMember">
              Lid van Orania Beweging?
            </label>
          </div>

          <div class="field">
            <label for="koop-metode">Betaalmetode</label>
            <select id="koop-metode" [(ngModel)]="koop.paymentMethod" name="paymentMethod" (ngModelChange)="koop.proof = laatBewysToe($event) ? koop.proof : null">
              <option value="EFT">EFT</option>
              <option value="Cash">Kontant</option>
              <option value="Card">Kaart</option>
              <option value="Bitcoin">Bitcoin</option>
              <option value="PayPal">PayPal</option>
            </select>
          </div>

          @if (laatBewysToe(koop.paymentMethod)) {
            <div class="field">
              <label for="koop-bewys">Bewys van betaling (PDF, opsioneel)</label>
              <input id="koop-bewys" type="file" accept="application/pdf" (change)="kiesBewys($event)">
            </div>
          }

          @if (formError) {
            <p class="error-msg">{{ formError }}</p>
          }

          <button type="button" class="btn btn-primary btn-sm btn-wide" [disabled]="saving || !kanKoop()" (click)="stuurKoop()">
            {{ saving ? 'Besig...' : 'Voltooi aankoop' }}
          </button>
          <button type="button" class="btn btn-outline btn-sm btn-wide" [disabled]="saving" (click)="closeKoop()">Kanselleer</button>
        </div>
      </div>
    }

    @if (koop && pickerOpen) {
      <app-block-picker-modal
        [initialIds]="koop.blok ? [koop.blok] : []"
        (confirmed)="kiesBlok($event)"
        (cancelled)="pickerOpen = false"
      />
    }

    @if (vorm) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="sb-title" (click)="$event.stopPropagation()">
          <h3 id="sb-title">{{ vorm.id ? 'Wysig stadsbouer' : 'Nuwe stadsbouer' }}</h3>
          <p class="hint">Die e-posadres word gebruik om ’n rekening te skep sodra iemand vir hulle borg, presies soos by ’n telefoniese aankoop. Sonder e-pos bly die blokkie bewaar tot een bygevoeg word.</p>

          <div class="field">
            <label for="sb-naam">Naam en van <span aria-hidden="true">*</span></label>
            <input id="sb-naam" [(ngModel)]="vorm.name" name="name" maxlength="100" placeholder="Volle naam">
          </div>

          <div class="field">
            <label for="sb-epos">E-pos</label>
            <input id="sb-epos" type="email" [(ngModel)]="vorm.email" name="email" maxlength="254" placeholder="naam@voorbeeld.co.za">
          </div>

          <div class="field">
            <label for="sb-titel">Werkstitel</label>
            <input id="sb-titel" [(ngModel)]="vorm.title" name="title" maxlength="100" placeholder="bv. Voorman">
          </div>

          <div class="field">
            <label for="sb-oor">Beskrywing</label>
            <textarea id="sb-oor" [(ngModel)]="vorm.about" name="about" maxlength="2000" rows="5"
              placeholder="’n Paar sinne oor wie hulle is en wat hulle aan die pad doen."></textarea>
          </div>

          <div class="field">
            <label for="sb-foto">Foto</label>
            <input id="sb-foto" type="file" accept="image/jpeg,image/png,image/webp" (change)="kiesFoto($event)">
            <p class="sub-hint">
              {{ vorm.photo ? vorm.photo.name : (vorm.id && hasPhoto(vorm.id) ? 'Daar is reeds ’n foto. Kies ’n nuwe een om dit te vervang.' : 'JPEG, PNG of WebP, tot 8 MB.') }}
            </p>
          </div>

          <div class="field checkbox">
            <label>
              <input type="checkbox" [(ngModel)]="vorm.isActive" name="isActive">
              Wys op die borg-bladsy
            </label>
          </div>

          @if (formError) {
            <p class="error-msg">{{ formError }}</p>
          }

          <button type="button" class="btn btn-primary btn-sm btn-wide" [disabled]="saving || !kanStoor()" (click)="save()">
            {{ saving ? 'Besig...' : 'Stoor' }}
          </button>
          <button type="button" class="btn btn-outline btn-sm btn-wide" [disabled]="saving" (click)="close()">Kanselleer</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
    }
    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .table-header h3 {
      font-family: var(--font-heading);
      font-size: 0.9375rem;
      margin: 0;
    }
    .table-actions { display: flex; gap: 0.75rem; align-items: center; }
    .table-actions input {
      width: 220px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th, td { padding: 0.625rem 0.75rem; text-align: left; border-bottom: 1px solid var(--color-border); }
    th {
      font-family: var(--font-heading);
      font-weight: 600;
      color: var(--color-muted);
      white-space: nowrap;
    }
    td { color: var(--color-muted); }
    td.naam { color: var(--color-text); font-weight: 600; }
    .numeric { text-align: right; }
    tr.inaktief td { opacity: 0.6; }
    .empty { text-align: center; padding: 1.5rem; color: var(--color-muted); }
    .duim {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid var(--color-border);
    }
    .duim.geen { background: var(--color-bg, #F5F0E1); }
    .merk {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .merk.oop { background: #E8ECD8; color: #5A6A32; }
    .merk.geborg { background: #FEF2F2; color: #DC2626; }
    .merk.hangend { background: #FDF6E3; color: #8A6D1F; }
    .merk.oorhandig { background: #E8ECD8; color: #5A6A32; margin-left: 0.375rem; text-decoration: none; }
    .merk.uit { background: var(--color-border); color: var(--color-muted); }
    .rye-knoppies { display: flex; gap: 0.5rem; align-items: center; white-space: nowrap; }
    .bevestig { font-weight: 600; color: var(--color-text); }
    .danger { color: #DC2626; border-color: #FECACA; }
    .danger:hover:not(:disabled) { background: #FEF2F2; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }

    .cert-export-host { position: fixed; left: -10000px; top: 0; width: 820px; pointer-events: none; }
    .voorskou { display: block; max-width: 100%; max-height: 240px; margin-top: 0.75rem; border-radius: var(--radius-sm); }

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
      max-width: 460px;
      max-height: 85vh;
      overflow-y: auto;
      background: var(--color-surface);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.25));
    }
    .modal h3 { font-family: var(--font-heading); font-size: 1rem; margin-bottom: 0.375rem; }
    .hint { font-size: 0.8125rem; color: var(--color-muted); margin-bottom: 1.25rem; }
    .field { margin-bottom: 0.75rem; }
    .field label { display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.375rem; }
    .field input:not([type="checkbox"]):not([type="file"]),
    .field textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-family: inherit;
    }
    .field.checkbox label { display: flex; align-items: center; gap: 0.5rem; font-weight: 400; }
    .field select {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-family: inherit;
      background: var(--color-surface);
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
    .blok-ry { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .blok { font-weight: 600; color: var(--color-text); }
    .sub-hint { font-size: 0.75rem; color: var(--color-muted); margin-top: 0.375rem; }
    .error-msg { font-size: 0.8125rem; color: #DC2626; margin-bottom: 0.75rem; }
    .btn-wide { width: 100%; }
    .btn-wide + .btn-wide { margin-top: 0.5rem; }

    @media (max-width: 992px) {
      .table-actions { width: 100%; }
      .table-actions input { flex: 1; }
    }
  `]
})
export class AdminStadsbouersComponent implements OnInit, OnDestroy {
  @ViewChild('certCard') certCard!: CertificateCardComponent;

  private admin = inject(AdminService);
  private road = inject(RoadService);
  private cdr = inject(ChangeDetectorRef);

  bouers: AdminStadsbouer[] = [];
  filtered: AdminStadsbouer[] = [];
  search = '';
  page = 0;
  readonly pageSize = PAGE_SIZE;

  loading = true;
  saving = false;
  busy = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  formError = '';
  confirmDeleteId: number | null = null;
  vorm: Vorm | null = null;
  certBusy = false;
  certOwnerName = '';
  certSquares: CertificateSquare[] = [];
  handover: { id: number; name: string; photo: File | null } | null = null;
  handoverPreview = '';
  koop: Koop | null = null;
  blokBesig = false;
  pickerOpen = false;

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    this.loslaatFotos();
    this.vryHandoverVoorskou();
  }

  /** Object URLs, because the admin photo endpoint needs the bearer token an <img> cannot send. */
  fotos: Record<number, string> = {};

  hasPhoto(id: number) {
    return this.bouers.find(b => b.id === id)?.hasPhoto ?? false;
  }

  applyFilter() {
    const needle = this.search.trim().toLowerCase();
    this.filtered = needle
      ? this.bouers.filter(b => `${b.name} ${b.email ?? ''}`.toLowerCase().includes(needle))
      : [...this.bouers];
    this.page = 0;
  }

  openNew() {
    this.formError = '';
    this.vorm = { ...LEE_VORM };
  }

  openEdit(b: AdminStadsbouer) {
    this.formError = '';
    this.vorm = {
      id: b.id,
      name: b.name,
      title: b.title ?? '',
      about: b.about ?? '',
      email: b.email ?? '',
      isActive: b.isActive,
      photo: null
    };
  }

  close() {
    if (this.saving) return;
    this.vorm = null;
  }

  kiesFoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (this.vorm) {
      this.vorm.photo = input.files?.[0] ?? null;
    }
  }

  kanStoor() {
    return !!this.vorm && this.vorm.name.trim().length >= 2 && (!this.vorm.email.trim() || this.vorm.email.includes('@'));
  }

  save() {
    if (!this.vorm || this.saving || !this.kanStoor()) return;

    const vorm = this.vorm;
    const body = new FormData();
    body.append('name', vorm.name.trim());
    body.append('email', vorm.email.trim());
    body.append('title', vorm.title.trim());
    body.append('about', vorm.about.trim());
    body.append('isActive', String(vorm.isActive));
    if (vorm.photo) {
      body.append('photo', vorm.photo);
    }

    this.saving = true;
    this.formError = '';

    const request = vorm.id
      ? this.admin.updateStadsbouer(vorm.id, body)
      : this.admin.createStadsbouer(body);

    request.subscribe({
      next: (res) => {
        this.saving = false;
        this.vorm = null;
        this.setMessage(res.message, 'success');
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.formError = err.error?.message ?? 'Kon nie stoor nie. Probeer weer.';
      }
    });
  }

  remove(b: AdminStadsbouer) {
    if (this.busy) return;
    this.busy = true;

    this.admin.deleteStadsbouer(b.id).subscribe({
      next: (res) => {
        this.busy = false;
        this.confirmDeleteId = null;
        this.setMessage(res.message, 'success');
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.confirmDeleteId = null;
        this.setMessage(err.error?.message ?? 'Kon nie verwyder nie.', 'error');
      }
    });
  }

  get almalAktief() {
    return this.bouers.every(b => b.isActive);
  }

  stelAlmalAktief(enabled: boolean) {
    if (this.busy) return;
    this.busy = true;

    this.admin.setAllStadsbouersActive(enabled).subscribe({
      next: (res) => {
        this.busy = false;
        this.setMessage(res.message, 'success');
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.setMessage(err.error?.message ?? 'Kon nie stoor nie.', 'error');
      }
    });
  }

  async downloadCertificate(b: AdminStadsbouer) {
    if (this.certBusy) return;
    this.certBusy = true;
    try {
      const summary = await firstValueFrom(this.admin.getStadsbouerCertificate(b.id));
      this.certOwnerName = summary.ownerName;
      this.certSquares = summary.squares.map(s => ({
        id: s.id,
        purchaseDate: s.purchaseDate ?? undefined,
        ownerName: s.ownerName,
        isPioneer: s.isPioneer,
      }));
      this.cdr.detectChanges();
      // Let the certificate card apply lockedMode / sheet layout before capture.
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      const targets = this.certCard.sheetTargets();
      if (targets.length === 1) {
        const sheet = await this.certCard.sheetPdf(targets[0]);
        this.saveBlob(sheet.blob, sheet.filename);
      } else {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        for (const target of targets) {
          const sheet = await this.certCard.sheetPdf(target);
          zip.file(sheet.filename, sheet.blob);
        }
        this.saveBlob(await zip.generateAsync({ type: 'blob' }), `sertifikate-${sanitizeFilename(b.name)}.zip`);
      }
    } catch {
      this.setMessage('Kon nie die sertifikaat genereer nie. Probeer weer.', 'error');
    } finally {
      this.certBusy = false;
      this.certSquares = [];
      this.certOwnerName = '';
    }
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  openHandover(b: AdminStadsbouer) {
    this.formError = '';
    this.handover = { id: b.id, name: b.name, photo: null };
  }

  closeHandover() {
    if (this.saving) return;
    this.handover = null;
    this.vryHandoverVoorskou();
  }

  kiesHandoverFoto(event: Event) {
    if (!this.handover) return;
    this.vryHandoverVoorskou();
    this.handover.photo = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (this.handover.photo) this.handoverPreview = URL.createObjectURL(this.handover.photo);
  }

  async stuurHandover() {
    if (!this.handover || this.saving) return;
    const { id, photo } = this.handover;
    this.saving = true;
    this.formError = '';
    try {
      const blob = photo ? await this.verklein(photo) : null;
      const res = await firstValueFrom(this.admin.handOverStadsbouer(id, blob));
      this.saving = false;
      this.handover = null;
      this.vryHandoverVoorskou();
      this.setMessage(res.message, 'success');
      this.load();
    } catch (err: any) {
      this.saving = false;
      this.formError = err?.error?.message ?? 'Kon nie die oorhandiging stuur nie. Probeer weer.';
    }
  }

  /** Opens the purchase form with a block already drawn, the same way the public /bou flow draws one. */
  openKoop(b: AdminStadsbouer) {
    this.formError = '';
    this.pickerOpen = false;
    const koop: Koop = {
      bouer: b, blok: null, firstName: '', lastName: '', email: '', phoneNumber: '', phoneCountryCode: '+27',
      isOraniaResident: false, isOraniaBewegingMember: false, paymentMethod: 'EFT', proof: null
    };
    this.koop = koop;
    this.blokBesig = true;
    this.road.pickSquares(1).subscribe({
      next: (res) => {
        this.blokBesig = false;
        // The admin may have picked one on the map while this was in flight.
        if (koop.blok == null) koop.blok = res?.squareIds?.[0] ?? null;
      },
      error: (err) => {
        this.blokBesig = false;
        this.formError = err.error?.message ?? 'Kon nie ’n blok toeken nie. Kies een op die kaart.';
      }
    });
  }

  closeKoop() {
    if (this.saving) return;
    this.koop = null;
    this.pickerOpen = false;
  }

  kiesBlok(ids: number[]) {
    if (!this.koop) return;
    if (ids.length !== 1) {
      this.formError = 'Kies presies een blok.';
      return;
    }
    this.koop.blok = ids[0];
    this.formError = '';
    this.pickerOpen = false;
  }

  laatBewysToe(method: PaymentMethod) {
    return PROOF_METHODS.includes(method);
  }

  kiesBewys(event: Event) {
    if (this.koop) this.koop.proof = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  kanKoop() {
    const k = this.koop;
    return !!k && k.blok != null && !!k.firstName.trim() && !!k.lastName.trim() && k.email.includes('@');
  }

  stuurKoop() {
    const k = this.koop;
    if (!k || this.saving || !this.kanKoop()) return;

    const phoneError = validatePhone(k.phoneNumber, k.phoneCountryCode);
    if (phoneError) {
      this.formError = phoneError;
      return;
    }

    const body = new FormData();
    body.append('firstName', k.firstName.trim());
    body.append('lastName', k.lastName.trim());
    body.append('email', k.email.trim());
    body.append('phoneNumber', normalizePhoneLocal(k.phoneNumber, k.phoneCountryCode));
    body.append('phoneCountryCode', k.phoneCountryCode);
    body.append('isOraniaResident', String(k.isOraniaResident));
    body.append('isOraniaBewegingMember', String(k.isOraniaBewegingMember));
    body.append('squareIds', String(k.blok));
    body.append('stadsbouerIds', String(k.bouer.id));
    body.append('paymentMethod', k.paymentMethod);
    if (k.proof && this.laatBewysToe(k.paymentMethod)) {
      body.append('proofOfPayment', k.proof);
    }

    this.saving = true;
    this.formError = '';
    this.admin.manualPurchase(body).subscribe({
      next: (res) => {
        this.saving = false;
        this.koop = null;
        this.setMessage(`Aankoop #${res.purchaseId} voltooi: blok #${k.blok} vir ${k.bouer.name}.`, 'success');
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.formError = err.error?.message ?? 'Kon nie die aankoop voltooi nie. Probeer weer.';
      }
    });
  }

  private vryHandoverVoorskou() {
    if (this.handoverPreview) URL.revokeObjectURL(this.handoverPreview);
    this.handoverPreview = '';
  }

  /** Longest side 1600px as JPEG, so a phone photo stays under the upload limit. */
  private async verklein(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85));
  }

  private load() {
    this.loading = true;
    this.admin.getStadsbouers().subscribe({
      next: (bouers) => {
        this.bouers = bouers;
        this.applyFilter();
        this.loading = false;
        this.laaiFotos();
      },
      error: () => {
        this.loading = false;
        this.setMessage('Kon nie die stadsbouers laai nie.', 'error');
      }
    });
  }

  private laaiFotos() {
    this.loslaatFotos();
    for (const b of this.bouers.filter(b => b.hasPhoto)) {
      this.admin.getStadsbouerFoto(b.id).subscribe({
        next: (blob) => this.fotos[b.id] = URL.createObjectURL(blob),
        error: () => {}
      });
    }
  }

  private loslaatFotos() {
    Object.values(this.fotos).forEach(url => URL.revokeObjectURL(url));
    this.fotos = {};
  }

  private setMessage(text: string, type: 'success' | 'error' | 'info') {
    this.message = text;
    this.messageType = type;
  }
}
