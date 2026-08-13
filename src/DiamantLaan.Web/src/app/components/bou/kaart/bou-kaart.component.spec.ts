import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Square, SquareStatus } from '../../../models/square';
import { PurchaseService } from '../../../services/purchase.service';
import { BouKaartComponent } from './bou-kaart.component';

const squares: Square[] = Array.from({ length: 4000 }, (_, i) => ({
  id: i + 1,
  status: SquareStatus.NogNieBeginNie,
  isSold: i + 1 >= 500 && i + 1 <= 520,
  isReserved: i + 1 <= 199,
}));

describe('BouKaartComponent', () => {
  let fixture: ComponentFixture<BouKaartComponent>;
  let komponent: BouKaartComponent;
  let http: HttpTestingController;

  /** Boots the page with the session state a visitor would arrive carrying. */
  function begin(aantal: number, hangend: number[] = []) {
    TestBed.configureTestingModule({
      imports: [BouKaartComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const aankoop = TestBed.inject(PurchaseService);
    aankoop.bouAantal = aantal;
    aankoop.pendingSquareIds = hangend;

    fixture = TestBed.createComponent(BouKaartComponent);
    komponent = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/api/road/squares')).flush(squares);
    fixture.detectChanges();
  }

  // TestBed resets itself between tests, so each one boots its own session
  // rather than sharing a fixture. That keeps the "already pending" cases from
  // having to tear down and rebuild mid-test, which leaked into whichever spec
  // Jasmine happened to run next.
  beforeEach(() => sessionStorage.clear());

  afterEach(() => {
    http?.verify();
    fixture?.destroy();
    sessionStorage.clear();
  });

  /** Puts the page on the hundred the old drill-down used to end up at. */
  function daalAf() {
    begin(3);
    komponent.seksie.set({ van: 2301, tot: 2400 });
  }

  it('opens on the first section that still has free blocks', () => {
    // 1-199 are reserved in the fixture, so the first hundred is sold out.
    begin(3);
    expect(komponent.seksie()).toEqual({ van: 101, tot: 200 });
  });

  it('opens on the section holding blocks that are already pending', () => {
    begin(3, [2301, 2302]);
    expect(komponent.seksie()).toEqual({ van: 2301, tot: 2400 });
  });

  it('points the overview at the open section', () => {
    daalAf();
    expect(komponent.gemerk()).toEqual({ van: 2301, tot: 2400 });

    komponent.skuifSeksie(1);
    expect(komponent.gemerk()).toEqual({ van: 2401, tot: 2500 });
  });

  it('will not page past either end of the road', () => {
    begin(3);
    komponent.seksie.set({ van: 1, tot: 100 });
    komponent.skuifSeksie(-1);
    expect(komponent.seksie()).toEqual({ van: 1, tot: 100 });

    komponent.seksie.set({ van: 3901, tot: 4000 });
    komponent.skuifSeksie(1);
    expect(komponent.seksie()).toEqual({ van: 3901, tot: 4000 });
  });

  it('refuses a block past the amount chosen in step one', () => {
    daalAf();
    for (const id of [2301, 2302, 2303]) komponent.wisselBlok(id);
    expect(komponent.gekiesLys()).toEqual([2301, 2302, 2303]);
    expect(komponent.klaarGekies()).toBe(true);

    komponent.wisselBlok(2304);
    expect(komponent.gekiesLys()).toEqual([2301, 2302, 2303]);
    expect(komponent.boodskap()).toContain('reeds 3');

    // Removing one makes room again.
    komponent.verwyder(2302);
    komponent.wisselBlok(2304);
    expect(komponent.gekiesLys()).toEqual([2301, 2303, 2304]);
  });

  it('will not take a sold or reserved block', () => {
    daalAf();
    komponent.wisselBlok(505);
    komponent.wisselBlok(150);
    expect(komponent.gekiesLys()).toEqual([]);
  });

  it('sends a search straight to the section holding that block', () => {
    begin(3);
    komponent.soekNommer = 2350;
    komponent.soek();

    expect(komponent.seksie()).toEqual({ van: 2301, tot: 2400 });
    expect(komponent.gekiesLys()).toEqual([2350]);
    expect(komponent.beklemtoon()).toBe(2350);
  });

  it('shows a sold block rather than just refusing it', () => {
    begin(3);
    komponent.soekNommer = 505;
    komponent.soek();

    expect(komponent.seksie()).toEqual({ van: 501, tot: 600 });
    expect(komponent.soekFout()).toContain('reeds verkoop');
    expect(komponent.gekiesLys()).toEqual([]);
  });

  it('rejects a block number that does not exist, without moving the page', () => {
    begin(3);
    const oop = komponent.seksie();
    komponent.soekNommer = 9999;
    komponent.soek();

    expect(komponent.seksie()).toEqual(oop);
    expect(komponent.soekFout()).toContain('bestaan nie');
  });

  describe('arriving with blocks already pending', () => {
    it('keeps the good ones and drops one that has since been sold', () => {
      begin(3, [505, 2301, 2302]);
      expect(komponent.gekiesLys()).toEqual([2301, 2302]);
    });

    it('never carries over more than the amount chosen in step one', () => {
      begin(2, [2301, 2302, 2303, 2304]);
      expect(komponent.gekiesLys().length).toBe(2);
    });
  });
});
