import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { OfflineStorageService, PendingMessage } from './offline-storage.service';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Message,
  UserStatusInfo,
  StatusType,
  ActivityType,
  AllowMessagesFrom,
  ShareContentDTO,
} from '../chat.types';

// Pet notification type from backend pet-scheduler
export interface PetNotification {
  userId: number;
  petId: number;
  petName: string;
  type: 'hunger_high' | 'happiness_low' | 'hp_low' | 'dying' | 'died';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private authService = inject(AuthService);
  private offlineStorage = inject(OfflineStorageService);
  private socket: TypedSocket | null = null;

  // Reference count for components using the socket
  // Only disconnect when count reaches 0
  private connectionRefCount = 0;

  // Connection state
  private _isConnected = signal(false);
  private _connectionError = signal<string | null>(null);
  private _isBrowserOnline = signal(navigator.onLine);

  // Online users
  private _onlineUsers = signal<UserStatusInfo[]>([]);

  // Typing indicators (conversationId -> userId[])
  private _typingUsers = signal<Map<number, Set<number>>>(new Map());

  // Message queue callbacks (for notifying when messages are queued/sent)
  private messageQueuedCallbacks: ((message: PendingMessage) => void)[] = [];
  private messageSentFromQueueCallbacks: ((tempId: string, message: Message) => void)[] = [];

  // Public signals
  readonly isConnected = this._isConnected.asReadonly();
  readonly connectionError = this._connectionError.asReadonly();
  readonly isBrowserOnline = this._isBrowserOnline.asReadonly();
  readonly onlineUsers = this._onlineUsers.asReadonly();
  readonly typingUsers = this._typingUsers.asReadonly();

  // Computed
  readonly onlineCount = computed(() => this._onlineUsers().length);
  readonly canSendMessages = computed(() => this._isConnected() && this._isBrowserOnline());

  constructor() {
    // Listen for browser online/offline events
    window.addEventListener('online', () => {
      this._isBrowserOnline.set(true);
      console.log('[Socket] Browser is online');
    });

    window.addEventListener('offline', () => {
      this._isBrowserOnline.set(false);
      console.log('[Socket] Browser is offline');
    });
  }

  // Event callbacks
  private messageCallbacks: ((message: Message) => void)[] = [];
  private messageReadCallbacks: ((data: { conversationId: number; messageIds: number[]; readBy: number; readAt: string }) => void)[] = [];
  private messageDeletedCallbacks: ((data: { messageId: number; conversationId: number }) => void)[] = [];
  private userOnlineCallbacks: ((data: { userId: number; status: StatusType | string }) => void)[] = [];
  private userOfflineCallbacks: ((data: { userId: number; lastSeen: string }) => void)[] = [];
  private statusChangedCallbacks: ((data: { userId: number; status: StatusType; statusText?: string }) => void)[] = [];
  private activityChangedCallbacks: ((data: { userId: number; activity: ActivityType; metadata?: Record<string, unknown> }) => void)[] = [];
  private onlineUsersListCallbacks: ((users: UserStatusInfo[]) => void)[] = [];

  // Pet event callbacks
  private petStateCallbacks: ((data: { pet: unknown; state: unknown }) => void)[] = [];
  private petNotificationCallbacks: ((data: { notifications: PetNotification[] }) => void)[] = [];
  private petDiedCallbacks: ((data: { petId: number; petName: string }) => void)[] = [];
  private petNeedsAttentionCallbacks: ((data: { message: string }) => void)[] = [];

  connect(): void {
    // Increment reference count
    this.connectionRefCount++;
    console.log(`[Socket] connect() called, refCount: ${this.connectionRefCount}`);

    if (this.socket?.connected) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this._connectionError.set('No authentication token');
      return;
    }

    const baseUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(baseUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    }) as TypedSocket;

    this.setupEventListeners();
  }

  disconnect(): void {
    // Decrement reference count
    this.connectionRefCount--;
    console.log(`[Socket] disconnect() called, refCount: ${this.connectionRefCount}`);

    // Only actually disconnect when no components are using the socket
    if (this.connectionRefCount <= 0) {
      this.connectionRefCount = 0; // Prevent negative count
      if (this.socket) {
        console.log('[Socket] Actually disconnecting socket (refCount is 0)');
        this.socket.disconnect();
        this.socket = null;
        this._isConnected.set(false);
        this._onlineUsers.set([]);
        this._typingUsers.set(new Map());
      }
    }
  }

  /**
   * Force disconnect regardless of reference count.
   * Use this on logout to ensure socket is closed.
   */
  forceDisconnect(): void {
    console.log('[Socket] forceDisconnect() called');
    this.connectionRefCount = 0;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._isConnected.set(false);
      this._onlineUsers.set([]);
      this._typingUsers.set(new Map());
    }
  }

  ngOnDestroy(): void {
    this.forceDisconnect();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this._isConnected.set(true);
      this._connectionError.set(null);
      this.requestOnlineUsers();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this._isConnected.set(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this._connectionError.set(error.message);
      this._isConnected.set(false);
    });

    // Message events
    this.socket.on('message:new', (message) => {
      this.messageCallbacks.forEach(cb => cb(message));
    });

    this.socket.on('message:sent', (message) => {
      this.messageCallbacks.forEach(cb => cb(message));
    });

    this.socket.on('message:read', (data) => {
      this.messageReadCallbacks.forEach(cb => cb(data));
    });

    this.socket.on('message:deleted', (data) => {
      this.messageDeletedCallbacks.forEach(cb => cb(data));
    });

    // Typing events
    this.socket.on('typing:started', (data) => {
      this.addTypingUser(data.conversationId, data.userId);
    });

    this.socket.on('typing:stopped', (data) => {
      this.removeTypingUser(data.conversationId, data.userId);
    });

    // Status events
    this.socket.on('user:online', (data) => {
      this.userOnlineCallbacks.forEach(cb => cb(data));
      this.updateUserOnlineStatus(data.userId, true, data.status as StatusType);
    });

    this.socket.on('user:offline', (data) => {
      this.userOfflineCallbacks.forEach(cb => cb(data));
      this.updateUserOnlineStatus(data.userId, false, 'offline');
    });

    this.socket.on('user:status_changed', (data) => {
      this.statusChangedCallbacks.forEach(cb => cb(data));
      this.updateUserStatus(data.userId, data.status, data.statusText);
    });

    this.socket.on('user:activity_changed', (data) => {
      this.activityChangedCallbacks.forEach(cb => cb(data));
      this.updateUserActivity(data.userId, data.activity, data.metadata);
    });

    this.socket.on('users:online:list', (users) => {
      this._onlineUsers.set(users);
      this.onlineUsersListCallbacks.forEach(cb => cb(users));
    });

    // Pet events (using 'as any' since these are custom events not in TypedSocket)
    (this.socket as any).on('pet:state', (data: { pet: unknown; state: unknown }) => {
      this.petStateCallbacks.forEach(cb => cb(data));
    });

    (this.socket as any).on('pet:notifications', (data: { notifications: PetNotification[] }) => {
      this.petNotificationCallbacks.forEach(cb => cb(data));
    });

    (this.socket as any).on('pet:died', (data: { petId: number; petName: string }) => {
      this.petDiedCallbacks.forEach(cb => cb(data));
    });

    (this.socket as any).on('pet:needs_attention', (data: { message: string }) => {
      this.petNeedsAttentionCallbacks.forEach(cb => cb(data));
    });
  }

  // ============================================================
  // Message Actions
  // ============================================================

  /**
   * Send a message via socket. If offline or disconnected, queues the message for later.
   * @returns The pending message if queued, undefined if sent via socket
   */
  async sendMessage(data: {
    conversationId?: number;
    recipientId?: number;
    messageType: 'text' | 'achievement' | 'exercise' | 'game' | 'vocabulary' | 'image' | 'link';
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<PendingMessage | undefined> {
    // If connected, send via socket
    if (this.canSendMessages() && this.socket) {
      this.socket.emit('message:send', data);
      return undefined;
    }

    // Otherwise, queue for later
    console.log('[Socket] Offline or disconnected, queuing message');
    const pendingMessage = await this.offlineStorage.queueMessage(data);

    // Notify listeners (only if message was queued successfully)
    if (pendingMessage) {
      this.messageQueuedCallbacks.forEach(cb => cb(pendingMessage));
    }

    return pendingMessage ?? undefined;
  }

  /**
   * Send a message directly via socket (no queuing).
   * Use this when you're sure the socket is connected.
   */
  sendMessageDirect(data: {
    conversationId?: number;
    recipientId?: number;
    messageType: 'text' | 'achievement' | 'exercise' | 'game' | 'vocabulary' | 'image' | 'link';
    content: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.socket?.emit('message:send', data);
  }

  markMessagesRead(conversationId: number, messageIds: number[]): void {
    this.socket?.emit('message:read', { conversationId, messageIds });
  }

  deleteMessage(messageId: number): void {
    this.socket?.emit('message:delete', { messageId });
  }

  // ============================================================
  // Typing Actions
  // ============================================================

  startTyping(conversationId: number): void {
    this.socket?.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId: number): void {
    this.socket?.emit('typing:stop', { conversationId });
  }

  isUserTyping(conversationId: number, userId: number): boolean {
    const typingMap = this._typingUsers();
    const users = typingMap.get(conversationId);
    return users?.has(userId) ?? false;
  }

  getTypingUsersForConversation(conversationId: number): number[] {
    const typingMap = this._typingUsers();
    const users = typingMap.get(conversationId);
    return users ? Array.from(users) : [];
  }

  // ============================================================
  // Status Actions
  // ============================================================

  updateStatus(statusType?: StatusType, statusText?: string): void {
    this.socket?.emit('status:update', { statusType, statusText });
  }

  updateActivity(activity: ActivityType, metadata?: Record<string, unknown>): void {
    this.socket?.emit('activity:update', { activity, metadata });
  }

  updatePrivacy(showOnlineStatus?: boolean, allowMessagesFrom?: AllowMessagesFrom): void {
    this.socket?.emit('privacy:update', { showOnlineStatus, allowMessagesFrom });
  }

  requestOnlineUsers(): void {
    this.socket?.emit('users:online');
  }

  // ============================================================
  // Sharing Actions
  // ============================================================

  shareContent(data: ShareContentDTO): void {
    this.socket?.emit('share:content', data);
  }

  // ============================================================
  // Event Subscriptions
  // ============================================================

  onMessage(callback: (message: Message) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageRead(callback: (data: { conversationId: number; messageIds: number[]; readBy: number; readAt: string }) => void): () => void {
    this.messageReadCallbacks.push(callback);
    return () => {
      this.messageReadCallbacks = this.messageReadCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageDeleted(callback: (data: { messageId: number; conversationId: number }) => void): () => void {
    this.messageDeletedCallbacks.push(callback);
    return () => {
      this.messageDeletedCallbacks = this.messageDeletedCallbacks.filter(cb => cb !== callback);
    };
  }

  onUserOnline(callback: (data: { userId: number; status: StatusType | string }) => void): () => void {
    this.userOnlineCallbacks.push(callback);
    return () => {
      this.userOnlineCallbacks = this.userOnlineCallbacks.filter(cb => cb !== callback);
    };
  }

  onUserOffline(callback: (data: { userId: number; lastSeen: string }) => void): () => void {
    this.userOfflineCallbacks.push(callback);
    return () => {
      this.userOfflineCallbacks = this.userOfflineCallbacks.filter(cb => cb !== callback);
    };
  }

  onStatusChanged(callback: (data: { userId: number; status: StatusType; statusText?: string }) => void): () => void {
    this.statusChangedCallbacks.push(callback);
    return () => {
      this.statusChangedCallbacks = this.statusChangedCallbacks.filter(cb => cb !== callback);
    };
  }

  onActivityChanged(callback: (data: { userId: number; activity: ActivityType; metadata?: Record<string, unknown> }) => void): () => void {
    this.activityChangedCallbacks.push(callback);
    return () => {
      this.activityChangedCallbacks = this.activityChangedCallbacks.filter(cb => cb !== callback);
    };
  }

  onOnlineUsersList(callback: (users: UserStatusInfo[]) => void): () => void {
    this.onlineUsersListCallbacks.push(callback);
    return () => {
      this.onlineUsersListCallbacks = this.onlineUsersListCallbacks.filter(cb => cb !== callback);
    };
  }

  // ============================================================
  // Pet Event Subscriptions
  // ============================================================

  onPetState(callback: (data: { pet: unknown; state: unknown }) => void): () => void {
    this.petStateCallbacks.push(callback);
    return () => {
      this.petStateCallbacks = this.petStateCallbacks.filter(cb => cb !== callback);
    };
  }

  onPetNotifications(callback: (data: { notifications: PetNotification[] }) => void): () => void {
    this.petNotificationCallbacks.push(callback);
    return () => {
      this.petNotificationCallbacks = this.petNotificationCallbacks.filter(cb => cb !== callback);
    };
  }

  onPetDied(callback: (data: { petId: number; petName: string }) => void): () => void {
    this.petDiedCallbacks.push(callback);
    return () => {
      this.petDiedCallbacks = this.petDiedCallbacks.filter(cb => cb !== callback);
    };
  }

  onPetNeedsAttention(callback: (data: { message: string }) => void): () => void {
    this.petNeedsAttentionCallbacks.push(callback);
    return () => {
      this.petNeedsAttentionCallbacks = this.petNeedsAttentionCallbacks.filter(cb => cb !== callback);
    };
  }

  // ============================================================
  // Offline Queue Subscriptions
  // ============================================================

  onMessageQueued(callback: (message: PendingMessage) => void): () => void {
    this.messageQueuedCallbacks.push(callback);
    return () => {
      this.messageQueuedCallbacks = this.messageQueuedCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageSentFromQueue(callback: (tempId: string, message: Message) => void): () => void {
    this.messageSentFromQueueCallbacks.push(callback);
    return () => {
      this.messageSentFromQueueCallbacks = this.messageSentFromQueueCallbacks.filter(cb => cb !== callback);
    };
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private addTypingUser(conversationId: number, userId: number): void {
    this._typingUsers.update(map => {
      const newMap = new Map(map);
      const users = newMap.get(conversationId) ?? new Set();
      users.add(userId);
      newMap.set(conversationId, users);
      return newMap;
    });
  }

  private removeTypingUser(conversationId: number, userId: number): void {
    this._typingUsers.update(map => {
      const newMap = new Map(map);
      const users = newMap.get(conversationId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) {
          newMap.delete(conversationId);
        } else {
          newMap.set(conversationId, users);
        }
      }
      return newMap;
    });
  }

  private updateUserOnlineStatus(userId: number, isOnline: boolean, statusType: StatusType): void {
    this._onlineUsers.update(users => {
      if (isOnline) {
        // Check if user already in list
        const existing = users.find(u => u.userId === userId);
        if (existing) {
          return users.map(u =>
            u.userId === userId ? { ...u, isOnline: true, statusType } : u
          );
        }
        // User will be added when we get full status info
        return users;
      } else {
        // Remove user from online list
        return users.filter(u => u.userId !== userId);
      }
    });
  }

  private updateUserStatus(userId: number, status: StatusType, statusText?: string): void {
    this._onlineUsers.update(users =>
      users.map(u =>
        u.userId === userId
          ? { ...u, statusType: status, statusText: statusText ?? null }
          : u
      )
    );
  }

  private updateUserActivity(userId: number, activity: ActivityType, metadata?: Record<string, unknown>): void {
    this._onlineUsers.update(users =>
      users.map(u =>
        u.userId === userId
          ? { ...u, currentActivity: activity, activityMetadata: metadata ?? null }
          : u
      )
    );
  }
}
