import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BouStap1Component } from './bou-stap1.component';

describe('BouStap1Component', () => {
  let fixture: ComponentFixture<BouStap1Component>;
  let http: HttpTestingController;

  function kaart(): HTMLAnchorElement | null {
    return fixture.nativeElement.querySelector('a.choice-stadsbouer');
  }

  async function setup(stadsbouersEnabled: boolean) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BouStap1Component],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BouStap1Component);
    fixture.detectChanges();

    http.expectOne('/api/settings/stadsbouers').flush({ enabled: stadsbouersEnabled });
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    fixture.destroy();
    sessionStorage.clear();
  });

  it('offers the stadsbouer option when it is switched on', async () => {
    await setup(true);
    expect(kaart()).toBeTruthy();
    expect(kaart()!.getAttribute('href')).toBe('/bou/stadsbouers');
  });

  it('hides the stadsbouer option when an admin switched it off', async () => {
    await setup(false);
    expect(kaart()).toBeNull();
  });

  // A failed settings call must not leave a card pointing at a path that refuses the purchase.
  it('hides the option when the setting cannot be read', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BouStap1Component],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BouStap1Component);
    fixture.detectChanges();

    http.expectOne('/api/settings/stadsbouers').error(new ProgressEvent('boom'));
    fixture.detectChanges();

    expect(kaart()).toBeNull();
  });

  it('keeps the ordinary presets either way', async () => {
    await setup(false);
    expect(fixture.nativeElement.querySelectorAll('button.choice-btn').length).toBe(4);
  });
});
