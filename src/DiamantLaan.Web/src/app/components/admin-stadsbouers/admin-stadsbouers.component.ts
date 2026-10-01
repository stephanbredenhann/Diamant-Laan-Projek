import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminStadsbouer } from '../../services/admin.service';
import { AlertComponent } from '../shared/alert/alert.component';
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

/**
 * The road builders visitors can sponsor a block for. The email is the one an account gets
 * created under when a sponsorship is paid, so it is edited here and never shown publicly.
 */
@Component({
  selector: 'app-admin-stadsbouers',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, PaginatorComponent],
  template: `
    <app-alert [message]="message" [type]="messageType" />

    <div class="table-card">
      <div class="table-header">
        <h3>Stadsbouers ({{ filtered.length }})</h3>
        <div class="table-actions">
          <input [(ngModel)]="search" (input)="applyFilter()" placeholder="Soek naam of e-pos" name="search">
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
    .merk.uit { background: var(--color-border); color: var(--color-muted); }
    .rye-knoppies { display: flex; gap: 0.5rem; align-items: center; white-space: nowrap; }
    .bevestig { font-weight: 600; color: var(--color-text); }
    .danger { color: #DC2626; border-color: #FECACA; }
    .danger:hover:not(:disabled) { background: #FEF2F2; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }

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
  private admin = inject(AdminService);

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

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    this.loslaatFotos();
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
