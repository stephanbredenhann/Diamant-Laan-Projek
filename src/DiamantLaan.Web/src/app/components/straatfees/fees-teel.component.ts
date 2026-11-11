import { Component, input } from '@angular/core';

/**
 * The straatfees poster frame: a white Delft tile with thin rules, four ornamental corners and
 * (optionally) flowers sitting on the rules. Content is projected inside; it brings its own padding.
 */
@Component({
  selector: 'app-fees-teel',
  standalone: true,
  host: { '[class.klein]': 'klein()', '[class.blomme]': 'blomme()' },
  template: `
    <span class="raam" aria-hidden="true"><i></i></span>
    @for (h of hoeke; track h) {
      <span class="hoek" [class]="'hoek hoek--' + h" aria-hidden="true"><img src="straatfees/hoek.png" alt="" /></span>
    }
    @if (blomme()) {
      <img class="blom blom--bo" src="straatfees/blom.png" alt="" aria-hidden="true" />
      <img class="blom blom--l" src="straatfees/blom.png" alt="" aria-hidden="true" />
      <img class="blom blom--r" src="straatfees/blom.png" alt="" aria-hidden="true" />
    }
    <ng-content />
  `,
  styles: [`
    :host {
      --delft: #2F4F8F;
      --hoek: clamp(4.5rem, 10vw, 8.5rem);
      --raam-inset: clamp(0.9rem, 2vw, 1.6rem);
      --blom-w: clamp(7rem, 12vw, 10rem);
      --k1: calc(var(--hoek) * 0.75);
      --k2: calc(var(--hoek) * 0.95);
      position: relative;
      display: block;
      background: #fff;
      box-shadow: 0 1px 2px rgba(20, 35, 75, 0.05), 0 30px 70px -20px rgba(20, 35, 75, 0.18);
      isolation: isolate;
    }
    :host(.klein) { --hoek: clamp(4rem, 9vw, 6.5rem); }

    .raam { position: absolute; inset: var(--raam-inset); pointer-events: none; z-index: -1; }
    .raam::before, .raam::after, .raam i {
      --fade: linear-gradient(var(--rig), transparent var(--k1), #000 var(--k2), #000 calc(100% - var(--k2)), transparent calc(100% - var(--k1)));
      content: '';
      position: absolute;
      inset: 0;
      -webkit-mask-image: var(--fade);
      mask-image: var(--fade);
    }
    /* Rules fade out under the corner art and draw outward from the middle. */
    .raam::before, .raam i { --rig: 90deg; animation: trek-x 1.4s cubic-bezier(0.65, 0, 0.35, 1) 0.2s both; }
    .raam::before { border-top: 2px solid var(--delft); }
    .raam i { border-bottom: 2px solid var(--delft); }
    .raam::after { --rig: 180deg; border-inline: 2px solid var(--delft); animation: trek-y 1.4s cubic-bezier(0.65, 0, 0.35, 1) 0.35s both; }
    /* Where a flower sits, the rule stops short on either side of it, like on the poster. */
    :host(.blomme) .raam::before, :host(.blomme) .raam::after {
      --fade: linear-gradient(var(--rig), transparent var(--k1), #000 var(--k2),
        #000 calc(50% - var(--gat) - 0.6rem), transparent calc(50% - var(--gat)),
        transparent calc(50% + var(--gat)), #000 calc(50% + var(--gat) + 0.6rem),
        #000 calc(100% - var(--k2)), transparent calc(100% - var(--k1)));
    }
    :host(.blomme) .raam::before { --gat: calc(var(--blom-w) * 0.42); }
    :host(.blomme) .raam::after { --gat: 3rem; }

    /* The span mirrors the art into its corner; the img inside does the moving, pivoting on the stem. */
    .hoek { position: absolute; width: var(--hoek); aspect-ratio: 1; pointer-events: none; --rand: calc(var(--raam-inset) * 0.4); }
    .hoek img { width: 100%; height: 100%; transform-origin: 10% 10%; animation: hoek-in 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) both, swaai 8s ease-in-out 1.6s infinite; }
    .hoek--lb { top: var(--rand); left: var(--rand); }
    .hoek--rb { top: var(--rand); right: var(--rand); transform: scaleX(-1); }
    .hoek--lo { bottom: var(--rand); left: var(--rand); transform: scaleY(-1); }
    .hoek--ro { bottom: var(--rand); right: var(--rand); transform: scale(-1); }
    .hoek--rb img { animation-delay: 0.12s, 1.9s; }
    .hoek--lo img { animation-delay: 0.24s, 2.2s; }
    .hoek--ro img { animation-delay: 0.36s, 2.5s; }

    /* Flowers sit centred on the rules, in the gaps cut above. */
    .blom { position: absolute; object-fit: cover; pointer-events: none; animation: blom-in 1s ease-out 1.1s both; }
    .blom--bo { top: var(--raam-inset); left: 50%; translate: -50% -50%; width: var(--blom-w); height: 2.6rem; animation: blom-in 1s ease-out 0.9s both, bloei 6s ease-in-out 2s infinite; }
    .blom--l, .blom--r { top: 50%; width: 7rem; height: 2.4rem; }
    .blom--l { left: var(--raam-inset); translate: -50% -50%; rotate: 90deg; }
    .blom--r { right: var(--raam-inset); translate: 50% -50%; rotate: -90deg; }

    @keyframes trek-x { from { clip-path: inset(0 50%); } to { clip-path: inset(0 0); } }
    @keyframes trek-y { from { clip-path: inset(50% 0); } to { clip-path: inset(0 0); } }
    @keyframes hoek-in { from { opacity: 0; transform: rotate(-14deg) scale(0.8); } to { opacity: 1; transform: none; } }
    @keyframes swaai { 0%, 100% { transform: none; } 50% { transform: rotate(2deg); } }
    @keyframes blom-in { from { opacity: 0; scale: 0.7; } to { opacity: 1; scale: 1; } }
    @keyframes bloei { 0%, 100% { scale: 1; } 50% { scale: 1.06; } }

    @media (max-width: 860px) {
      .blom--l, .blom--r { display: none; }
      :host(.blomme) .raam::after { --fade: linear-gradient(var(--rig), transparent var(--k1), #000 var(--k2), #000 calc(100% - var(--k2)), transparent calc(100% - var(--k1))); }
    }
    @media (prefers-reduced-motion: reduce) {
      .raam::before, .raam::after, .raam i, .hoek img, .blom { animation: none !important; }
    }
  `]
})
export class FeesTeelComponent {
  klein = input(false);
  blomme = input(false);
  readonly hoeke = ['lb', 'rb', 'lo', 'ro'];
}
