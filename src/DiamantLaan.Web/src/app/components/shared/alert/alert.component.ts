import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (message) {
      <div class="app-alert" [class.error]="type === 'error'" [class.success]="type === 'success'" [class.info]="type === 'info'">
        {{ message }}
      </div>
    }
  `,
  styles: [`
    .app-alert {
      font-size: 0.8125rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
      border: 1px solid transparent;
    }
    .app-alert.success {
      background: #E8ECD8;
      color: #5A6A32;
      border-color: #D4DFB8;
    }
    .app-alert.error {
      background: #FEF2F2;
      color: #DC2626;
      border-color: #FECACA;
    }
    .app-alert.info {
      background: #F5F0E1;
      color: var(--color-text);
      border-color: var(--color-border);
    }
  `]
})
export class AlertComponent {
  @Input() message = '';
  @Input() type: 'success' | 'error' | 'info' = 'info';
}
