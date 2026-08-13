import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, interval, takeUntil } from 'rxjs';
import { TPipe } from '../../../i18n/t.pipe';

@Component({
  selector: 'app-foto-slider',
  standalone: true,
  imports: [TPipe],
  template: `
    <div
      class="why-slider"
      (pointerdown)="beginSleep($event)"
      (pointerup)="eindigSleep($event)"
      (pointercancel)="sleepX = null"
    >
      @for (foto of fotos; track foto.src; let i = $index) {
        <img
          [src]="foto.src"
          [alt]="foto.alt | t"
          [class.is-active]="indeks === i"
        />
      }
    </div>
    <button
      type="button"
      class="why-nav prev"
      (click)="stap(-1)"
      [attr.aria-label]="'Vorige foto' | t"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <button
      type="button"
      class="why-nav next"
      (click)="stap(1)"
      [attr.aria-label]="'Volgende foto' | t"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
    <div class="why-dots" role="tablist" [attr.aria-label]="'Foto’s' | t">
      @for (foto of fotos; track foto.src; let i = $index) {
        <button
          type="button"
          role="tab"
          [class.is-active]="indeks === i"
          [attr.aria-selected]="indeks === i"
          [attr.aria-label]="('Foto' | t) + ' ' + (i + 1)"
          (click)="kies(i)"
        ></button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .why-slider {
      position: relative;
      aspect-ratio: 4/3;
      overflow: hidden;
      background: var(--tar);
      touch-action: pan-y;
    }
    .why-slider img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      opacity: 0;
      transition: opacity 0.7s ease;
    }
    .why-slider img.is-active { opacity: 1; }
    .why-nav {
      position: absolute;
      top: 50%;
      margin-top: -1.5rem;
      z-index: 2;
      width: 3rem;
      height: 3rem;
      min-height: 3rem;
      padding: 0;
      border: 2px solid var(--action);
      border-radius: var(--radius-sm);
      background: var(--tar);
      color: var(--action);
      box-shadow: var(--shadow);
    }
    .why-nav:hover {
      background: var(--action-strong);
      border-color: var(--action-strong);
      color: #fff;
    }
    .why-nav.prev { left: 0.75rem; }
    .why-nav.next { right: 0.75rem; }
    .why-dots {
      position: absolute;
      right: 1rem;
      bottom: 1rem;
      z-index: 1;
      display: flex;
      gap: 0.4rem;
    }
    .why-dots button {
      width: 0.7rem;
      height: 0.7rem;
      min-height: 0.7rem;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: rgba(255, 255, 255, 0.45);
      cursor: pointer;
    }
    .why-dots button.is-active { background: var(--action); }
    @media (prefers-reduced-motion: reduce) {
      .why-slider img { transition: none; }
    }
  `],
})
export class FotoSliderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  indeks = 0;
  sleepX: number | null = null;

  readonly fotos = [
    { src: 'diamant_laan_foto.jpg', alt: '’n Vierkante meter word op die padbasis afgemeet' },
    { src: 'oewerpad-lugfoto.jpg', alt: 'Lugfoto van Orania en die Oewerpad' },
    { src: 'orania-sonsondergang.jpg', alt: 'Orania in die laat middagson' },
    { src: 'orania-letters.jpg', alt: 'ORANIA-letters op die rant' },
  ];

  kies(i: number) {
    this.indeks = i;
  }

  stap(delta: number) {
    const n = this.fotos.length;
    this.indeks = (this.indeks + delta + n) % n;
  }

  beginSleep(e: PointerEvent) {
    this.sleepX = e.clientX;
  }

  eindigSleep(e: PointerEvent) {
    if (this.sleepX == null) return;
    const dx = e.clientX - this.sleepX;
    this.sleepX = null;
    if (Math.abs(dx) < 40) return;
    this.stap(dx < 0 ? 1 : -1);
  }

  ngOnInit() {
    interval(5500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
        this.stap(1);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
