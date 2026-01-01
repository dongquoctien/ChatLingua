import { Component, Input, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { STATUS_COLORS, STATUS_LABELS, ACTIVITY_LABELS, type StatusType, type ActivityType } from '../../chat.types';

@Component({
  selector: 'app-user-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-status-badge.component.html',
  styleUrls: ['./user-status-badge.component.scss'],
})
export class UserStatusBadgeComponent {
  readonly status = input<StatusType>('offline');
  readonly activity = input<ActivityType>('none');
  readonly showText = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly STATUS_COLORS = STATUS_COLORS;

  readonly statusColor = computed(() => {
    return STATUS_COLORS[this.status()] || STATUS_COLORS.offline;
  });

  readonly statusLabel = computed(() => {
    return STATUS_LABELS[this.status()] || 'Offline';
  });

  readonly activityLabel = computed(() => {
    const act = this.activity();
    if (!act || act === 'none') return '';
    return ACTIVITY_LABELS[act] || '';
  });

  readonly sizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'w-2.5 h-2.5';
      case 'lg':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  });

  readonly borderClasses = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'border';
      case 'lg':
        return 'border-[3px]';
      case 'md':
      default:
        return 'border-2';
    }
  });
}
