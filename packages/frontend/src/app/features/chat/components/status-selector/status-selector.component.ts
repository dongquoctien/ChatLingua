import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { UserStatusInfo, StatusType, UpdateStatusDTO } from '../../chat.types';
import { STATUS_COLORS, STATUS_LABELS, STATUS_TEXT_MAX_LENGTH } from '../../chat.types';

interface StatusOption {
  type: StatusType;
  label: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-status-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './status-selector.component.html',
  styleUrls: ['./status-selector.component.scss'],
})
export class StatusSelectorComponent {
  readonly currentStatus = input<UserStatusInfo | null>(null);
  readonly statusChange = output<UpdateStatusDTO>();

  readonly isOpen = signal(false);
  readonly customStatusText = signal('');
  readonly showCustomInput = signal(false);

  readonly STATUS_COLORS = STATUS_COLORS;
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly STATUS_TEXT_MAX_LENGTH = STATUS_TEXT_MAX_LENGTH;

  readonly statusOptions: StatusOption[] = [
    { type: 'online', label: 'Online', color: 'bg-green-500', description: 'You are available' },
    { type: 'away', label: 'Away', color: 'bg-yellow-500', description: 'You are away from keyboard' },
    { type: 'busy', label: 'Busy', color: 'bg-red-500', description: 'Do not disturb' },
    { type: 'studying', label: 'Studying', color: 'bg-blue-500', description: 'Currently learning' },
    { type: 'playing_game', label: 'Playing Game', color: 'bg-purple-500', description: 'Playing a game' },
    { type: 'do_not_disturb', label: 'Do Not Disturb', color: 'bg-red-600', description: 'No notifications' },
    { type: 'invisible', label: 'Invisible', color: 'bg-gray-300', description: 'Appear offline' },
  ];

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
    if (!this.isOpen()) {
      this.showCustomInput.set(false);
    }
  }

  selectStatus(status: StatusType): void {
    this.statusChange.emit({ statusType: status });
    this.isOpen.set(false);
    this.showCustomInput.set(false);
  }

  toggleCustomInput(): void {
    this.showCustomInput.update(v => !v);
    if (this.showCustomInput()) {
      this.customStatusText.set(this.currentStatus()?.statusText || '');
    }
  }

  saveCustomStatus(): void {
    const text = this.customStatusText().trim();
    this.statusChange.emit({
      statusText: text || null,
    });
    this.showCustomInput.set(false);
  }

  clearCustomStatus(): void {
    this.customStatusText.set('');
    this.statusChange.emit({ statusText: null });
    this.showCustomInput.set(false);
  }

  getInitials(): string {
    const status = this.currentStatus();
    if (!status) return '';
    if (status.displayName) {
      return status.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return status.username.slice(0, 2).toUpperCase();
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.showCustomInput.set(false);
  }
}
