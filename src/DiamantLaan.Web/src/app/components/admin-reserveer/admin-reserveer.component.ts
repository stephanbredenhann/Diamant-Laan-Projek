import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../services/admin.service';
import { RoadService } from '../../services/road.service';
import { Square } from '../../models/square';
import { blokLabel } from '../../utils/afrikaans.util';
import { MAX_BLOK_ID } from '../bou/kaart/blok-reekse';
import { nommersNaReekse, ontleedBlokNommers, reeksTeks } from '../../utils/blok-nommers';

@Component({
  selector: 'app-admin-reserveer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-content">
      <h3>Blokke reserveer</h3>
      <p class="intro">
        Gereserveerde blokke wys as "Onbeskikbaar" op die kaart en kan nie deur die publiek
        gekoop word nie. Jy kan hulle steeds self verkoop onder Telefoniese aankoop.
      </p>

      <div class="card">
        <label for="blokke">Bloknommers</label>
        <textarea
          id="blokke"
          rows="3"
          [(ngModel)]="invoer"
          [disabled]="besig()"
          placeholder="Byvoorbeeld: 1-199, 250, 300-310"></textarea>
        <p class="hint">Skei met kommas. Gebruik ’n koppelteken vir ’n reeks. Hoogstens 500 blokke op ’n slag.</p>

        <div class="actions">
          <button type="button" class="btn btn-primary" [disabled]="besig()" (click)="stel(true)">
            Reserveer
          </button>
          <button type="button" class="btn btn-secondary" [disabled]="besig()" (click)="stel(false)">
            Stel vry
          </button>
        </div>
      </div>

      @if (boodskap()) {
        <div class="msg" [class.error]="isFout()">{{ boodskap() }}</div>
      }

      <h4>Tans gereserveer</h4>
      @if (laai()) {
        <p class="muted">Laai blokke...</p>
      } @else if (gereserveerdeReekse().length === 0) {
        <p class="muted">Geen blokke is tans gereserveer nie.</p>
      } @else {
        <p class="muted">
          {{ gereserveerdeIds().length }} {{ blokLabel(gereserveerdeIds().length) }} gereserveer.
        </p>
        <ul class="reekse">
          @for (r of gereserveerdeReekse(); track r.van) {
            <li>
              <span class="reeks">{{ reeksTeks(r) }}</span>
              <button
                type="button"
                class="link-btn"
                [disabled]="besig()"
                (click)="stelVryReeks(r)">Stel vry</button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .admin-content { max-width: 700px; }
    h3 {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
      color: var(--color-text);
    }
    h4 {
      font-family: var(--font-heading);
      font-size: 1.0625rem;
      margin: 2rem 0 0.5rem;
      color: var(--color-text);
    }
    .intro { color: var(--color-muted); margin-bottom: 1.25rem; line-height: 1.5; }
    .muted { color: var(--color-muted); }
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.375rem;
      color: var(--color-text);
    }
    textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 1rem;
      resize: vertical;
    }
    .hint { font-size: 0.8125rem; color: var(--color-muted); margin: 0.5rem 0 1rem; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .msg {
      margin-top: 1rem;
      font-size: 0.875rem;
      padding: 0.625rem 1rem;
      border-radius: var(--radius-sm);
      background: #E8ECD8;
      color: #5A6A32;
    }
    .msg.error { background: #FEF2F2; color: #DC2626; }
    .reekse { list-style: none; padding: 0; margin: 0; }
    .reekse li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }
    .reeks { font-variant-numeric: tabular-nums; color: var(--color-text); }
    .link-btn {
      background: none;
      border: none;
      color: var(--color-orange);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0;
    }
    .link-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class AdminReserveerComponent implements OnInit {
  private admin = inject(AdminService);
  private road = inject(RoadService);

  readonly blokLabel = blokLabel;
  readonly reeksTeks = reeksTeks;

  invoer = '';
  besig = signal(false);
  laai = signal(true);
  boodskap = signal('');
  isFout = signal(false);

  private squares = signal<Square[]>([]);

  gereserveerdeIds = computed(() =>
    this.squares().filter(s => s.isReserved).map(s => s.id));

  gereserveerdeReekse = computed(() => nommersNaReekse(this.gereserveerdeIds()));

  ngOnInit() {
    this.herlaai();
  }

  stel(reserved: boolean) {
    const { ids, fout } = ontleedBlokNommers(this.invoer, MAX_BLOK_ID);
    if (fout) {
      this.wysFout(fout);
      return;
    }
    this.stuur(ids, reserved, () => (this.invoer = ''));
  }

  stelVryReeks(r: { van: number; tot: number }) {
    const ids: number[] = [];
    for (let id = r.van; id <= r.tot; id++) ids.push(id);
    this.stuur(ids, false);
  }

  private stuur(ids: number[], reserved: boolean, onSuccess?: () => void) {
    this.besig.set(true);
    this.boodskap.set('');
    this.isFout.set(false);

    this.admin.reserveSquares(ids, reserved).subscribe({
      next: res => {
        onSuccess?.();
        this.boodskap.set(
          reserved
            ? `${res.updated} ${blokLabel(res.updated)} gereserveer.`
            : `${res.updated} ${blokLabel(res.updated)} vrygestel.`);
        this.herlaai();
      },
      error: (err: HttpErrorResponse) => {
        this.besig.set(false);
        this.wysFout(err.error?.message ?? 'Kon nie die blokke opdateer nie.');
      }
    });
  }

  private herlaai() {
    this.road.getSquares().subscribe({
      next: s => {
        this.squares.set(s);
        this.laai.set(false);
        this.besig.set(false);
      },
      error: () => {
        this.laai.set(false);
        this.besig.set(false);
        this.wysFout('Kon nie die blokke laai nie.');
      }
    });
  }

  private wysFout(teks: string) {
    this.boodskap.set(teks);
    this.isFout.set(true);
  }
}
