import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminSettingsComponent } from './admin-settings.component';

describe('AdminSettingsComponent', () => {
  let fixture: ComponentFixture<AdminSettingsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSettingsComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Every test renders the page, so the stadsbouer toggle loads too. The tests that care
    // about it answer it themselves; the rest just let it settle here.
    http.match('/api/settings/stadsbouers').forEach(req => req.flush({ enabled: true }));
    fixture.destroy();
    http.verify();
  });

  /** Renders the page with both settings loaded, which is where the toggle tests start. */
  function rendered(stadsbouersEnabled = true) {
    fixture.detectChanges();
    http.expectOne('/api/settings/stadsbouers').flush({ enabled: stadsbouersEnabled });
    http.expectOne('/api/settings/home-stats').flush({ showStatsSection: true, showTotalRaised: true });
    fixture.detectChanges();
    return fixture.nativeElement.querySelectorAll('input[type="checkbox"]')[2] as HTMLInputElement;
  }

  it('shows the stadsbouer option as an admin left it', () => {
    const toggle = rendered(false);
    expect(toggle.checked).toBeFalse();
    expect(fixture.componentInstance.stadsbouersEnabled).toBeFalse();
  });

  it('saves the stadsbouer toggle on its own endpoint', () => {
    const toggle = rendered(true);

    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne('/api/admin/settings/stadsbouers');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush({ enabled: false });
    fixture.detectChanges();

    expect(fixture.componentInstance.stadsbouersEnabled).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Instellings gestoor.');
  });

  it('puts the stadsbouer toggle back when the save fails', () => {
    const toggle = rendered(true);

    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    http.expectOne('/api/admin/settings/stadsbouers').flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.stadsbouersEnabled).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('Kon nie die stadsbouer-instelling stoor nie.');
  });

  it('shows loading state then renders settings', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Laai instellings');

    const req = http.expectOne('/api/settings/home-stats');
    req.flush({ showStatsSection: false, showTotalRaised: true });
    fixture.detectChanges();

    expect(compiled.textContent).not.toContain('Laai instellings');
    expect(fixture.componentInstance.settings).toEqual({ showStatsSection: false, showTotalRaised: true });
  });

  it('displays an error when loading fails', () => {
    fixture.detectChanges();
    const req = http.expectOne('/api/settings/home-stats');
    req.flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Kon nie instellings laai nie.');
  });

  it('saves settings when toggled', () => {
    fixture.detectChanges();
    http.expectOne('/api/settings/home-stats').flush({ showStatsSection: true, showTotalRaised: true });
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.settings.showStatsSection).toBeFalse();

    const req = http.expectOne('/api/admin/settings/home-stats');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ showStatsSection: false, showTotalRaised: true });
    req.flush({ showStatsSection: false, showTotalRaised: true });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Instellings gestoor.');
    expect(fixture.componentInstance.settings).toEqual({ showStatsSection: false, showTotalRaised: true });
  });

  it('displays an error and reverts settings when saving fails', () => {
    fixture.detectChanges();
    http.expectOne('/api/settings/home-stats').flush({ showStatsSection: true, showTotalRaised: true });
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne('/api/admin/settings/home-stats');
    req.flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Kon nie instellings stoor nie.');
    expect(fixture.componentInstance.settings).toEqual({ showStatsSection: true, showTotalRaised: true });
  });

  it('queues a second toggle while a save is in progress', () => {
    fixture.detectChanges();
    http.expectOne('/api/settings/home-stats').flush({ showStatsSection: true, showTotalRaised: true });
    fixture.detectChanges();

    // Toggle first checkbox to start a save
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const firstSave = http.expectOne('/api/admin/settings/home-stats');
    expect(firstSave.request.body).toEqual({ showStatsSection: false, showTotalRaised: true });

    // Toggle the second checkbox while the first save is still in flight
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    checkboxes[1].checked = false;
    checkboxes[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // No second request yet because the first is still pending
    http.expectNone('/api/admin/settings/home-stats');

    // Complete the first save
    firstSave.flush({ showStatsSection: false, showTotalRaised: true });
    fixture.detectChanges();

    // Now the second save should fire
    const secondSave = http.expectOne('/api/admin/settings/home-stats');
    expect(secondSave.request.body).toEqual({ showStatsSection: false, showTotalRaised: false });
    secondSave.flush({ showStatsSection: false, showTotalRaised: false });
    fixture.detectChanges();

    expect(fixture.componentInstance.settings).toEqual({ showStatsSection: false, showTotalRaised: false });
  });
});
