import { Component, Input } from '@angular/core';
import { SquareStatus, STATUS_LABELS } from '../../../models/square';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="status-badge status-{{ status }}">{{ label }}</span>`,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: SquareStatus;
  get label(): string { return STATUS_LABELS[this.status] };
}
