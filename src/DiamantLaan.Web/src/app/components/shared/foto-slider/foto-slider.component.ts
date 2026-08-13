import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, interval, takeUntil } from 'rxjs';

@Component({
  selector: 'app-foto-slider',
  standalone: true,
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
          [alt]="foto.alt"
          [class.is-active]="indeks === i"
        />
      }
    </div>
    <div class="why-dots" role="tablist" aria-label="Foto’s">
      @for (foto of fotos; track foto.src; let i = $index) {
        <button
          type="button"
          role="tab"
          [class.is-active]="indeks === i"
          [attr.aria-selected]="indeks === i"
          [attr.aria-label]="'Foto ' + (i + 1)"
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
  ];

  kies(i: number) {
    this.indeks = i;
  }

  beginSleep(e: PointerEvent) {
    this.sleepX = e.clientX;
  }

  eindigSleep(e: PointerEvent) {
    if (this.sleepX == null) return;
    const dx = e.clientX - this.sleepX;
    this.sleepX = null;
    if (Math.abs(dx) < 40) return;
    const n = this.fotos.length;
    this.indeks = dx < 0
      ? (this.indeks + 1) % n
      : (this.indeks - 1 + n) % n;
  }

  ngOnInit() {
    interval(5500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
        this.indeks = (this.indeks + 1) % this.fotos.length;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
