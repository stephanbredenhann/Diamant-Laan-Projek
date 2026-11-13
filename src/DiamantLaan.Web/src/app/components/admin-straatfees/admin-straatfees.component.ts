import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StraatfeesAdminOrder, StraatfeesManualOrder, StraatfeesService } from '../../services/straatfees.service';
import { nommer, randBedrag } from '../../utils/afrikaans.util';
import { COUNTRY_CODES, validatePhone } from '../../utils/validation.util';
import { PhoneInputComponent } from '../shared/phone-input/phone-input.component';

const STATUS: Record<string, string> = {
  Pending: 'Hangend',
  Confirmed: 'Betaal',
  Cancelled: 'Gekanselleer',
  Failed: 'Misluk',
};

const BETAALMETODE: Record<string, string> = {
  Cash: 'Kontant',
  EFT: 'EFT',
  Card: 'Kaart',
};

type Vorm = Omit<StraatfeesManualOrder, 'adults' | 'children'> & { adults: number | null; children: number | null };
const leeg = (): Vorm => ({ name: '', email: '', phoneNumber: '', phoneCountryCode: '+27', adults: 1, children: 0, paymentMethod: 'Cash' });

/**
 * How a stored +E.164 number is shown and exported: "082 123 4567" for South Africa, else
 * "00 44 7911123456". The spaces keep Excel from reading it as a number (dropping the 0) or a formula.
 */
export function foonVertoon(e164: string | null): string {
  if (!e164) return '';
  const sa = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(e164);
  if (sa) return `0${sa[1]} ${sa[2]} ${sa[3]}`;
  const code = COUNTRY_CODES.map(c => c.code).filter(c => e164.startsWith(c)).sort((a, b) => b.length - a.length)[0];
  return code ? `00${code.slice(1)} ${e164.slice(code.length)}` : `00${e164.slice(1)}`;
}

/** CSV cell: quoted, and a leading = + - @ defused so Excel does not run a buyer's name as a formula. */
const sel = (v: string | number) => {
  const t = String(v);
  return `"${(/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"`;
};

/**
 * Straatfees: the on/off switch for ticket sales, a form for sales paid outside PayFast
 * (cash at the gate, EFT), and every order, newest first, exportable as CSV.
 */
@Component({
  selector: 'app-admin-straatfees',
  standalone: true,
  imports: [DatePipe, FormsModule, PhoneInputComponent],
  template: `
    <div class="admin-content">
      <h3>Straatfees-kaartjies</h3>

      <div class="settings-card">
        <label class="toggle-row" [class.disabled]="stoor()">
          <input type="checkbox" [checked]="aktief()" (change)="wissel($any($event.target).checked)" [disabled]="stoor() || laai()" />
          <span>Kaartjieverkope oop</span>
        </label>
        <p class="toggle-hint">Af verberg die Straatfees-knoppie in die navigasie en weier nuwe bestellings. Bestaande kaartjies bly geldig.</p>
      </div>

      @if (fout()) {
        <div class="msg error">{{ fout() }}</div>
      }

      <div class="opsomming">
        <div><span>Volwassenes</span><strong>{{ nommer(volwassenes()) }}</strong></div>
        <div><span>Kinders</span><strong>{{ nommer(kinders()) }}</strong></div>
        <div><span>Betaalde bestellings</span><strong>{{ nommer(betaal().length) }}</strong></div>
        <div><span>Ingesamel</span><strong>{{ rand(ingesamel()) }}</strong></div>
        <div><span>Pryse</span><strong>{{ rand(prys().volwasse) }} / {{ rand(prys().kind) }}</strong></div>
      </div>

      <form class="settings-card handmatig" (ngSubmit)="voegBy()" #f="ngForm">
        <h4>Handmatige verkoping</h4>
        <p class="toggle-hint">Vir kaartjies wat buite PayFast betaal is, bv. kontant by die hek of ’n EFT. Die bestelling word dadelik as betaal aangeteken en die koper kry die kaartjie per e-pos.</p>
        <div class="velde">
          <label>Naam en van
            <input name="naam" [(ngModel)]="vorm.name" required minlength="2" maxlength="120" />
          </label>
          <label>E-pos
            <input name="epos" type="email" [(ngModel)]="vorm.email" required email maxlength="256" />
          </label>
          <div class="veld"><span>Foon <span class="muted">(opsioneel)</span></span>
            <app-phone-input phoneName="admin-fees-foon" [(countryCode)]="vorm.phoneCountryCode" [(phoneNumber)]="vorm.phoneNumber" />
          </div>
          <label>Volwassenes
            <input name="volw" type="number" min="0" max="200" [(ngModel)]="vorm.adults" />
          </label>
          <label>Kinders
            <input name="kinders" type="number" min="0" max="200" [(ngModel)]="vorm.children" />
          </label>
          <label>Betaalmetode
            <select name="metode" [(ngModel)]="vorm.paymentMethod">
              <option value="Cash">Kontant</option>
              <option value="EFT">EFT</option>
              <option value="Card">Kaart</option>
            </select>
          </label>
        </div>
        <div class="vorm-voet">
          <span>Totaal: <strong>{{ rand(vormTotaal()) }}</strong></span>
          <button type="submit" class="btn btn-primary btn-sm" [disabled]="byvoeg() || f.invalid || vormTotaal() === 0">
            {{ byvoeg() ? 'Besig...' : 'Teken verkoping aan' }}
          </button>
        </div>
        @if (byvoegFout()) {
          <div class="msg error">{{ byvoegFout() }}</div>
        }
        @if (bygevoeg(); as o) {
          <div class="msg ok">
            Bestelling #{{ o.id }} vir {{ o.name }} aangeteken. Kode:
            <a class="kode" [href]="'/straatfees/kaartjie/' + o.ticketCode" target="_blank" rel="noopener">{{ o.ticketCode }}</a>
            — kaartjie word na {{ o.email }} gestuur.
          </div>
        }
      </form>

      <div class="filter">
        <label><input type="checkbox" [checked]="netBetaal()" (change)="netBetaal.set($any($event.target).checked)" /> Wys net betaalde bestellings</label>
        <button type="button" class="btn btn-outline btn-sm" (click)="laaiCsvAf()" [disabled]="sigbaar().length === 0">Laai CSV af</button>
      </div>

      @if (laai()) {
        <p class="muted">Laai bestellings...</p>
      } @else if (sigbaar().length === 0) {
        <p class="muted">Nog geen bestellings nie.</p>
      } @else {
        <div class="tabel-hou">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Datum</th>
                <th>Naam</th>
                <th>Kontak</th>
                <th class="getal">Volw.</th>
                <th class="getal">Kinders</th>
                <th class="getal">Bedrag</th>
                <th>Kode</th>
                <th>Status</th>
                <th>Betaling</th>
                <th>E-pos gestuur</th>
              </tr>
            </thead>
            <tbody>
              @for (o of sigbaar(); track o.id) {
                <tr>
                  <td>{{ o.id }}</td>
                  <td class="nowrap">{{ utc(o.createdAt) | date: 'yyyy-MM-dd HH:mm' }}</td>
                  <td>{{ o.name }}</td>
                  <td>
                    @if (o.email) { <a [href]="'mailto:' + o.email">{{ o.email }}</a> } @else { — }
                    @if (o.phone) { <br /><a class="foon" [href]="'tel:' + o.phone">{{ foon(o.phone) }}</a> }
                  </td>
                  <td class="getal">{{ o.adults }}</td>
                  <td class="getal">{{ o.children }}</td>
                  <td class="getal nowrap">{{ rand(o.amount) }}</td>
                  <td><a class="kode" [href]="'/straatfees/kaartjie/' + o.ticketCode" target="_blank" rel="noopener">{{ o.ticketCode }}</a></td>
                  <td><span class="status" [class]="'status status--' + o.status">{{ status(o.status) }}</span></td>
                  <td>{{ metode(o.paymentMethod) }}</td>
                  <td>{{ o.ticketEmailSent ? 'Ja' : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    h3 { font-family: var(--font-heading); font-size: 1.125rem; margin-bottom: 1rem; color: var(--color-text); }
    .muted { color: var(--color-muted); }
    .settings-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      max-width: 600px;
    }
    .toggle-row { display: flex; align-items: center; gap: 0.75rem; color: var(--color-text); cursor: pointer; }
    .toggle-row.disabled { opacity: 0.6; cursor: not-allowed; }
    .toggle-row input { width: 18px; height: 18px; accent-color: var(--fees-blue); cursor: pointer; }
    .toggle-hint { margin: 0.75rem 0 0; font-size: 0.8125rem; color: var(--color-muted); }
    .msg.ok { margin-top: 1rem; font-size: 0.8125rem; padding: 0.625rem 1rem; background: #EEF3FB; color: #1F3A7A; }
    .handmatig { margin-top: 1.5rem; max-width: 760px; }
    .handmatig h4 { font-family: var(--font-heading); margin: 0; }
    .handmatig .toggle-hint { margin: 0.25rem 0 1rem; }
    .velde { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.75rem; }
    .velde label, .velde .veld { grid-column: span 2; }
    @media (max-width: 600px) { .velde label, .velde .veld { grid-column: 1 / -1; } }
    .foon { white-space: nowrap; color: var(--color-muted); }
    .velde label, .velde .veld { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8125rem; color: var(--color-muted); }
    .velde input, .velde select { padding: 0.5rem; border: 1px solid var(--color-border); font: inherit; color: var(--color-text); background: var(--color-surface); }
    .vorm-voet { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; }
    .msg.error { margin-top: 1rem; font-size: 0.8125rem; padding: 0.625rem 1rem; background: #FEF2F2; color: #DC2626; max-width: 600px; }

    .opsomming { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.75rem; margin: 1.5rem 0 1rem; }
    .opsomming div { background: var(--color-surface); border: 1px solid var(--color-border); border-top: 3px solid var(--fees-blue); padding: 0.75rem 1rem; display: flex; flex-direction: column; }
    .opsomming span { font-size: 0.8125rem; color: var(--color-muted); }
    .opsomming strong { font-family: var(--font-display); font-size: 1.6rem; font-variant-numeric: tabular-nums; }

    .filter { margin: 1.5rem 0 0.75rem; font-size: 0.875rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .filter label { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; }

    .tabel-hou { overflow-x: auto; border: 1px solid var(--color-border); background: var(--color-surface); }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { text-align: left; padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--color-border); vertical-align: top; }
    th { font-family: var(--font-heading); background: var(--surface-alt); white-space: nowrap; }
    tbody tr:last-child td { border-bottom: none; }
    .getal { text-align: right; font-variant-numeric: tabular-nums; }
    .nowrap { white-space: nowrap; }
    .kode { font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 0.05em; }
    .status { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: #E8DCC8; color: #4A4030; }
    .status--Confirmed { background: #E3E9F7; color: #1F3A7A; }
    .status--Cancelled, .status--Failed { background: #FDECEA; color: #8C1D18; }
  `]
})
export class AdminStraatfeesComponent implements OnInit {
  private service = inject(StraatfeesService);

  laai = signal(true);
  stoor = signal(false);
  fout = signal<string | null>(null);
  aktief = signal(false);
  prys = signal({ volwasse: 0, kind: 0 });
  bestellings = signal<StraatfeesAdminOrder[]>([]);
  netBetaal = signal(false);

  vorm: Vorm = leeg();
  byvoeg = signal(false);
  byvoegFout = signal<string | null>(null);
  bygevoeg = signal<StraatfeesAdminOrder | null>(null);

  betaal = computed(() => this.bestellings().filter(o => o.status === 'Confirmed'));
  volwassenes = computed(() => this.betaal().reduce((sum, o) => sum + o.adults, 0));
  kinders = computed(() => this.betaal().reduce((sum, o) => sum + o.children, 0));
  ingesamel = computed(() => this.betaal().reduce((sum, o) => sum + o.amount, 0));
  sigbaar = computed(() => this.netBetaal() ? this.betaal() : this.bestellings());

  rand = randBedrag;
  nommer = nommer;
  status = (s: string) => STATUS[s] ?? s;
  foon = foonVertoon;
  metode = (m: string | null) => m ? BETAALMETODE[m] ?? m : 'PayFast';
  /** SQLite hands DateTimes back without a zone; they are stored as UTC. */
  utc = (s: string) => /Z|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z';

  vormTotaal() {
    return (this.vorm.adults ?? 0) * this.prys().volwasse + (this.vorm.children ?? 0) * this.prys().kind;
  }

  ngOnInit() {
    this.service.adminList().subscribe({
      next: res => {
        this.aktief.set(res.enabled);
        this.prys.set({ volwasse: res.adultPrice, kind: res.childPrice });
        this.bestellings.set(res.orders);
        this.laai.set(false);
      },
      error: () => {
        this.fout.set('Kon nie bestellings laai nie.');
        this.laai.set(false);
      }
    });
  }

  wissel(enabled: boolean) {
    const vorige = this.aktief();
    this.aktief.set(enabled);
    this.stoor.set(true);
    this.fout.set(null);
    this.service.setEnabled(enabled).subscribe({
      next: res => {
        this.aktief.set(res.enabled);
        this.stoor.set(false);
      },
      error: () => {
        this.aktief.set(vorige);
        this.stoor.set(false);
        this.fout.set('Kon nie die instelling stoor nie.');
      }
    });
  }

  voegBy() {
    this.byvoeg.set(true);
    this.byvoegFout.set(null);
    this.bygevoeg.set(null);
    const foonFout = validatePhone(this.vorm.phoneNumber, this.vorm.phoneCountryCode);
    if (foonFout) {
      this.byvoegFout.set(foonFout);
      this.byvoeg.set(false);
      return;
    }
    this.service.adminCreate({
      ...this.vorm,
      name: this.vorm.name.trim(),
      email: this.vorm.email.trim(),
      phoneNumber: this.vorm.phoneNumber.trim(),
      adults: this.vorm.adults ?? 0,
      children: this.vorm.children ?? 0,
    }).subscribe({
      next: order => {
        this.bestellings.update(list => [order, ...list]);
        this.bygevoeg.set(order);
        this.vorm = leeg();
        this.byvoeg.set(false);
      },
      error: err => {
        this.byvoegFout.set(err?.error?.message ?? 'Kon nie die verkoping aanteken nie.');
        this.byvoeg.set(false);
      }
    });
  }

  /** The list as shown (so the "net betaal" filter applies), with SAST times for the bookkeeping. */
  laaiCsvAf() {
    const sast = (s: string | null) => s ? new Date(Date.parse(this.utc(s)) + 2 * 3600_000).toISOString().slice(0, 16).replace('T', ' ') : '';
    const kop = ['#', 'Datum (SAST)', 'Bevestig op (SAST)', 'Naam', 'E-pos', 'Foon', 'Volwassenes', 'Kinders', 'Bedrag', 'Kode', 'Status', 'Betaling', 'PayFast-betaling-ID', 'E-pos gestuur'];
    const rye = this.sigbaar().map(o => [
      o.id, sast(o.createdAt), sast(o.confirmedAt), o.name, o.email, foonVertoon(o.phone), o.adults, o.children, o.amount.toFixed(2),
      o.ticketCode, this.status(o.status), this.metode(o.paymentMethod), o.payFastPaymentId ?? '', o.ticketEmailSent ? 'Ja' : 'Nee',
    ]);
    const csv = '\uFEFF' + [kop, ...rye].map(r => r.map(sel).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `straatfees-bestellings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
