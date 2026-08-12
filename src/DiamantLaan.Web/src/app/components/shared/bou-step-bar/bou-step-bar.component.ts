import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Mockup-style purchase progress rail: Bydrae → Toekenning → Erkenning.
 * Active = orange; completed = OB blue + check; upcoming = chalk outline.
 *
 * Completed steps are links back; the next step is only a link once the current
 * page says its data is valid (`nextEnabled`), so nobody lands on payment with
 * nothing selected.
 */
@Component({
  selector: 'app-bou-step-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="step-bar" [attr.aria-label]="'Stap ' + active + ' van 3'">
      <div class="step-rail" aria-hidden="true"></div>
      @for (label of labels; track label; let i = $index) {
        @let step = i + 1;
        @let done = step < active;
        @let current = step === active;

        @let skakel = kanSpring(step);
        <a
          class="step-node"
          [class.done]="done"
          [class.current]="current"
          [class.linkbaar]="skakel"
          [routerLink]="skakel ? routes[i] : null"
          [attr.aria-disabled]="skakel || current ? null : 'true'"
          [attr.aria-current]="current ? 'step' : null"
        >
          <span class="step-dot" aria-hidden="true">
            @if (done) {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            } @else {
              {{ step }}
            }
          </span>
          <span class="step-label" [class.active-label]="current">{{ label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    .step-bar {
      position: relative;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      margin: 2rem auto 2.5rem;
      max-width: 44rem;
    }
    .step-rail {
      position: absolute;
      left: 16%;
      right: 16%;
      top: 1.375rem;
      height: 2px;
      background: rgba(0, 0, 0, 0.18);
      z-index: 0;
    }
    .step-node {
      position: relative;
      z-index: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      min-height: var(--tap-min);
      padding: 0.25rem;
      text-decoration: none;
      color: inherit;
    }
    .step-dot {
      width: 2.75rem;
      height: 2.75rem;
      display: grid;
      place-items: center;
      border: 2px solid rgba(0, 0, 0, 0.25);
      background: var(--bg-chalk);
      color: var(--text-muted);
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
      transition: transform 0.15s ease;
    }
    .step-node.current .step-dot {
      border-color: var(--action-strong);
      background: var(--action-strong);
      color: #fff;
    }
    .step-node.done .step-dot {
      border-color: var(--route-blue);
      background: var(--route-blue);
      color: #fff;
    }
    .step-label {
      font-family: var(--font-display);
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .step-label.active-label {
      color: var(--ink);
    }
    /* Only reachable steps behave like links. */
    .step-node.linkbaar { cursor: pointer; }
    .step-node.linkbaar:hover .step-dot,
    .step-node.linkbaar:focus-visible .step-dot { transform: translateY(-2px); }
    .step-node.linkbaar:hover .step-label,
    .step-node.linkbaar:focus-visible .step-label {
      color: var(--ink);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .step-node:not(.linkbaar) { cursor: default; }
  `]
})
export class BouStepBarComponent {
  /** 1 = Bydrae, 2 = Toekenning, 3 = Erkenning */
  @Input({ required: true }) active!: 1 | 2 | 3;

  /** True when the current step's data is valid, which unlocks the next step. */
  @Input() nextEnabled = false;

  readonly labels = ['Bydrae', 'Toekenning', 'Erkenning'] as const;
  readonly routes = ['/bou', '/bou/kies', '/bou/bevestig'] as const;

  /** Back to anything completed, forward only one step and only when valid. */
  kanSpring(step: number): boolean {
    return step < this.active || (step === this.active + 1 && this.nextEnabled);
  }
}
