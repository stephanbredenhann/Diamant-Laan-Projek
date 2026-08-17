import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LangService } from './lang.service';
import { NavbarComponent } from '../components/shared/navbar/navbar.component';

describe('language toggle', () => {
  beforeEach(() => {
    localStorage.removeItem('lang');
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  // Both the stored choice and <html lang> outlive the spec, and every other
  // suite asserts Afrikaans copy, so put them back rather than leaking English.
  afterEach(() => {
    localStorage.removeItem('lang');
    document.documentElement.lang = 'af';
  });

  it('defaults to Afrikaans and falls back to it for an untranslated string', () => {
    const lang = TestBed.inject(LangService);
    expect(lang.lang()).toBe('af');
    expect(lang.t('Vordering')).toBe('Vordering');

    lang.set('en');
    expect(lang.t('Vordering')).toBe('Progress');
    expect(lang.t('Nie vertaal nie')).toBe('Nie vertaal nie');
  });

  // The pipe is impure precisely so a toggle re-renders. A pure pipe would
  // cache on its unchanged input and keep showing Afrikaans, so assert the DOM.
  it('re-renders the nav when the language changes', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const text = () => fixture.nativeElement.textContent as string;

    expect(text()).toContain('Die projek');
    expect(text()).not.toContain('The project');

    TestBed.inject(LangService).toggle();
    fixture.detectChanges();

    expect(text()).toContain('The project');
    expect(text()).not.toContain('Die projek');
    expect(document.documentElement.lang).toBe('en');
  });
});
