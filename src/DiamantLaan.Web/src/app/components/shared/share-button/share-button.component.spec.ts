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

  function menuLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('.share-menu a, .share-menu button')]
      .map(el => (el as HTMLElement).textContent!.trim());
  }

  function copyButton(): HTMLButtonElement {
    return [...fixture.nativeElement.querySelectorAll('.share-menu button')]
      .find(el => /Kopieer|Gekopieer/.test(el.textContent || '')) as HTMLButtonElement;
  }

  it('copies message and link together, and confirms without closing the menu', async () => {
    const button = copyButton();
    await component.copyLink();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(component.sharePayload);
    expect(component.copied()).toBeTrue();
    expect(component.menuOpen()).toBeTrue();
    expect(button.textContent!.trim()).toBe('Gekopieer!');
  });

  it('puts the link on its own line in the copied message', () => {
    expect(component.sharePayload).toBe('Ek het 3 m² geborg vir die Oewerpad in Orania!\nhttps://example.com/deel/abc');
  });

  it('opens the menu instead of the device share sheet', async () => {
    const share = jasmine.createSpy('share').and.resolveTo();
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    component.menuOpen.set(false);

    await component.performShare();

    expect(share).not.toHaveBeenCalled();
    expect(component.menuOpen()).toBeTrue();
  });

  it('lists native share and copy, not WhatsApp', () => {
    expect(menuLabels()).toEqual(['Deel my bydrae', 'Kopieer skakel']);
    expect(fixture.nativeElement.querySelector('.share-menu a')).toBeNull();
  });

  it('shows revoke only when a public link exists', () => {
    component.showRevoke = true;
    fixture.detectChanges();
    expect(menuLabels()).toEqual([
      'Deel my bydrae',
      'Kopieer skakel',
      'Verwyder my openbare skakel'
    ]);
  });

  it('opens the device share sheet from the Deel row', async () => {
    const share = jasmine.createSpy('share').and.resolveTo();
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    await component.shareToDevice();

    expect(share).toHaveBeenCalledWith({
      title: 'Diamant Laan',
      text: component.text,
      url: component.url
    });
    expect(component.menuOpen()).toBeFalse();
  });

  it('copies the link and shows a toast when the device has no share sheet', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });

    await component.shareToDevice();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(component.sharePayload);
    expect(component.menuOpen()).toBeFalse();
    const toast = fixture.nativeElement.querySelector('.share-toast') as HTMLElement;
    expect(toast.textContent).toContain('Jou toestel ondersteun nie direkte deel nie');
    expect(toast.textContent).toContain('gekopieer');
  });
});
