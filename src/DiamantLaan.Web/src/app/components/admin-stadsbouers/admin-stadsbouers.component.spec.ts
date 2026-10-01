import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminStadsbouersComponent } from './admin-stadsbouers.component';
import { AdminStadsbouer } from '../../services/admin.service';

describe('AdminStadsbouersComponent', () => {
  let fixture: ComponentFixture<AdminStadsbouersComponent>;
  let http: HttpTestingController;

  const bouers: AdminStadsbouer[] = [
    {
      id: 1, name: 'Jan van der Merwe', title: 'Voorman', about: 'Bou al drie jaar.',
      email: 'jan@bou.test', hasPhoto: false, isActive: true, isSponsored: false, isPending: false,
      createdAt: '2026-09-01T00:00:00Z'
    },
  ];

  /** The form the modal posts, decoded back out of the FormData. */
  function velde(body: FormData) {
    return Object.fromEntries([...body.entries()].map(([k, v]) => [k, v]));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminStadsbouersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminStadsbouersComponent);
    fixture.detectChanges();

    http.expectOne('/api/admin/stadsbouers').flush(bouers);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
  });

  it('prefills the edit form straight off the row', () => {
    const component = fixture.componentInstance;
    component.openEdit(bouers[0]);

    expect(component.vorm!.title).toBe('Voorman');
    expect(component.vorm!.email).toBe('jan@bou.test');

    component.save();
    const request = http.expectOne('/api/admin/stadsbouers/1');
    expect(request.request.method).toBe('PUT');
    expect(velde(request.request.body as FormData)['title']).toBe('Voorman');
    request.flush({ id: 1, message: 'Stadsbouer gestoor.' });
    http.expectOne('/api/admin/stadsbouers').flush(bouers);
  });

  it('saves with the email blank and shows the waiting tag for a sponsored builder', () => {
    const component = fixture.componentInstance;
    component.bouers = [{ ...bouers[0], email: null, isSponsored: true }];
    component.applyFilter();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Wag vir e-pos');

    component.openEdit(component.bouers[0]);
    expect(component.kanStoor()).toBe(true);
    component.save();
    const request = http.expectOne('/api/admin/stadsbouers/1');
    expect(velde(request.request.body as FormData)['email']).toBe('');
    request.flush({ id: 1, message: 'Stadsbouer gestoor.' });
    http.expectOne('/api/admin/stadsbouers').flush(bouers);
  });

  it('loads thumbnails through the admin endpoint, inactive builders included', () => {
    const component = fixture.componentInstance;
    component.openEdit(bouers[0]);
    component.save();
    http.expectOne('/api/admin/stadsbouers/1').flush({ id: 1, message: 'Stadsbouer gestoor.' });
    http.expectOne('/api/admin/stadsbouers').flush([{ ...bouers[0], hasPhoto: true, isActive: false }]);

    http.expectOne('/api/admin/stadsbouers/1/foto').flush(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }));
    fixture.detectChanges();

    const img: HTMLImageElement = fixture.nativeElement.querySelector('img.duim');
    expect(img.src).toMatch(/^blob:/);
  });
});
