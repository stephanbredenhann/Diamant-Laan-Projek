import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminTransactionsComponent } from './admin-transactions.component';
import { AdminTransaction } from '../../services/admin.service';

describe('AdminTransactionsComponent search', () => {
  let cmp: AdminTransactionsComponent;

  const tx = (id: number, squareIds: number[], userName: string): AdminTransaction => ({
    id,
    purchaseDate: '2026-08-18T09:15:00Z',
    amount: 500 * squareIds.length,
    squareCount: squareIds.length,
    amountPerBlock: 500,
    squareIds,
    paymentStatus: 'Confirmed',
    userName,
    purchaseSource: 'PayFast',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminTransactionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    cmp = TestBed.createComponent(AdminTransactionsComponent).componentInstance;
    cmp.transactions = [
      tx(1, [5, 6], 'Jan Boer'),
      tx(2, [15, 500], 'Anna Botha'),
    ];
  });

  it('finds the transaction holding a block number', () => {
    cmp.search = '5';
    expect(cmp.filteredTransactions.map(t => t.id)).toEqual([1]);
  });

  it('matches a block whole, not as a substring', () => {
    cmp.search = '500';
    expect(cmp.filteredTransactions.map(t => t.id)).toEqual([2]);
  });

  it('still searches name, e-mail and purchase number', () => {
    cmp.search = 'anna';
    expect(cmp.filteredTransactions.map(t => t.id)).toEqual([2]);
  });
});
