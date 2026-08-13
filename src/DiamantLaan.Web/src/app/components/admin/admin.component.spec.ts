import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Square, SquareStatus } from '../../models/square';
import { AdminComponent } from './admin.component';

const squares: Square[] = [
  { id: 1, status: SquareStatus.Voorberei },
  { id: 2, status: SquareStatus.Voorberei },
  { id: 3, status: SquareStatus.KlaarGeteer },
];

describe('AdminComponent', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let komponent: AdminComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(AdminComponent);
    komponent = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/api/admin/stats')).flush({ totalRaised: 0 });
    http.expectOne(r => r.url.endsWith('/api/road/squares')).flush(squares);
    http.expectOne(r => r.url.endsWith('/api/admin/squares/undo-last')).flush({ available: false });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
  });

  function kies(...ids: number[]) {
    komponent.selectRange(ids);
  }

  describe('step gating', () => {
    it('will not leave step 1 with nothing selected', () => {
      expect(komponent.kanNaStap(2)).toBe(false);
      komponent.gaanNaStap(2);
      expect(komponent.stap()).toBe(1);
    });

    it('unlocks step 2 once blocks are selected', () => {
      kies(1, 2);
      expect(komponent.kanNaStap(2)).toBe(true);
      komponent.gaanNaStap(2);
      expect(komponent.stap()).toBe(2);
    });

    it('will not reach step 3 with neither a status nor a photo', () => {
      kies(1, 2);
      komponent.gaanNaStap(2);
      expect(komponent.kanNaStap(3)).toBe(false);

      komponent.draftStatus = SquareStatus.KlaarGeteer;
      expect(komponent.kanNaStap(3)).toBe(true);
    });

    it('returns to step 1 when the selection is cleared', () => {
      kies(1, 2);
      komponent.gaanNaStap(2);
      komponent.clearSelection();
      expect(komponent.stap()).toBe(1);
    });
  });

  describe('selection', () => {
    it('summarises the selection as ranges', () => {
      kies(1, 2, 3);
      expect(komponent.keuseOpsomming()).toBe('1-3');
    });

    it('removes a whole range chip', () => {
      kies(1, 2, 3);
      komponent.removeRange({ van: 1, tot: 2 });
      expect(komponent.selectedIdsArray()).toEqual([3]);
    });
  });

  describe('save ordering', () => {
    // The bug this guards: the old code issued the status PUT first, so a photo
    // that was then rejected or cancelled left the statuses already changed.
    beforeEach(() => {
      kies(1, 2);
      komponent.draftStatus = SquareStatus.KlaarGeteer;
      komponent.draftImageFile = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
      komponent.gaanNaStap(3);
    });

    it('checks conflicts before writing anything', () => {
      komponent.saveChanges();

      http.expectNone(r => r.url.endsWith('/api/admin/squares/status'));
      const konflik = http.expectOne(r => r.url.endsWith('/api/admin/squares/images/conflicts'));
      expect(konflik.request.method).toBe('GET');

      konflik.flush({ conflictingSquareIds: [1], totalSelected: 2 });
      expect(komponent.imageConflictPrompt).not.toBeNull();
      http.expectNone(r => r.url.endsWith('/api/admin/squares/status'));
    });

    it('writes nothing at all when the conflict prompt is cancelled', () => {
      komponent.saveChanges();
      http.expectOne(r => r.url.endsWith('/api/admin/squares/images/conflicts'))
        .flush({ conflictingSquareIds: [1], totalSelected: 2 });

      komponent.cancelConflictPrompt();

      http.expectNone(r => r.url.endsWith('/api/admin/squares/status'));
      http.expectNone(r => r.url.endsWith('/api/admin/squares/images'));
      expect(komponent.saving).toBe(false);
      // The drafts survive, so the admin can adjust and try again.
      expect(komponent.draftStatus).toBe(SquareStatus.KlaarGeteer);
    });

    it('commits status then photo once the conflict is confirmed', () => {
      komponent.saveChanges();
      http.expectOne(r => r.url.endsWith('/api/admin/squares/images/conflicts'))
        .flush({ conflictingSquareIds: [1], totalSelected: 2 });

      komponent.confirmUpload(true);

      http.expectOne(r => r.url.endsWith('/api/admin/squares/status')).flush({ updated: 2 });
      http.expectOne(r => r.url.endsWith('/api/admin/squares/images')).flush({ id: 9, status: 3, squareCount: 2 });

      // finishSaveSuccess reloads everything and drops back to step 1.
      http.expectOne(r => r.url.endsWith('/api/admin/stats')).flush({ totalRaised: 0 });
      http.expectOne(r => r.url.endsWith('/api/road/squares')).flush(squares);
      http.expectOne(r => r.url.endsWith('/api/admin/squares/undo-last')).flush({ available: false });
      expect(komponent.stap()).toBe(1);
    });

    it('refuses a mixed-status selection without writing anything', () => {
      komponent.draftStatus = null;
      kies(3); // block 3 is KlaarGeteer, blocks 1 and 2 are Voorberei
      komponent.saveChanges();

      http.expectNone(r => r.url.endsWith('/api/admin/squares/status'));
      http.expectNone(r => r.url.endsWith('/api/admin/squares/images/conflicts'));
      expect(komponent.isError).toBe(true);
      expect(komponent.saving).toBe(false);
    });
  });
});
