import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareButtonComponent } from './share-button.component';

describe('ShareButtonComponent', () => {
  let fixture: ComponentFixture<ShareButtonComponent>;
  let component: ShareButtonComponent;
  let writeText: jasmine.Spy;

  beforeEach(async () => {
    writeText = jasmine.createSpy('writeText').and.resolveTo();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    await TestBed.configureTestingModule({
      imports: [ShareButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareButtonComponent);
    component = fixture.componentInstance;
    component.url = 'https://example.com/deel/abc';
    component.text = 'Ek het 3 m² geborg vir die Oewerpad in Orania!';
    component.menuOpen.set(true);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('copies message and link together, and confirms without closing the menu', async () => {
    const button = fixture.nativeElement.querySelector('.share-menu button') as HTMLButtonElement;
    await component.copyLink();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(component.sharePayload);
    expect(component.copied()).toBeTrue();
    expect(component.menuOpen()).toBeTrue();
    expect(button.textContent!.trim()).toBe('Gekopieer!');
  });

  it('puts the link on its own line in the copied message and the WhatsApp text', () => {
    expect(component.sharePayload).toBe('Ek het 3 m² geborg vir die Oewerpad in Orania!\nhttps://example.com/deel/abc');
    expect(new URL(component.whatsappUrl).searchParams.get('text')).toBe(component.sharePayload);
  });
});
