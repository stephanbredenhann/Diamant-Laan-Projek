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
      createdAt: '2026-09-01T00:00:00Z', handedOverAt: null, handoverPhotoUrl: null
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

  it('shows Sertifikaat only on sponsored rows and fetches the summary', async () => {
    const component = fixture.componentInstance;
    const buttons = () => [...fixture.nativeElement.querySelectorAll('button')].filter((b: HTMLElement) => b.textContent?.trim() === 'Sertifikaat');
    expect(buttons().length).toBe(0);

    component.bouers = [{ ...bouers[0], isSponsored: true }];
    component.applyFilter();
    fixture.detectChanges();
    expect(buttons().length).toBe(1);

    const done = component.downloadCertificate(component.bouers[0]);
    http.expectOne('/api/admin/stadsbouers/1/certificate-summary').flush({ ownerName: 'Jan van der Merwe', sameForAll: true, squares: [] });
    await done.catch(() => {});
  });

  it('hands over through the service, reloads, and shows the badge', async () => {
    const component = fixture.componentInstance;
    const sponsored = { ...bouers[0], isSponsored: true };
    component.bouers = [sponsored];
    component.applyFilter();
    component.openHandover(sponsored);
    component.handover!.photo = new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' });
    spyOn<any>(component, 'verklein').and.resolveTo(new Blob(['x'], { type: 'image/jpeg' }));

    const done = component.stuurHandover();
    await Promise.resolve();
    await Promise.resolve();
    const request = http.expectOne('/api/admin/stadsbouers/1/oorhandig');
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).has('photo')).toBe(true);
    request.flush({ message: 'Gestuur.', handedOverAt: '2026-10-01T00:00:00Z', handoverPhotoUrl: '/api/stadsbouers/oorhandig/oorhandig-a.jpg' });
    await done;

    http.expectOne('/api/admin/stadsbouers').flush([{ ...sponsored, handedOverAt: '2026-10-01T00:00:00Z', handoverPhotoUrl: '/api/stadsbouers/oorhandig/oorhandig-a.jpg' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a.merk.oorhandig').textContent).toContain('Oorhandig');
  });
});
