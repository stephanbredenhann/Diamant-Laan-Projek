import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { StraatfeesAdminOrder, StraatfeesService } from '../../services/straatfees.service';
import { nommer, randBedrag } from '../../utils/afrikaans.util';

const STATUS: Record<string, string> = {
  Pending: 'Hangend',
  Confirmed: 'Betaal',
  Cancelled: 'Gekanselleer',
  Failed: 'Misluk',
};

/** Straatfees: the on/off switch for ticket sales and every order, newest first. */
@Component({
  selector: 'app-admin-straatfees',
  standalone: true,
  imports: [DatePipe],
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

      <div class="filter">
        <label><input type="checkbox" [checked]="netBetaal()" (change)="netBetaal.set($any($event.target).checked)" /> Wys net betaalde bestellings</label>
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
                <th>E-pos</th>
                <th class="getal">Volw.</th>
                <th class="getal">Kinders</th>
                <th class="getal">Bedrag</th>
                <th>Kode</th>
                <th>Status</th>
                <th>E-pos gestuur</th>
              </tr>
            </thead>
            <tbody>
              @for (o of sigbaar(); track o.id) {
                <tr>
                  <td>{{ o.id }}</td>
                  <td class="nowrap">{{ utc(o.createdAt) | date: 'yyyy-MM-dd HH:mm' }}</td>
                  <td>{{ o.name }}</td>
                  <td><a [href]="'mailto:' + o.email">{{ o.email }}</a></td>
                  <td class="getal">{{ o.adults }}</td>
                  <td class="getal">{{ o.children }}</td>
                  <td class="getal nowrap">{{ rand(o.amount) }}</td>
                  <td><a class="kode" [href]="'/straatfees/kaartjie/' + o.ticketCode" target="_blank" rel="noopener">{{ o.ticketCode }}</a></td>
                  <td><span class="status" [class]="'status status--' + o.status">{{ status(o.status) }}</span></td>
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
    .msg.error { margin-top: 1rem; font-size: 0.8125rem; padding: 0.625rem 1rem; background: #FEF2F2; color: #DC2626; max-width: 600px; }

    .opsomming { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.75rem; margin: 1.5rem 0 1rem; }
    .opsomming div { background: var(--color-surface); border: 1px solid var(--color-border); border-top: 3px solid var(--fees-blue); padding: 0.75rem 1rem; display: flex; flex-direction: column; }
    .opsomming span { font-size: 0.8125rem; color: var(--color-muted); }
    .opsomming strong { font-family: var(--font-display); font-size: 1.6rem; font-variant-numeric: tabular-nums; }

    .filter { margin-bottom: 0.75rem; font-size: 0.875rem; }
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

  betaal = computed(() => this.bestellings().filter(o => o.status === 'Confirmed'));
  volwassenes = computed(() => this.betaal().reduce((sum, o) => sum + o.adults, 0));
  kinders = computed(() => this.betaal().reduce((sum, o) => sum + o.children, 0));
  ingesamel = computed(() => this.betaal().reduce((sum, o) => sum + o.amount, 0));
  sigbaar = computed(() => this.netBetaal() ? this.betaal() : this.bestellings());

  rand = randBedrag;
  nommer = nommer;
  status = (s: string) => STATUS[s] ?? s;
  /** SQLite hands DateTimes back without a zone; they are stored as UTC. */
  utc = (s: string) => /Z|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z';

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
}
