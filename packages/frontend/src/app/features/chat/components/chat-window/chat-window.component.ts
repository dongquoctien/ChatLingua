import { Component, input, output, signal, computed, inject, ElementRef, ViewChild, AfterViewChecked, OnChanges, SimpleChanges, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { MessageItemComponent } from '../message-item/message-item.component';
import { ConversationSettingsComponent } from '../conversation-settings/conversation-settings.component';
import type { Conversation, Message, SendMessageDTO, UpdateConversationSettingsDTO } from '../../chat.types';
import { STATUS_COLORS, STATUS_LABELS, ACTIVITY_LABELS } from '../../chat.types';
import type { PendingMessage } from '../../services/offline-storage.service';

// Combined display type for messages and pending messages
export interface DisplayMessage {
  type: 'message' | 'pending';
  message?: Message;
  pending?: PendingMessage;
  createdAt: string;
}

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageItemComponent, ConversationSettingsComponent],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
})
export class ChatWindowComponent implements AfterViewChecked, OnChanges {
  private authService = inject(AuthService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  readonly conversation = input<Conversation | null>(null);
  readonly messages = input<Message[]>([]);
  readonly pendingMessages = input<PendingMessage[]>([]);
  readonly typingUsers = input<number[]>([]);
  readonly compact = input(false); // Hide header when used in widget
  readonly isOffline = input(false); // Show offline indicator
  readonly refreshTrigger = input(0); // Increment to force refresh of shared conversation cards

  readonly close = output<void>();
  readonly sendMessage = output<SendMessageDTO>();
  readonly loadMore = output<number>();
  readonly markRead = output<{ messageIds: number[] }>();
  readonly startTyping = output<void>();
  readonly stopTyping = output<void>();
  readonly settingsChange = output<UpdateConversationSettingsDTO>();
  readonly blockUser = output<number>();
  readonly importConversation = output<number>();

  readonly STATUS_COLORS = STATUS_COLORS;
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly ACTIVITY_LABELS = ACTIVITY_LABELS;

  // State
  readonly messageText = signal('');
  readonly isTyping = signal(false);
  readonly showScrollToBottom = signal(false);
  readonly showSettings = signal(false);

  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldScrollToBottom = true;
  private lastMessageCount = 0;

  // Computed
  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? 0);

  readonly sortedMessages = computed(() => {
    // Backend already returns messages in chronological order (oldest first)
    return this.messages();
  });

  // Combined display list with messages and pending messages
  readonly displayMessages = computed((): DisplayMessage[] => {
    const msgs = this.messages();
    const pending = this.pendingMessages();
    const conversationId = this.conversation()?.id;

    // Convert messages to display items
    const displayMsgs: DisplayMessage[] = msgs.map(m => ({
      type: 'message' as const,
      message: m,
      createdAt: m.createdAt,
    }));

    // Add pending messages for this conversation
    const pendingForConv = conversationId
      ? pending.filter(p => p.conversationId === conversationId)
      : [];

    const pendingDisplay: DisplayMessage[] = pendingForConv.map(p => ({
      type: 'pending' as const,
      pending: p,
      createdAt: p.createdAt,
    }));

    // Combine and sort by createdAt
    return [...displayMsgs, ...pendingDisplay].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });

  readonly otherUser = computed(() => this.conversation()?.otherUser ?? null);

  readonly isOtherUserTyping = computed(() => {
    const other = this.otherUser();
    if (!other) return false;
    return this.typingUsers().includes(other.id);
  });

  // Auto-scroll when typing indicator appears
  private typingScrollEffect = effect(() => {
    if (this.isOtherUserTyping()) {
      // Use setTimeout to ensure DOM is updated before scrolling
      setTimeout(() => this.scrollToBottom(), 0);
    }
  });

  readonly unreadMessageIds = computed(() => {
    const userId = this.currentUserId();
    return this.messages()
      .filter(m => m.senderId !== userId && !m.isRead)
      .map(m => m.id);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      const msgs = this.messages();
      const currentCount = msgs.length;

      if (currentCount > 0) {
        // Mark all unread messages as read
        const unreadIds = this.unreadMessageIds();
        if (unreadIds.length > 0) {
          this.markRead.emit({ messageIds: unreadIds });
        }
      }

      if (currentCount > this.lastMessageCount) {
        this.shouldScrollToBottom = true;
      }
      this.lastMessageCount = currentCount;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  onSend(): void {
    const text = this.messageText().trim();
    if (!text || !this.conversation()) return;

    this.sendMessage.emit({
      conversationId: this.conversation()!.id,
      messageType: 'text',
      content: text,
    });

    this.messageText.set('');
    this.stopTypingIndicator();
    this.shouldScrollToBottom = true;

    // Focus back on input
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 0);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  onInput(): void {
    if (!this.isTyping()) {
      this.isTyping.set(true);
      this.startTyping.emit();
    }

    // Reset typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.stopTypingIndicator();
    }, 2000);
  }

  private stopTypingIndicator(): void {
    if (this.isTyping()) {
      this.isTyping.set(false);
      this.stopTyping.emit();
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  onScroll(event: Event): void {
    const container = event.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Show scroll to bottom button
    this.showScrollToBottom.set(scrollHeight - scrollTop - clientHeight > 200);

    // Load more when scrolled to top
    if (scrollTop < 100 && this.messages().length > 0) {
      const currentPage = Math.ceil(this.messages().length / 50);
      this.loadMore.emit(currentPage + 1);
    }
  }

  scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  onClose(): void {
    this.close.emit();
  }

  getInitials(): string {
    const user = this.otherUser();
    if (!user) return '';
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  }

  formatLastSeen(lastSeenAt: string | null): string {
    if (!lastSeenAt) return '';
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  shouldShowDateSeparator(message: Message, index: number): boolean {
    if (index === 0) return true;
    const sortedMsgs = this.sortedMessages();
    const prevMessage = sortedMsgs[index - 1];
    if (!prevMessage) return false;

    const currentDate = new Date(message.createdAt).toDateString();
    const prevDate = new Date(prevMessage.createdAt).toDateString();
    return currentDate !== prevDate;
  }

  shouldShowDateSeparatorForDisplay(item: DisplayMessage, index: number): boolean {
    if (index === 0) return true;
    const displayMsgs = this.displayMessages();
    const prevItem = displayMsgs[index - 1];
    if (!prevItem) return false;

    const currentDate = new Date(item.createdAt).toDateString();
    const prevDate = new Date(prevItem.createdAt).toDateString();
    return currentDate !== prevDate;
  }

  formatDateSeparator(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  onSettingsChange(data: UpdateConversationSettingsDTO): void {
    this.settingsChange.emit(data);
  }

  onBlockUser(): void {
    const otherUserId = this.otherUser()?.id;
    if (otherUserId) {
      this.blockUser.emit(otherUserId);
      this.closeSettings();
    }
  }

  onImportConversation(messageId: number): void {
    this.importConversation.emit(messageId);
  }
}
