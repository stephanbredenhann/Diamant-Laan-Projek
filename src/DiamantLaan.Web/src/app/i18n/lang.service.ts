import { Injectable, signal } from '@angular/core';
import { EN } from './en';

export type Lang = 'af' | 'en';

/**
 * Afrikaans is the source language. Templates keep the Afrikaans text literally
 * and `t()` swaps it for English via a lookup keyed on that same Afrikaans
 * string, so an untranslated string simply stays Afrikaans instead of showing
 * a key.
 */
@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>(localStorage.getItem('lang') === 'en' ? 'en' : 'af');

  constructor() {
    document.documentElement.lang = this.lang();
  }

  set(lang: Lang) {
    this.lang.set(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }

  toggle() {
    this.set(this.lang() === 'af' ? 'en' : 'af');
  }

  t(af: string): string {
    return this.lang() === 'en' ? (EN[af] ?? af) : af;
  }
}
