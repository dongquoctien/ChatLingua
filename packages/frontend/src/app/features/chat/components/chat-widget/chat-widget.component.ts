import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { UserListComponent } from '../user-list/user-list.component';
import { ConversationListComponent } from '../conversation-list/conversation-list.component';
import { ChatWindowComponent } from '../chat-window/chat-window.component';
import { StatusSelectorComponent } from '../status-selector/status-selector.component';
import type { UserStatusInfo } from '../../chat.types';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [
    CommonModule,
    UserListComponent,
    ConversationListComponent,
    ChatWindowComponent,
    StatusSelectorComponent,
  ],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss'],
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  readonly chatService = inject(ChatService);
  readonly socketService = inject(SocketService);

  // Widget state
  readonly isOpen = signal(false);
  readonly isMinimized = signal(false);
  readonly activeView = signal<'conversations' | 'users' | 'chat'>('conversations');
  readonly selectedConversationId = signal<number | null>(null);

  // From services
  readonly isConnected = this.socketService.isConnected;
  readonly conversations = this.chatService.conversations;
  readonly activeConversation = this.chatService.activeConversation;
  readonly currentStatus = this.chatService.currentStatus;
  readonly totalUnread = this.chatService.totalUnread;
  readonly loading = this.chatService.loading;

  // Computed
  readonly showChatWindow = computed(() => this.activeView() === 'chat' && this.selectedConversationId() !== null);

  // Typing users for current conversation (reactive computed)
  readonly typingUsersForConversation = computed(() => {
    const convId = this.selectedConversationId();
    if (!convId) return [];
    const typingMap = this.socketService.typingUsers();
    const users = typingMap.get(convId);
    return users ? Array.from(users) : [];
  });

  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeOnline: (() => void) | null = null;
  private unsubscribeOffline: (() => void) | null = null;
  private unsubscribeOnlineUsersList: (() => void) | null = null;
  private unsubscribeStatusChanged: (() => void) | null = null;

  ngOnInit(): void {
    // Set up socket listeners FIRST (before connect to avoid race condition)
    this.setupSocketListeners();

    // Connect to socket (this will trigger 'users:online:list' via connect handler)
    this.socketService.connect();

    // Load initial data
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeOnline?.();
    this.unsubscribeOffline?.();
    this.unsubscribeOnlineUsersList?.();
    this.unsubscribeStatusChanged?.();
  }

  private loadInitialData(): void {
    this.chatService.getMyStatus().subscribe();
    this.chatService.getConversations().subscribe();
  }

  private setupSocketListeners(): void {
    this.unsubscribeMessage = this.socketService.onMessage(message => {
      this.chatService.addReceivedMessage(message);
    });

    this.unsubscribeOnline = this.socketService.onUserOnline(data => {
      this.chatService.updateConversationOnlineStatus(data.userId, true, data.status as any);
    });

    this.unsubscribeOffline = this.socketService.onUserOffline(data => {
      this.chatService.updateConversationOnlineStatus(data.userId, false);
    });

    // Sync conversations when receiving full online users list
    this.unsubscribeOnlineUsersList = this.socketService.onOnlineUsersList(users => {
      this.chatService.syncOnlineUsersWithConversations(users);
    });

    // Listen for status type changes (busy, away, etc.)
    this.unsubscribeStatusChanged = this.socketService.onStatusChanged(data => {
      this.chatService.updateConversationOnlineStatus(data.userId, true, data.status);
    });
  }

  toggleWidget(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.isMinimized.set(false);
    }
  }

  minimizeWidget(): void {
    this.isMinimized.set(true);
  }

  closeWidget(): void {
    this.isOpen.set(false);
    this.isMinimized.set(false);
  }

  selectConversation(conversationId: number): void {
    this.selectedConversationId.set(conversationId);
    this.activeView.set('chat');
    this.chatService.getConversation(conversationId).subscribe();
    this.chatService.getMessages(conversationId).subscribe();
  }

  startConversationWithUser(user: UserStatusInfo): void {
    const existing = this.conversations().find(c => c.otherUser.id === user.userId);
    if (existing) {
      this.selectConversation(existing.id);
      return;
    }

    this.chatService.createConversation({ otherUserId: user.userId }).subscribe(conversation => {
      this.selectConversation(conversation.id);
    });
  }

  backToList(): void {
    this.selectedConversationId.set(null);
    this.activeView.set('conversations');
    this.chatService.clearActiveConversation();
  }

  toggleView(view: 'conversations' | 'users'): void {
    this.activeView.set(view);
    this.selectedConversationId.set(null);
  }

  openInNewTab(): void {
    const conversationId = this.selectedConversationId();
    if (conversationId) {
      window.open(`/chat/${conversationId}`, '_blank');
    } else {
      window.open('/chat', '_blank');
    }
  }

  onBlockUser(userId: number): void {
    this.chatService.blockUser(userId).subscribe(() => {
      this.backToList();
      // Refresh conversations to remove blocked user
      this.chatService.getConversations().subscribe();
    });
  }
}
