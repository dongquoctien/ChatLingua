import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SharedContentComponent } from '../shared-content/shared-content.component';
import { SharedConversationCardComponent } from '../shared-conversation-card/shared-conversation-card.component';
import { SharedGameCardComponent, SharedGamePayload } from '../shared-game-card/shared-game-card.component';
import { GiftMessageCardComponent } from '../gift-message-card/gift-message-card.component';
import type { Message, SharedConversationPayload, GiftPayload } from '../../chat.types';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule, RouterLink, SharedContentComponent, SharedConversationCardComponent, SharedGameCardComponent, GiftMessageCardComponent],
  templateUrl: './message-item.component.html',
  styleUrls: ['./message-item.component.scss'],
})
export class MessageItemComponent {
  readonly message = input.required<Message>();
  readonly isOwn = input(false);
  readonly showAvatar = input(true);
  readonly refreshTrigger = input(0); // Pass to shared-conversation-card

  readonly importClick = output<number>();
  readonly giftClaimed = output<number>();

  // Computed sender name for gift messages
  readonly giftSenderName = computed(() => {
    const msg = this.message();
    return msg.sender.displayName || msg.sender.username;
  });

  readonly formattedTime = computed(() => {
    const date = new Date(this.message().createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  readonly isSpecialMessage = computed(() => {
    const type = this.message().messageType;
    // 'game' is handled separately by SharedGameCardComponent
    return ['achievement', 'exercise', 'vocabulary'].includes(type);
  });

  readonly isSharedConversation = computed(() => {
    return this.message().messageType === 'shared_conversation';
  });

  readonly sharedConversationPayload = computed(() => {
    if (!this.isSharedConversation()) return null;
    return this.message().metadata as SharedConversationPayload | null;
  });

  readonly isSharedGame = computed(() => {
    return this.message().messageType === 'game';
  });

  readonly sharedGamePayload = computed(() => {
    if (!this.isSharedGame()) return null;
    return this.message().metadata as SharedGamePayload | null;
  });

  readonly isLinkOrImage = computed(() => {
    const type = this.message().messageType;
    return type === 'image' || type === 'link';
  });

  readonly isGiftMessage = computed(() => {
    return this.message().messageType === 'gift';
  });

  readonly giftPayload = computed(() => {
    if (!this.isGiftMessage()) return null;
    return this.message().metadata as GiftPayload | null;
  });

  readonly messageTypeIcon = computed(() => {
    switch (this.message().messageType) {
      case 'achievement': return '🏆';
      case 'exercise': return '📝';
      case 'game': return '🎮';
      case 'vocabulary': return '📚';
      case 'image': return '🖼️';
      case 'link': return '🔗';
      case 'gift': return '🎁';
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

  onImportClick(messageId: number) {
    this.importClick.emit(messageId);
  }

  onGiftClaimed(giftId: number) {
    this.giftClaimed.emit(giftId);
  }
}
