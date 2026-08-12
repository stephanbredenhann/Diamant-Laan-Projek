import { Component, Input } from '@angular/core';

/**
 * Mockup-style purchase progress rail: Bydrae → Toekenning → Erkenning.
 * Active = orange; completed = OB blue + check; upcoming = chalk outline.
 */
@Component({
  selector: 'app-bou-step-bar',
  standalone: true,
  template: `
    <div class="step-bar" [attr.aria-label]="'Stap ' + active + ' van 3'">
      <div class="step-rail" aria-hidden="true"></div>
      @for (label of labels; track label; let i = $index) {
        @let step = i + 1;
        @let done = step < active;
        @let current = step === active;
        <div class="step-node" [class.done]="done" [class.current]="current">
          <span class="step-dot" aria-hidden="true">
            @if (done) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            } @else {
              {{ step }}
            }
          </span>
          <span class="step-label" [class.active-label]="current">{{ label }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .step-bar {
      position: relative;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      margin: 2rem 0 2.5rem;
      max-width: 36rem;
    }
    .step-rail {
      position: absolute;
      left: 12%;
      right: 12%;
      top: 1rem;
      height: 1px;
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
      gap: 0.5rem;
    }
    .step-dot {
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      border: 2px solid rgba(0, 0, 0, 0.25);
      background: var(--bg-chalk);
      color: var(--text-muted);
      font-family: var(--font-display);
      font-size: 0.875rem;
      font-weight: 700;
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
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .step-label.active-label {
      color: var(--ink);
    }
  `]
})
export class BouStepBarComponent {
  /** 1 = Bydrae, 2 = Toekenning, 3 = Erkenning */
  @Input({ required: true }) active!: 1 | 2 | 3;

  readonly labels = ['Bydrae', 'Toekenning', 'Erkenning'] as const;
}
