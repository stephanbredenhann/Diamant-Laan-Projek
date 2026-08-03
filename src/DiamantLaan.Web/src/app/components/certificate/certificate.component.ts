import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PurchaseService } from '../../services/purchase.service';
import { CertificateCardComponent } from '../shared/certificate-card/certificate-card.component';

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [RouterLink, CertificateCardComponent],
  template: `
    <div class="container">
      <app-certificate-card
        [ownerName]="ownerName"
        [squares]="squares"
        [blockCount]="blockCount"
        [totalSpent]="totalSpent">
        <a routerLink="/my-blokke" class="btn btn-outline">Terug na My Blokke</a>
      </app-certificate-card>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem 4rem; max-width: 800px; }
  `]
})
export class CertificateComponent implements OnInit {
  private auth = inject(AuthService);
  private purchase = inject(PurchaseService);

  ownerName = '';
  squares: { id: number; status: number }[] = [];
  blockCount = 0;
  totalSpent = 0;

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.ownerName = `${user.firstName} ${user.lastName}`.trim();
    }
    this.purchase.getMySquares().subscribe(s => {
      this.squares = s.sort((a, b) => a.id - b.id);
      this.blockCount = this.squares.length;
    });
    this.purchase.getMySummary().subscribe({
      next: summary => {
        this.blockCount = summary.blockCount;
        this.totalSpent = summary.totalSpent;
      },
      error: () => {
        this.totalSpent = this.blockCount * 500;
      }
    });
  }
}
