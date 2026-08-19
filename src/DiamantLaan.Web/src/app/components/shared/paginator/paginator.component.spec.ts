import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  it('reports the visible range and last page', () => {
    const p = new PaginatorComponent();
    p.total = 65;
    expect(p.lastPage).toBe(2);
    expect(p.end).toBe(30);
    p.page = 2;
    expect(p.end).toBe(65);
  });

  it('clamps the page when filtering shrinks the list', () => {
    const p = new PaginatorComponent();
    p.total = 65;
    p.page = 2;
    let emitted = -1;
    p.pageChange.subscribe((v: number) => (emitted = v));

    p.total = 10;
    p.ngOnChanges();

    expect(p.page).toBe(0);
    expect(emitted).toBe(0);
  });
});
