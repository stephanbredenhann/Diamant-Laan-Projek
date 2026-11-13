import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminStraatfeesComponent } from './admin-straatfees.component';
import { StraatfeesAdminOrder } from '../../services/straatfees.service';

const order = (o: Partial<StraatfeesAdminOrder>): StraatfeesAdminOrder => ({
  id: 1,
  name: 'Jan Steyn',
  email: 'jan@test.com',
  adults: 2,
  children: 1,
  amount: 150,
  ticketCode: 'ABCDEFGH23',
  status: 'Confirmed',
  payFastPaymentId: 'pf-1',
  paymentMethod: null,
  createdAt: '2026-11-10T08:00:00',
  confirmedAt: '2026-11-10T08:01:00',
  ticketEmailSent: true,
  ...o,
});

describe('AdminStraatfeesComponent', () => {
  function setup(orders: StraatfeesAdminOrder[]) {
    TestBed.configureTestingModule({
      imports: [AdminStraatfeesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AdminStraatfeesComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/admin/straatfees').flush({ enabled: true, adultPrice: 70, childPrice: 10, orders });
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance, http };
  }

  it('records a manual sale and puts it at the top of the list', () => {
    const { fixture, cmp, http } = setup([order({})]);
    cmp.vorm = { name: ' Ouma Kontant ', email: '', adults: 1, children: 2, paymentMethod: 'Cash' };
    expect(cmp.vormTotaal()).toBe(90);

    cmp.voegBy();
    const req = http.expectOne('/api/admin/straatfees/bestellings');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Ouma Kontant', email: '', adults: 1, children: 2, paymentMethod: 'Cash' });
    req.flush(order({ id: 2, name: 'Ouma Kontant', email: '', paymentMethod: 'Cash', payFastPaymentId: null, ticketEmailSent: false }));
    fixture.detectChanges();

    expect(cmp.bestellings().map(o => o.id)).toEqual([2, 1]);
    expect(cmp.vorm.name).toBe('');
    const firstRow = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(firstRow.textContent).toContain('Kontant');
    expect(fixture.nativeElement.textContent).toContain('geen e-pos gestuur nie');
  });

  it('shows the server message when a sale is refused', () => {
    const { cmp, http } = setup([]);
    cmp.vorm = { name: 'Jan', email: 'sleg', adults: 1, children: 0, paymentMethod: 'EFT' };
    cmp.voegBy();
    http.expectOne('/api/admin/straatfees/bestellings').flush({ message: 'Die e-posadres is ongeldig.' }, { status: 400, statusText: 'Bad Request' });

    expect(cmp.byvoegFout()).toBe('Die e-posadres is ongeldig.');
    expect(cmp.byvoeg()).toBeFalse();
  });

  it('exports the visible orders as CSV with SAST times and defused formulas', async () => {
    const { cmp } = setup([
      order({ id: 2, name: '=HYPERLINK("x")', paymentMethod: 'EFT', status: 'Confirmed' }),
      order({ id: 3, status: 'Pending' }),
    ]);
    cmp.netBetaal.set(true);

    let blob: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => { blob = b as Blob; return 'blob:x'; });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');

    cmp.laaiCsvAf();

    const text = await blob!.text();
    const lines = text.replace(/^﻿/, '').split('\r\n');
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('"2","2026-11-10 10:00"');
    expect(lines[1]).toContain(`"'=HYPERLINK(""x"")"`);
    expect(lines[1]).toContain('"EFT"');
  });
});
