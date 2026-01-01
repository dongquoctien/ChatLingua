import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStatusBadgeComponent } from '../user-status-badge/user-status-badge.component';
import type { ConversationPreview, StatusType } from '../../chat.types';
import { STATUS_COLORS } from '../../chat.types';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, UserStatusBadgeComponent],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent {
  readonly conversations = input<ConversationPreview[]>([]);
  readonly selectedId = input<number | null>(null);
  readonly loading = input(false);

  readonly conversationSelect = output<number>();

  readonly STATUS_COLORS = STATUS_COLORS;

  // Computed: group by pinned/regular
  readonly pinnedConversations = computed(() =>
    this.conversations().filter(c => c.isPinned && !c.isArchived)
  );

  readonly regularConversations = computed(() =>
    this.conversations().filter(c => !c.isPinned && !c.isArchived)
  );

  selectConversation(id: number): void {
    this.conversationSelect.emit(id);
  }

  getInitials(conversation: ConversationPreview): string {
    const user = conversation.otherUser;
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  }

  formatTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  getLastMessagePreview(conversation: ConversationPreview): string {
    if (!conversation.lastMessage) return 'No messages yet';

    // Truncate long messages
    const maxLength = 40;
    const message = conversation.lastMessage;
    if (message.length > maxLength) {
      return message.slice(0, maxLength) + '...';
    }
    return message;
  }

  getMessageTypeIcon(type: string | null): string {
    switch (type) {
      case 'achievement': return '🏆';
      case 'exercise': return '📝';
      case 'game': return '🎮';
      case 'vocabulary': return '📚';
      case 'image': return '🖼️';
      case 'link': return '🔗';
      default: return '';
    }
  }

  getStatusColor(statusType: StatusType | string | undefined): string {
    if (!statusType) return STATUS_COLORS['offline'];
    return STATUS_COLORS[statusType as StatusType] ?? STATUS_COLORS['offline'];
  }
}
