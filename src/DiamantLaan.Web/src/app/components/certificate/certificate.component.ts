import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PurchaseService, PurchaseTransaction } from '../../services/purchase.service';
import { CertificateCardComponent, CertificateSquare } from '../shared/certificate-card/certificate-card.component';

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [RouterLink, CertificateCardComponent],
  template: `
    <div class="container">
      <div class="page-header">
        <p class="eyebrow">My rekening</p>
        <h2 class="display page-title">Sertifikaat</h2>
      </div>
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
  `]
})
export class CertificateComponent implements OnInit {
  private auth = inject(AuthService);
  private purchase = inject(PurchaseService);

  ownerName = '';
  squares: CertificateSquare[] = [];

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.ownerName = `${user.firstName} ${user.lastName}`.trim();
    }

    // The squares endpoint carries no date, so pair it with the transactions to stamp each
    // certificate with the day that block was actually bought. A failure there is not worth
    // blocking the certificate over — the date row just stays blank, as it was before.
    forkJoin({
      squares: this.purchase.getMySquares(),
      transactions: this.purchase.getMyTransactions().pipe(catchError(() => of([] as PurchaseTransaction[]))),
    }).subscribe(({ squares, transactions }) => {
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

      this.squares = [...squares]
        .sort((a, b) => a.id - b.id)
        .map(square => ({ ...square, purchaseDate: boughtOn.get(square.id) }));
    });
  }
}
