import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of, from, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OfflineStorageService, PendingMessage } from './offline-storage.service';
import type {
  UserStatusInfo,
  ConversationPreview,
  Conversation,
  Message,
  BlockedUser,
  PaginatedResponse,
  UpdateStatusDTO,
  UpdateConversationSettingsDTO,
  SendMessageDTO,
  CreateConversationDTO,
  MarkMessagesReadDTO,
  ShareContentDTO,
  StatusType,
  SharedPreview,
  ImportOptions,
  ImportResult,
  ImportStatus,
} from '../chat.types';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private baseUrl = `${environment.apiUrl}/chat`;

  // State
  private _currentStatus = signal<UserStatusInfo | null>(null);
  private _conversations = signal<ConversationPreview[]>([]);
  private _activeConversation = signal<Conversation | null>(null);
  private _messages = signal<Message[]>([]);
  private _pendingMessages = signal<PendingMessage[]>([]);
  private _blockedUsers = signal<BlockedUser[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _isOfflineMode = signal(false);

  // Public signals
  readonly currentStatus = this._currentStatus.asReadonly();
  readonly conversations = this._conversations.asReadonly();
  readonly activeConversation = this._activeConversation.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly pendingMessages = this._pendingMessages.asReadonly();
  readonly blockedUsers = this._blockedUsers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isOfflineMode = this._isOfflineMode.asReadonly();

  // Computed
  readonly totalUnread = computed(() =>
    this._conversations().reduce((sum, c) => sum + c.unreadCount, 0)
  );

  readonly pinnedConversations = computed(() =>
    this._conversations().filter(c => c.isPinned)
  );

  readonly regularConversations = computed(() =>
    this._conversations().filter(c => !c.isPinned && !c.isArchived)
  );

  readonly archivedConversations = computed(() =>
    this._conversations().filter(c => c.isArchived)
  );

  // ============================================================
  // Status
  // ============================================================

  getMyStatus(): Observable<UserStatusInfo> {
    return this.http.get<UserStatusInfo>(`${this.baseUrl}/status`).pipe(
      tap(status => this._currentStatus.set(status)),
      catchError(error => {
        this._error.set('Failed to get status');
        throw error;
      })
    );
  }

  updateStatus(data: UpdateStatusDTO): Observable<UserStatusInfo> {
    return this.http.put<UserStatusInfo>(`${this.baseUrl}/status`, data).pipe(
      tap(status => this._currentStatus.set(status)),
      catchError(error => {
        this._error.set('Failed to update status');
        throw error;
      })
    );
  }

  // ============================================================
  // Users
  // ============================================================

  getAllUsers(page = 1, limit = 50): Observable<PaginatedResponse<UserStatusInfo>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<UserStatusInfo>>(`${this.baseUrl}/users`, { params });
  }

  searchUsers(query: string, page = 1, limit = 20): Observable<PaginatedResponse<UserStatusInfo>> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<UserStatusInfo>>(`${this.baseUrl}/search/users`, { params });
  }

  // ============================================================
  // Conversations
  // ============================================================

  getConversations(page = 1, limit = 50, includeArchived = false): Observable<PaginatedResponse<ConversationPreview>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('includeArchived', includeArchived.toString());

    this._loading.set(true);
    return this.http.get<PaginatedResponse<ConversationPreview>>(`${this.baseUrl}/conversations`, { params }).pipe(
      tap(response => {
        this._conversations.set(response.items);
        this._loading.set(false);
        this._isOfflineMode.set(false);

        // Cache conversations for offline use
        this.offlineStorage.cacheConversations(response.items).catch(err =>
          console.error('[ChatService] Failed to cache conversations:', err)
        );
      }),
      catchError(error => {
        this._loading.set(false);

        // Try to load from cache if offline
        if (!navigator.onLine) {
          this._isOfflineMode.set(true);
          return from(this.loadCachedConversations());
        }

        this._error.set('Failed to get conversations');
        throw error;
      })
    );
  }

  private async loadCachedConversations(): Promise<PaginatedResponse<ConversationPreview>> {
    const cached = await this.offlineStorage.getCachedConversations();
    this._conversations.set(cached);
    return {
      items: cached,
      total: cached.length,
      page: 1,
      limit: cached.length,
      totalPages: 1,
    };
  }

  getConversation(conversationId: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/conversations/${conversationId}`).pipe(
      tap(conversation => this._activeConversation.set(conversation)),
      catchError(error => {
        this._error.set('Failed to get conversation');
        throw error;
      })
    );
  }

  createConversation(data: CreateConversationDTO): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.baseUrl}/conversations`, data).pipe(
      tap(conversation => {
        this._activeConversation.set(conversation);
        // Add to conversations list
        const preview: ConversationPreview = {
          id: conversation.id,
          otherUser: conversation.otherUser,
          lastMessage: null,
          lastMessageType: null,
          lastMessageAt: null,
          lastMessageSenderId: null,
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          isArchived: false,
          isOnline: conversation.otherUser.status.isOnline,
          statusType: conversation.otherUser.status.statusType,
          nickname: conversation.settings?.nickname ?? null,
        };
        this._conversations.update(convs => [preview, ...convs]);
      }),
      catchError(error => {
        this._error.set('Failed to create conversation');
        throw error;
      })
    );
  }

  updateConversationSettings(conversationId: number, data: UpdateConversationSettingsDTO): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/conversations/${conversationId}/settings`, data).pipe(
      tap(() => {
        // Update local state
        this._conversations.update(convs =>
          convs.map(c => {
            if (c.id === conversationId) {
              return {
                ...c,
                isPinned: data.isPinned ?? c.isPinned,
                isMuted: data.isMuted ?? c.isMuted,
                isArchived: data.isArchived ?? c.isArchived,
                nickname: data.nickname !== undefined ? data.nickname : c.nickname,
              };
            }
            return c;
          })
        );
        // Update active conversation settings if needed
        if (this._activeConversation()?.id === conversationId) {
          this._activeConversation.update(conv => {
            if (!conv) return conv;
            return {
              ...conv,
              settings: {
                ...conv.settings,
                isPinned: data.isPinned ?? conv.settings.isPinned,
                isMuted: data.isMuted ?? conv.settings.isMuted,
                isArchived: data.isArchived ?? conv.settings.isArchived,
                nickname: data.nickname !== undefined ? data.nickname : conv.settings.nickname,
              },
            };
          });
        }
      }),
      catchError(error => {
        this._error.set('Failed to update settings');
        throw error;
      })
    );
  }

  // ============================================================
  // Messages
  // ============================================================

  getMessages(conversationId: number, page = 1, limit = 50): Observable<PaginatedResponse<Message>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    this._loading.set(true);
    return this.http.get<PaginatedResponse<Message>>(`${this.baseUrl}/conversations/${conversationId}/messages`, { params }).pipe(
      tap(response => {
        if (page === 1) {
          this._messages.set(response.items);
        } else {
          // Append older messages
          this._messages.update(msgs => [...msgs, ...response.items]);
        }
        this._loading.set(false);
        this._isOfflineMode.set(false);

        // Cache messages for offline use
        this.offlineStorage.cacheMessages(response.items).catch(err =>
          console.error('[ChatService] Failed to cache messages:', err)
        );

        // Load pending messages for this conversation
        this.loadPendingMessages(conversationId);
      }),
      catchError(error => {
        this._loading.set(false);

        // Try to load from cache if offline
        if (!navigator.onLine) {
          this._isOfflineMode.set(true);
          return from(this.loadCachedMessages(conversationId));
        }

        this._error.set('Failed to get messages');
        throw error;
      })
    );
  }

  private async loadCachedMessages(conversationId: number): Promise<PaginatedResponse<Message>> {
    const cached = await this.offlineStorage.getCachedMessages(conversationId);
    this._messages.set(cached);

    // Also load pending messages
    await this.loadPendingMessages(conversationId);

    return {
      items: cached,
      total: cached.length,
      page: 1,
      limit: cached.length,
      totalPages: 1,
    };
  }

  private async loadPendingMessages(conversationId: number): Promise<void> {
    const pending = await this.offlineStorage.getPendingMessagesForConversation(conversationId);
    this._pendingMessages.set(pending);
  }

  sendMessage(data: SendMessageDTO): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/messages`, data).pipe(
      tap(message => {
        // Add message to end (chronological order - oldest first)
        // Check for duplicates to prevent double-add from HTTP response + socket event
        this._messages.update(msgs => {
          if (msgs.some(m => m.id === message.id)) {
            return msgs; // Already exists, don't add duplicate
          }
          return [...msgs, message];
        });
        // Update conversation preview
        this._conversations.update(convs =>
          convs.map(c => {
            if (c.id === message.conversationId) {
              return {
                ...c,
                lastMessage: message.content,
                lastMessageType: message.messageType,
                lastMessageAt: message.createdAt,
                lastMessageSenderId: message.senderId,
              };
            }
            return c;
          })
        );
      }),
      catchError(error => {
        this._error.set('Failed to send message');
        throw error;
      })
    );
  }

  markMessagesRead(conversationId: number, data: MarkMessagesReadDTO): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/messages/read`, data).pipe(
      tap(() => {
        // Update message read status
        this._messages.update(msgs =>
          msgs.map(m => {
            if (data.messageIds.includes(m.id)) {
              return { ...m, isRead: true, readAt: new Date().toISOString() };
            }
            return m;
          })
        );
        // Update unread count
        this._conversations.update(convs =>
          convs.map(c => {
            if (c.id === conversationId) {
              return { ...c, unreadCount: Math.max(0, c.unreadCount - data.messageIds.length) };
            }
            return c;
          })
        );
      }),
      catchError(error => {
        console.error('Failed to mark messages as read:', error);
        return of(undefined);
      })
    );
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/messages/${messageId}`).pipe(
      tap(() => {
        this._messages.update(msgs =>
          msgs.map(m => {
            if (m.id === messageId) {
              return { ...m, isDeleted: true };
            }
            return m;
          })
        );
      }),
      catchError(error => {
        this._error.set('Failed to delete message');
        throw error;
      })
    );
  }

  searchMessages(query: string, conversationId?: number, page = 1, limit = 20): Observable<PaginatedResponse<Message>> {
    let params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (conversationId) {
      params = params.set('conversationId', conversationId.toString());
    }

    return this.http.get<PaginatedResponse<Message>>(`${this.baseUrl}/search/messages`, { params });
  }

  shareContent(data: ShareContentDTO): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/share`, data).pipe(
      tap(message => {
        // Add message to current conversation if it's the active one
        if (this._activeConversation()?.id === message.conversationId) {
          this._messages.update(msgs => {
            if (msgs.some(m => m.id === message.id)) {
              return msgs;
            }
            return [...msgs, message];
          });
        }
        // Update conversation preview
        this._conversations.update(convs =>
          convs.map(c => {
            if (c.id === message.conversationId) {
              return {
                ...c,
                lastMessage: message.content,
                lastMessageType: message.messageType,
                lastMessageAt: message.createdAt,
                lastMessageSenderId: message.senderId,
              };
            }
            return c;
          })
        );
      }),
      catchError(error => {
        this._error.set('Failed to share content');
        throw error;
      })
    );
  }

  // ============================================================
  // Conversation Sharing (Learning Conversations)
  // ============================================================

  shareConversation(
    conversationId: number,
    recipientIds: number[],
    message?: string
  ): Observable<{ messages: Message[]; count: number }> {
    return this.http.post<{ messages: Message[]; count: number }>(
      `${this.baseUrl}/share-conversation`,
      { conversationId, recipientIds, message }
    ).pipe(
      tap(result => {
        // Update conversation previews for each message
        for (const msg of result.messages) {
          this._conversations.update(convs =>
            convs.map(c => {
              if (c.id === msg.conversationId) {
                return {
                  ...c,
                  lastMessage: msg.content,
                  lastMessageType: msg.messageType,
                  lastMessageAt: msg.createdAt,
                  lastMessageSenderId: msg.senderId,
                };
              }
              return c;
            })
          );
        }
      }),
      catchError(error => {
        this._error.set('Failed to share conversation');
        throw error;
      })
    );
  }

  getSharedPreview(messageId: number): Observable<SharedPreview> {
    return this.http.get<SharedPreview>(`${this.baseUrl}/shared/${messageId}/preview`).pipe(
      catchError(error => {
        this._error.set('Failed to get shared preview');
        throw error;
      })
    );
  }

  importSharedConversation(
    messageId: number,
    options: ImportOptions
  ): Observable<ImportResult> {
    return this.http.post<ImportResult>(
      `${this.baseUrl}/import-shared/${messageId}`,
      options
    ).pipe(
      catchError(error => {
        this._error.set('Failed to import conversation');
        throw error;
      })
    );
  }

  getImportStatus(messageId: number): Observable<ImportStatus> {
    return this.http.get<ImportStatus>(`${this.baseUrl}/shared/${messageId}/import-status`).pipe(
      catchError(error => {
        console.error('Failed to get import status:', error);
        return of({ imported: false });
      })
    );
  }

  // ============================================================
  // Blocking
  // ============================================================

  getBlockedUsers(): Observable<BlockedUser[]> {
    return this.http.get<BlockedUser[]>(`${this.baseUrl}/blocks`).pipe(
      tap(users => this._blockedUsers.set(users)),
      catchError(error => {
        this._error.set('Failed to get blocked users');
        throw error;
      })
    );
  }

  blockUser(userId: number, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/blocks`, { userId, reason }).pipe(
      tap(() => {
        // Remove conversations with blocked user from list
        this._conversations.update(convs =>
          convs.filter(c => c.otherUser.id !== userId)
        );
      }),
      catchError(error => {
        this._error.set('Failed to block user');
        throw error;
      })
    );
  }

  unblockUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/blocks/${userId}`).pipe(
      tap(() => {
        this._blockedUsers.update(users => users.filter(u => u.userId !== userId));
      }),
      catchError(error => {
        this._error.set('Failed to unblock user');
        throw error;
      })
    );
  }

  isUserBlocked(userId: number): boolean {
    return this._blockedUsers().some(u => u.userId === userId);
  }

  // ============================================================
  // State Management Helpers
  // ============================================================

  addReceivedMessage(message: Message): void {
    // Check if message is for active conversation
    if (this._activeConversation()?.id === message.conversationId) {
      // Add message to end (chronological order - oldest first)
      // Check for duplicates to prevent double-add from multiple socket events
      this._messages.update(msgs => {
        if (msgs.some(m => m.id === message.id)) {
          return msgs; // Already exists, don't add duplicate
        }
        return [...msgs, message];
      });
    }

    // Update conversation preview (only if message is new)
    this._conversations.update(convs => {
      const existing = convs.find(c => c.id === message.conversationId);
      if (existing) {
        // Check if this message is already reflected in lastMessage (prevent duplicate unread count)
        if (existing.lastMessageAt === message.createdAt && existing.lastMessage === message.content) {
          return convs; // Already updated, skip
        }
        return convs.map(c => {
          if (c.id === message.conversationId) {
            return {
              ...c,
              lastMessage: message.content,
              lastMessageType: message.messageType,
              lastMessageAt: message.createdAt,
              lastMessageSenderId: message.senderId,
              unreadCount: c.unreadCount + 1,
            };
          }
          return c;
        });
      }
      // New conversation, need to reload
      return convs;
    });
  }

  updateConversationOnlineStatus(userId: number, isOnline: boolean, statusType?: StatusType): void {
    this._conversations.update(convs =>
      convs.map(c => {
        if (c.otherUser.id === userId) {
          return {
            ...c,
            isOnline,
            statusType: isOnline ? (statusType ?? c.statusType ?? 'online') : 'offline',
          };
        }
        return c;
      })
    );
  }

  // Sync all online users with conversations (called when socket connects)
  syncOnlineUsersWithConversations(onlineUsers: UserStatusInfo[]): void {
    const onlineUserMap = new Map(onlineUsers.map(u => [u.userId, u]));

    this._conversations.update(convs =>
      convs.map(c => {
        const onlineUser = onlineUserMap.get(c.otherUser.id);
        if (onlineUser) {
          return {
            ...c,
            isOnline: true,
            statusType: onlineUser.statusType,
          };
        }
        // User not in online list = offline
        return {
          ...c,
          isOnline: false,
          statusType: 'offline' as StatusType,
        };
      })
    );
  }

  clearMessages(): void {
    this._messages.set([]);
    this._pendingMessages.set([]);
  }

  clearActiveConversation(): void {
    this._activeConversation.set(null);
    this._messages.set([]);
    this._pendingMessages.set([]);
  }

  clearError(): void {
    this._error.set(null);
  }

  // ============================================================
  // Gift Status Update
  // ============================================================

  updateGiftStatusInMessages(giftId: number, status: string, claimedAt?: string): void {
    this._messages.update(msgs =>
      msgs.map(m => {
        // Check if this is a gift message with matching giftId
        if (m.messageType === 'gift' && m.metadata?.['giftId'] === giftId) {
          return {
            ...m,
            metadata: {
              ...m.metadata,
              status,
              claimedAt: claimedAt ?? m.metadata['claimedAt'],
            },
          };
        }
        return m;
      })
    );
  }

  // ============================================================
  // Offline Support
  // ============================================================

  async initOfflineStorage(): Promise<void> {
    await this.offlineStorage.init();
  }

  removePendingMessage(tempId: string): void {
    this._pendingMessages.update(msgs => msgs.filter(m => m.tempId !== tempId));
  }

  async clearOfflineData(): Promise<void> {
    await this.offlineStorage.clearAllData();
    this._pendingMessages.set([]);
    this._isOfflineMode.set(false);
  }

  async getOfflineStorageStats(): Promise<{ messages: number; conversations: number; pending: number }> {
    return this.offlineStorage.getStorageStats();
  }
}
