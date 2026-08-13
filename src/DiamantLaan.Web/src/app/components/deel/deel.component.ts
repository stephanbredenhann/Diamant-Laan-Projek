import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CertificateCardComponent } from '../shared/certificate-card/certificate-card.component';

interface PublicCertificate {
  name: string;
  firstName: string;
  blocks: number[];
  purchaseDate?: string;
}

/**
 * What someone sees when they open a sponsor's public share link. It draws the same summary
 * certificate the owner sees, from the same component, so the two can never drift apart.
 *
 * Link previews never reach this page: crawlers are answered by SharePageController with a
 * server-rendered shell carrying the Open Graph tags.
 */
@Component({
  selector: 'app-deel',
  standalone: true,
  imports: [RouterLink, CertificateCardComponent],
  template: `
    <div class="container">
      @if (cert; as c) {
        <div class="page-header">
          <p class="eyebrow">Stadsbouer</p>
          <h1 class="display page-title">{{ c.firstName }} het {{ c.blocks.length }} m² geborg vir die Oewerpad in Orania!</h1>
          <p class="lead">
            Elke m² wat geborg word, help om die Oewerpad te teer. Hier is {{ c.firstName }} se sertifikaat.
          </p>
        </div>

        <div class="sheet-wrap">
          <app-certificate-card [ownerName]="c.name" [squares]="squares" />
        </div>

        <div class="cta">
          <a routerLink="/bou" class="btn btn-primary btn-xl">Borg ook ’n m²</a>
          <a routerLink="/" class="terug">Meer oor Diamant Laan</a>
        </div>
      } @else if (laai) {
        <p class="boodskap">Besig om te laai...</p>
      } @else {
        <div class="page-header">
          <h1 class="display page-title">Hierdie skakel is nie meer geldig nie</h1>
          <p class="lead">Die openbare skakel bestaan nie, of is verwyder.</p>
          <a routerLink="/" class="btn btn-primary btn-xl">Terug na Diamant Laan</a>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .container { padding: 3rem 1.5rem 5rem; max-width: 820px; }
    .page-title { font-size: clamp(2.25rem, 6vw, 3.5rem); margin: 0.5rem 0 0.75rem; color: var(--ink); }
    .lead { font-size: var(--fs-lg); color: var(--text-muted); max-width: 40rem; }
    .sheet-wrap { margin: 2rem 0; }
    .cta { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .cta .btn { width: 100%; max-width: 26rem; }
    .terug { color: var(--text-muted); }
    .boodskap { color: var(--text-muted); }
  `]
})
export class DeelComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  cert: PublicCertificate | null = null;
  laai = true;

  /** The public sheet is always the summary, so no per-block names and one shared date. */
  get squares() {
    return (this.cert?.blocks ?? []).map(id => ({ id, purchaseDate: this.cert!.purchaseDate }));
  }

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.laai = false;
      return;
    }
    this.http.get<PublicCertificate>(`/api/deel/${encodeURIComponent(token)}/sertifikaat`).subscribe({
      next: cert => { this.cert = cert; this.laai = false; },
      error: () => { this.laai = false; }
    });
  }
}
