import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedContentComponent } from '../shared-content/shared-content.component';
import type { Message } from '../../chat.types';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule, SharedContentComponent],
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.scss'],
})
export class MessageItemComponent {
  readonly message = input.required<Message>();
  readonly isOwn = input(false);
  readonly showAvatar = input(true);

  readonly formattedTime = computed(() => {
    const date = new Date(this.message().createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  readonly isSpecialMessage = computed(() => {
    const type = this.message().messageType;
    return ['achievement', 'exercise', 'game', 'vocabulary'].includes(type);
  });

  readonly isLinkOrImage = computed(() => {
    const type = this.message().messageType;
    return type === 'image' || type === 'link';
  });

  readonly messageTypeIcon = computed(() => {
    switch (this.message().messageType) {
      case 'achievement': return '🏆';
      case 'exercise': return '📝';
      case 'game': return '🎮';
      case 'vocabulary': return '📚';
      case 'image': return '🖼️';
      case 'link': return '🔗';
      default: return '';
    }
  });

  getInitials(): string {
    const sender = this.message().sender;
    if (sender.displayName) {
      return sender.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return sender.username.slice(0, 2).toUpperCase();
  }
}
