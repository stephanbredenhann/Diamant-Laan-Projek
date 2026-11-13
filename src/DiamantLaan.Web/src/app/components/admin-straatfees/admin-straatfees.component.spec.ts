import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminStraatfeesComponent, foonVertoon } from './admin-straatfees.component';
import { StraatfeesAdminOrder } from '../../services/straatfees.service';

const order = (o: Partial<StraatfeesAdminOrder>): StraatfeesAdminOrder => ({
  id: 1,
  name: 'Jan Steyn',
  email: 'jan@test.com',
  phone: null,
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
    cmp.vorm = { name: ' Ouma Kontant ', email: ' ouma@test.com ', phoneNumber: '082 123 4567 ', phoneCountryCode: '+27', adults: 1, children: 2, paymentMethod: 'Cash' };
    expect(cmp.vormTotaal()).toBe(90);

    cmp.voegBy();
    const req = http.expectOne('/api/admin/straatfees/bestellings');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Ouma Kontant', email: 'ouma@test.com', phoneNumber: '082 123 4567', phoneCountryCode: '+27', adults: 1, children: 2, paymentMethod: 'Cash' });
    req.flush(order({ id: 2, name: 'Ouma Kontant', email: 'ouma@test.com', phone: '+27821234567', paymentMethod: 'Cash', payFastPaymentId: null }));
    fixture.detectChanges();

    expect(cmp.bestellings().map(o => o.id)).toEqual([2, 1]);
    expect(cmp.vorm.name).toBe('');
    const firstRow = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(firstRow.textContent).toContain('Kontant');
    expect(firstRow.textContent).toContain('082 123 4567');
    expect(fixture.nativeElement.textContent).toContain('kaartjie word na ouma@test.com gestuur');
  });

  it('shows the server message when a sale is refused', () => {
    const { cmp, http } = setup([]);
    cmp.vorm = { name: 'Jan', email: 'sleg', phoneNumber: '', phoneCountryCode: '+27', adults: 1, children: 0, paymentMethod: 'EFT' };
    cmp.voegBy();
    http.expectOne('/api/admin/straatfees/bestellings').flush({ message: 'Die e-posadres is ongeldig.' }, { status: 400, statusText: 'Bad Request' });

    expect(cmp.byvoegFout()).toBe('Die e-posadres is ongeldig.');
    expect(cmp.byvoeg()).toBeFalse();
  });

  it('exports the visible orders as CSV with SAST times and defused formulas', async () => {
    const { cmp } = setup([
      order({ id: 2, name: '=HYPERLINK("x")', phone: '+27821234567', paymentMethod: 'EFT', status: 'Confirmed' }),
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
    expect(lines[0]).toContain('"E-pos","Foon","Volwassenes"');
    expect(lines[1]).toContain('"jan@test.com","082 123 4567","2"');
  });

  it('checks the phone before posting', () => {
    const { cmp, http } = setup([]);
    cmp.vorm = { name: 'Jan', email: 'jan@test.com', phoneNumber: '123', phoneCountryCode: '+27', adults: 1, children: 0, paymentMethod: 'Cash' };
    cmp.voegBy();

    http.expectNone('/api/admin/straatfees/bestellings');
    expect(cmp.byvoegFout()).toContain('Foonnommer');
  });
});

describe('foonVertoon', () => {
  it('shows South African numbers locally and others with 00 and a space', () => {
    expect(foonVertoon('+27821234567')).toBe('082 123 4567');
    expect(foonVertoon('+447911123456')).toBe('0044 7911123456');
    expect(foonVertoon('+12025550123')).toBe('001 2025550123');
    expect(foonVertoon(null)).toBe('');
  });
});
