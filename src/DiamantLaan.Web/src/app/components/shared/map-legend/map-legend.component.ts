import { Component } from '@angular/core';
import { TPipe } from '../../..//i18n/t.pipe';

@Component({
  selector: 'app-map-legend',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="legend">
      <span><span class="dot free"></span> {{ 'Beskikbaar' | t }}</span>
      <span><span class="dot sold"></span> {{ 'Verkoop' | t }}</span>
      <span><span class="dot unavailable"></span> {{ 'Onbeskikbaar' | t }}</span>
      <span><span class="dot prep"></span> {{ 'Voorberei' | t }}</span>
      <span><span class="dot busy"></span> {{ 'Besig om te teer' | t }}</span>
      <span><span class="dot done"></span> {{ 'Klaar geteer' | t }}</span>
      <span><span class="dot selected"></span> {{ 'Gekies' | t }}</span>
    </div>
  `,
  styles: [`
    .legend {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      font-size: 0.75rem;
      color: var(--color-muted);
    }
    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      margin-right: 4px;
      vertical-align: middle;
    }
    .dot.free { background: #D4C4A8; }
    .dot.sold { background: #C67B5C; }
    .dot.unavailable { background: var(--blok-onbeskikbaar); }
    .dot.prep { background: #B5651D; }
    .dot.busy { background: #8B7355; }
    .dot.done { background: #6B7B3C; }
    .dot.selected { background: #3D2B1F; }
  `]
})
export class MapLegendComponent {}
