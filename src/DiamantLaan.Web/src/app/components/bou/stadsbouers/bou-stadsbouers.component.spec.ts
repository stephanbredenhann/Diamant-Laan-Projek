import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { BouStadsbouersComponent } from './bou-stadsbouers.component';
import { PurchaseService } from '../../../services/purchase.service';
import { Stadsbouer } from '../../../services/stadsbouer.service';

describe('BouStadsbouersComponent', () => {
  let fixture: ComponentFixture<BouStadsbouersComponent>;
  let http: HttpTestingController;
  let purchase: PurchaseService;

  const bouers: Stadsbouer[] = [
    { id: 1, name: 'Jan Bouer', title: 'Voorman', about: 'Bou al drie jaar.', hasPhoto: false, isSponsored: false, isPending: false },
    { id: 2, name: 'Piet Geborg', title: null, about: null, hasPhoto: false, isSponsored: true, isPending: false },
    { id: 3, name: 'Sarel Hangend', title: null, about: null, hasPhoto: false, isSponsored: false, isPending: true },
  ];

  function kaart(naam: string): HTMLButtonElement {
    const knoppies: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button.bouer'));
    return knoppies.find(k => k.textContent!.includes(naam))!;
  }

  beforeEach(async () => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [BouStadsbouersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    purchase = TestBed.inject(PurchaseService);

    fixture = TestBed.createComponent(BouStadsbouersComponent);
    fixture.detectChanges();

    http.expectOne('/api/stadsbouers').flush(bouers);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
    sessionStorage.clear();
  });

  it('greys out a builder who is already taken', () => {
    expect(kaart('Jan Bouer').disabled).toBe(false);
    expect(kaart('Piet Geborg').disabled).toBe(true);
    expect(kaart('Piet Geborg').classList).toContain('geborg');
    expect(kaart('Sarel Hangend').disabled).toBe(true);
  });

  it('shows the tick on a chosen builder and takes it away again', () => {
    kaart('Jan Bouer').click();
    fixture.detectChanges();

    expect(kaart('Jan Bouer').classList).toContain('gekies');
    expect(kaart('Jan Bouer').querySelector('.tiek')).toBeTruthy();

    kaart('Jan Bouer').click();
    fixture.detectChanges();

    expect(kaart('Jan Bouer').querySelector('.tiek')).toBeNull();
  });

  it('draws one block per builder and hands both lists to the payment step', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    kaart('Jan Bouer').click();
    fixture.detectChanges();

    fixture.componentInstance.gaanVoort();
    http.expectOne(req => req.url.endsWith('/api/road/pick-squares')).flush({ squareIds: [77] });

    expect(purchase.pendingSquareIds).toEqual([77]);
    expect(purchase.stadsbouerIds).toEqual([1]);
    expect(purchase.bouAantal).toBe(1);
    expect(router.navigate).toHaveBeenCalledWith(['/bou/bevestig']);
  });
});
