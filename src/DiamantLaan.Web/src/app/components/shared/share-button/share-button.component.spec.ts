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
    component.text = 'Ek het 3 vierkante meter geborg!';
    component.menuOpen.set(true);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('gives Facebook only the page url, which it still accepts', () => {
    const parsed = new URL(component.facebookUrl);
    expect(parsed.origin + parsed.pathname).toBe('https://www.facebook.com/sharer/sharer.php');
    expect(parsed.searchParams.get('u')).toBe(component.url);
    expect(parsed.searchParams.has('quote')).toBeFalse();
  });

  it('copies the share message when Facebook is chosen', () => {
    const link = fixture.nativeElement.querySelector('a[href*="facebook.com"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    link.click();
    expect(writeText).toHaveBeenCalledWith('Ek het 3 vierkante meter geborg!');
  });
});
