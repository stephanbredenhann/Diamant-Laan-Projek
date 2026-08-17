import { Component, Input } from '@angular/core';
import { SquareStatus, STATUS_LABELS } from '../../../models/square';
import { TPipe } from '../../..//i18n/t.pipe';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TPipe],
  template: `<span class="status-badge status-{{ status }}">{{ label | t }}</span>`,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: SquareStatus;
  get label(): string { return STATUS_LABELS[this.status] };
}
