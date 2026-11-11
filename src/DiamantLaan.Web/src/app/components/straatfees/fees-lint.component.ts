import { Component, input } from '@angular/core';

/** The poster's gold-edged date ribbon, with a light sweep clipped to its shape. Text is projected. */
@Component({
  selector: 'app-fees-lint',
  standalone: true,
  host: { '[class.klein]': 'klein()' },
  template: `<ng-content />`,
  styles: [`
    :host {
      position: relative;
      display: grid;
      place-items: center;
      width: min(100%, 21rem);
      aspect-ratio: 2177 / 406;
      background: url('/straatfees/lint.png') center / 100% 100% no-repeat;
      filter: drop-shadow(0 8px 14px rgba(15, 80, 160, 0.22));
      font-family: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
      font-variant-numeric: lining-nums;
      font-weight: 600;
      font-size: clamp(1.7rem, 3.4vw, 2.4rem);
      letter-spacing: 0.04em;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0, 40, 90, 0.35);
      animation: op 0.9s ease-out 1s both;
    }
    :host(.klein) { width: min(100%, 15rem); }
    :host::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.55) 50%, transparent 65%) 0 0 / 250% 100% no-repeat;
      -webkit-mask: url('/straatfees/lint.png') center / 100% 100% no-repeat;
      mask: url('/straatfees/lint.png') center / 100% 100% no-repeat;
      animation: glans 5s ease-in-out 2s infinite;
    }

    @keyframes op { from { opacity: 0; translate: 0 0.75rem; } to { opacity: 1; translate: 0 0; } }
    @keyframes glans { 0% { background-position: 150% 0; } 45%, 100% { background-position: -60% 0; } }

    @media (prefers-reduced-motion: reduce) {
      :host, :host::after { animation: none; }
    }
  `]
})
export class FeesLintComponent {
  klein = input(false);
}
