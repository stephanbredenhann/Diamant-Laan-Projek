import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Square, SquareStatus } from '../../../models/square';
import { PurchaseService } from '../../../services/purchase.service';
import { BouKaartComponent } from './bou-kaart.component';

const squares: Square[] = Array.from({ length: 4200 }, (_, i) => ({
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

  function daalAf() {
    begin(3);
    komponent.kiesGroep({ van: 2001, tot: 3000 });
    komponent.kiesSeksie({ van: 2301, tot: 2400 });
  }

  it('drops the section when the trail jumps back to the thousand', () => {
    daalAf();
    komponent.gaanNaVlak(2);

    expect(komponent.vlak()).toBe(2);
    expect(komponent.seksie()).toBeNull();
    expect(komponent.groep()).toEqual({ van: 2001, tot: 3000 });
  });

  it('drops both when the trail jumps all the way back', () => {
    daalAf();
    komponent.gaanNaVlak(1);

    expect(komponent.vlak()).toBe(1);
    expect(komponent.seksie()).toBeNull();
    expect(komponent.groep()).toBeNull();
  });

  it('cannot re-enter a level whose range it no longer has', () => {
    daalAf();
    komponent.gaanNaVlak(1);

    komponent.gaanNaVlak(3);
    expect(komponent.vlak()).toBe(1);
    komponent.gaanNaVlak(2);
    expect(komponent.vlak()).toBe(1);
  });

  it('points the overview at the narrowest range chosen so far', () => {
    begin(3);
    expect(komponent.gemerk()).toBeNull();

    komponent.kiesGroep({ van: 2001, tot: 3000 });
    expect(komponent.gemerk()).toEqual({ van: 2001, tot: 3000 });

    komponent.kiesSeksie({ van: 2301, tot: 2400 });
    expect(komponent.gemerk()).toEqual({ van: 2301, tot: 2400 });

    komponent.gaanNaVlak(1);
    expect(komponent.gemerk()).toBeNull();
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

    expect(komponent.vlak()).toBe(3);
    expect(komponent.seksie()).toEqual({ van: 2301, tot: 2400 });
    expect(komponent.gekiesLys()).toEqual([2350]);
    expect(komponent.beklemtoon()).toBe(2350);
  });

  it('shows a sold block rather than just refusing it', () => {
    begin(3);
    komponent.soekNommer = 505;
    komponent.soek();

    expect(komponent.vlak()).toBe(3);
    expect(komponent.seksie()).toEqual({ van: 501, tot: 600 });
    expect(komponent.soekFout()).toContain('reeds verkoop');
    expect(komponent.gekiesLys()).toEqual([]);
  });

  it('rejects a block number that does not exist', () => {
    begin(3);
    komponent.soekNommer = 9999;
    komponent.soek();

    expect(komponent.vlak()).toBe(1);
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
