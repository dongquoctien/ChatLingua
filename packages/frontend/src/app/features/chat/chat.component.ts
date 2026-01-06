import { Component, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { ChatService } from './services/chat.service';
import { SocketService } from './services/socket.service';
import { UserListComponent } from './components/user-list/user-list.component';
import { ConversationListComponent } from './components/conversation-list/conversation-list.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { StatusSelectorComponent } from './components/status-selector/status-selector.component';
import { BlockedUsersComponent } from './components/blocked-users/blocked-users.component';
import { ImportConversationDialogComponent, ImportConversationDialogData } from './components/import-conversation-dialog/import-conversation-dialog.component';
import type { UserStatusInfo, ConversationPreview } from './chat.types';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    UserListComponent,
    ConversationListComponent,
    ChatWindowComponent,
    StatusSelectorComponent,
    BlockedUsersComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  readonly chatService = inject(ChatService);
  readonly socketService = inject(SocketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(Dialog);
  private platformId = inject(PLATFORM_ID);

  // View state
  readonly activeView = signal<'conversations' | 'users'>('conversations');
  readonly selectedConversationId = signal<number | null>(null);
  readonly isMobileMenuOpen = signal(false);
  readonly showBlockedUsers = signal(false);
  readonly refreshTrigger = signal(0); // Increment to refresh shared conversation cards

  // From services
  readonly isConnected = this.socketService.isConnected;
  readonly isBrowserOnline = this.socketService.isBrowserOnline;
  readonly conversations = this.chatService.conversations;
  readonly activeConversation = this.chatService.activeConversation;
  readonly currentStatus = this.chatService.currentStatus;
  readonly totalUnread = this.chatService.totalUnread;
  readonly loading = this.chatService.loading;
  readonly pendingMessages = this.chatService.pendingMessages;
  readonly isOfflineMode = this.chatService.isOfflineMode;

  // Computed
  readonly showChatWindow = computed(() => this.selectedConversationId() !== null);
  readonly isOffline = computed(() => !this.isBrowserOnline() || !this.isConnected());

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
    // Check if mobile - redirect to dashboard (chat page only for PC/tablet)
    if (isPlatformBrowser(this.platformId)) {
      if (window.innerWidth < 768) {
        this.router.navigate(['/dashboard']);
        return;
      }
    }

    // Set up socket listeners FIRST (before connect to avoid race condition)
    this.setupSocketListeners();

    // Connect to socket (this will trigger 'users:online:list' via connect handler)
    this.socketService.connect();

    // Load initial data
    this.loadInitialData();

    // Check for route params
    this.route.params.subscribe(params => {
      if (params['conversationId']) {
        this.selectConversation(+params['conversationId']);
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeOnline?.();
    this.unsubscribeOffline?.();
    this.unsubscribeOnlineUsersList?.();
    this.unsubscribeStatusChanged?.();
    this.socketService.disconnect();
  }

  private loadInitialData(): void {
    this.chatService.getMyStatus().subscribe();
    this.chatService.getConversations().subscribe();
  }

  private setupSocketListeners(): void {
    // Listen for new messages
    this.unsubscribeMessage = this.socketService.onMessage(message => {
      this.chatService.addReceivedMessage(message);
    });

    // Listen for online status changes
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

  selectConversation(conversationId: number): void {
    this.selectedConversationId.set(conversationId);
    this.chatService.getConversation(conversationId).subscribe();
    this.chatService.getMessages(conversationId).subscribe();
    this.isMobileMenuOpen.set(false);
  }

  startConversationWithUser(user: UserStatusInfo): void {
    // Check if conversation exists
    const existing = this.conversations().find(c => c.otherUser.id === user.userId);
    if (existing) {
      this.selectConversation(existing.id);
      return;
    }

    // Create new conversation
    this.chatService.createConversation({ otherUserId: user.userId }).subscribe(conversation => {
      this.selectConversation(conversation.id);
    });
  }

  closeConversation(): void {
    this.selectedConversationId.set(null);
    this.chatService.clearActiveConversation();
  }

  toggleView(view: 'conversations' | 'users'): void {
    this.activeView.set(view);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  onBlockUser(userId: number): void {
    this.chatService.blockUser(userId).subscribe(() => {
      this.closeConversation();
      // Refresh conversations to remove blocked user
      this.chatService.getConversations().subscribe();
    });
  }

  openBlockedUsers(): void {
    this.showBlockedUsers.set(true);
  }

  closeBlockedUsers(): void {
    this.showBlockedUsers.set(false);
  }

  openImportDialog(messageId: number): void {
    const dialogRef = this.dialog.open<boolean>(ImportConversationDialogComponent, {
      data: { messageId } as ImportConversationDialogData,
      panelClass: 'import-dialog-panel',
    });

    dialogRef.closed.subscribe(imported => {
      if (imported) {
        // Increment refreshTrigger to update shared conversation cards
        this.refreshTrigger.update(v => v + 1);
      }
    });
  }

}
