import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminUsersComponent } from './admin-users.component';

const BUYER = {
  userId: 'u1',
  name: 'Jan Koper',
  email: 'jan@voorbeeld.co.za',
  squares: 2,
  totalSpent: 1000,
  spendPerBlock: 500,
};

describe('AdminUsersComponent — certificate names', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/admin/purchases').flush([BUYER]);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('prefills the prompt with the names already on the certificates', async () => {
    const component = fixture.componentInstance;
    const done = component.editNames(component.buyers[0]);

    http.expectOne('/api/admin/users/u1/certificate-summary').flush({
      ownerName: 'Jan Koper',
      sameForAll: false,
      squares: [
        { id: 12, purchaseDate: null, ownerName: 'Jan Koper' },
        { id: 13, purchaseDate: null, ownerName: 'Anna Koper' },
      ],
    });
    await done;

    expect(component.namePrompt?.download).toBeFalse();
    expect(component.promptName).toBe('Jan Koper');
    expect(component.promptIndividual).toBeTrue();
    expect(component.promptBlockNames).toEqual({ 12: 'Jan Koper', 13: 'Anna Koper' });
  });

  it('keeps the "own name per block" checkbox checkbox-sized', async () => {
    const component = fixture.componentInstance;
    component.namePrompt = { buyer: component.buyers[0], squares: [12, 13], download: false };
    fixture.detectChanges();

    const box = fixture.nativeElement.querySelector('.field.checkbox input[type="checkbox"]') as HTMLElement;
    // A 100%-wide checkbox used to shove its own label out of the modal.
    expect(box.getBoundingClientRect().width).toBeLessThan(40);
  });

  it('saves a corrected name and closes without downloading', async () => {
    const component = fixture.componentInstance;
    component.namePrompt = { buyer: component.buyers[0], squares: [12, 13], download: false };
    component.promptName = 'Jan P. Koper';
    component.promptIndividual = false;

    const done = component.saveNamesAndContinue();
    const req = http.expectOne('/api/admin/users/u1/certificate-names');
    expect(req.request.body).toEqual({ sameForAll: true, summaryName: 'Jan P. Koper', blocks: [] });
    req.flush({ ownerName: 'Jan P. Koper', sameForAll: true, squares: [] });
    await done;

    expect(component.namePrompt).toBeNull();
    // A download would have opened the sheet chooser; a plain correction must not.
    expect(component.sheetChoices.length).toBe(0);
  });

  it('sends blank per-block names through so they fall back to the summary name', async () => {
    const component = fixture.componentInstance;
    component.namePrompt = { buyer: component.buyers[0], squares: [12, 13], download: false };
    component.promptName = 'Jan Koper';
    component.promptIndividual = true;
    component.promptBlockNames = { 13: 'Anna Koper' };

    const done = component.saveNamesAndContinue();
    const req = http.expectOne('/api/admin/users/u1/certificate-names');
    expect(req.request.body.blocks).toEqual([
      { squareId: 12, name: '' },
      { squareId: 13, name: 'Anna Koper' },
    ]);
    req.flush({ ownerName: 'Jan Koper', sameForAll: false, squares: [] });
    await done;
  });
});
