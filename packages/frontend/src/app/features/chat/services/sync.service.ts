import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfflineStorageService, PendingMessage } from './offline-storage.service';
import { SocketService } from './socket.service';
import { ChatService } from './chat.service';
import { environment } from '../../../../environments/environment';
import type { Message } from '../chat.types';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
}

const MAX_RETRIES = 5;
const SYNC_INTERVAL = 30000; // 30 seconds

@Injectable({
  providedIn: 'root',
})
export class ChatSyncService implements OnDestroy {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private socketService = inject(SocketService);
  private chatService = inject(ChatService);

  private baseUrl = `${environment.apiUrl}/chat`;

  // State
  private _syncStatus = signal<SyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    failedCount: 0,
  });

  private _isOnline = signal(navigator.onLine);

  // Public signals
  readonly syncStatus = this._syncStatus.asReadonly();
  readonly isOnline = this._isOnline.asReadonly();
  readonly pendingCount = this.offlineStorage.pendingCount;

  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private onlineHandler = () => this.handleOnline();
  private offlineHandler = () => this.handleOffline();

  constructor() {
    // Listen for browser online/offline events
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // React to socket connection changes
    effect(() => {
      const connected = this.socketService.isConnected();
      if (connected && this._isOnline()) {
        // Socket reconnected while online - sync pending messages
        this.syncPendingMessages();
      }
    });

    // Initialize offline storage
    this.init();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    this.stopPeriodicSync();
  }

  // ============================================================
  // Initialization
  // ============================================================

  private async init(): Promise<void> {
    try {
      await this.offlineStorage.init();
      console.log('[ChatSync] Initialized');

      // If already online and socket connected, sync immediately
      if (this._isOnline() && this.socketService.isConnected()) {
        this.syncPendingMessages();
      }

      // Start periodic sync check
      this.startPeriodicSync();
    } catch (error) {
      console.error('[ChatSync] Failed to initialize:', error);
    }
  }

  // ============================================================
  // Online/Offline Handlers
  // ============================================================

  private handleOnline(): void {
    console.log('[ChatSync] Browser is online');
    this._isOnline.set(true);

    // Try to sync pending messages
    this.syncPendingMessages();

    // Start periodic sync
    this.startPeriodicSync();
  }

  private handleOffline(): void {
    console.log('[ChatSync] Browser is offline');
    this._isOnline.set(false);

    // Stop periodic sync
    this.stopPeriodicSync();
  }

  // ============================================================
  // Message Queueing (for offline use)
  // ============================================================

  async queueMessageForSending(message: {
    conversationId?: number;
    recipientId?: number;
    messageType: 'text' | 'achievement' | 'exercise' | 'game' | 'vocabulary' | 'image' | 'link';
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<PendingMessage> {
    const pendingMessage = await this.offlineStorage.queueMessage(message);

    if (!pendingMessage) {
      throw new Error('Failed to queue message for sending');
    }

    // Update sync status
    this._syncStatus.update(s => ({
      ...s,
      pendingCount: s.pendingCount + 1,
    }));

    console.log('[ChatSync] Message queued:', pendingMessage.tempId);

    // If online and connected, try to send immediately
    if (this._isOnline() && this.socketService.isConnected()) {
      this.syncPendingMessages();
    }

    return pendingMessage;
  }

  // ============================================================
  // Sync Logic
  // ============================================================

  async syncPendingMessages(): Promise<void> {
    if (this._syncStatus().isSyncing) {
      console.log('[ChatSync] Already syncing, skipping');
      return;
    }

    if (!this._isOnline()) {
      console.log('[ChatSync] Offline, skipping sync');
      return;
    }

    const pending = await this.offlineStorage.getPendingMessages();
    if (pending.length === 0) {
      console.log('[ChatSync] No pending messages to sync');
      return;
    }

    console.log(`[ChatSync] Syncing ${pending.length} pending messages`);
    this._syncStatus.update(s => ({ ...s, isSyncing: true }));

    let successCount = 0;
    let failedCount = 0;

    for (const message of pending) {
      try {
        // Send via REST API (more reliable than socket for sync)
        const sentMessage = await this.sendMessageViaApi(message);

        // Remove from pending queue
        await this.offlineStorage.removePendingMessage(message.tempId);

        // Update chat service with the sent message
        this.chatService.addReceivedMessage(sentMessage);

        successCount++;
        console.log(`[ChatSync] Message sent: ${message.tempId}`);
      } catch (error) {
        console.error(`[ChatSync] Failed to send message ${message.tempId}:`, error);

        // Increment retry count
        await this.offlineStorage.incrementRetryCount(message.tempId);

        // Check if max retries exceeded
        if (message.retryCount + 1 >= MAX_RETRIES) {
          console.warn(`[ChatSync] Message ${message.tempId} exceeded max retries, will be removed`);
          failedCount++;
        }
      }
    }

    // Clean up failed messages
    const removed = await this.offlineStorage.clearFailedMessages(MAX_RETRIES);
    if (removed > 0) {
      console.log(`[ChatSync] Removed ${removed} failed messages`);
    }

    // Update sync status
    const remainingPending = await this.offlineStorage.getPendingMessages();
    this._syncStatus.set({
      isSyncing: false,
      lastSyncAt: new Date().toISOString(),
      pendingCount: remainingPending.length,
      failedCount,
    });

    console.log(`[ChatSync] Sync complete: ${successCount} sent, ${failedCount} failed, ${remainingPending.length} remaining`);
  }

  private async sendMessageViaApi(message: PendingMessage): Promise<Message> {
    return new Promise<Message>((resolve, reject) => {
      this.http.post<Message>(`${this.baseUrl}/messages`, {
        conversationId: message.conversationId,
        recipientId: message.recipientId,
        messageType: message.messageType,
        content: message.content,
        metadata: message.metadata,
      }).subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error),
      });
    });
  }

  // ============================================================
  // Periodic Sync
  // ============================================================

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      return; // Already running
    }

    this.syncInterval = setInterval(() => {
      if (this._isOnline() && this.socketService.isConnected()) {
        this.syncPendingMessages();
      }
    }, SYNC_INTERVAL);

    console.log('[ChatSync] Started periodic sync');
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[ChatSync] Stopped periodic sync');
    }
  }

  // ============================================================
  // Caching
  // ============================================================

  async cacheConversations(): Promise<void> {
    const conversations = this.chatService.conversations();
    if (conversations.length > 0) {
      await this.offlineStorage.cacheConversations(conversations);
      console.log(`[ChatSync] Cached ${conversations.length} conversations`);
    }
  }

  async cacheMessages(conversationId: number): Promise<void> {
    const messages = this.chatService.messages();
    if (messages.length > 0 && messages[0]?.conversationId === conversationId) {
      await this.offlineStorage.cacheMessages(messages);
      console.log(`[ChatSync] Cached ${messages.length} messages for conversation ${conversationId}`);
    }
  }

  async loadCachedConversations(): Promise<void> {
    if (!this._isOnline()) {
      const cached = await this.offlineStorage.getCachedConversations();
      if (cached.length > 0) {
        // Update chat service state from cache
        console.log(`[ChatSync] Loaded ${cached.length} cached conversations`);
      }
    }
  }

  async loadCachedMessages(conversationId: number): Promise<void> {
    if (!this._isOnline()) {
      const cached = await this.offlineStorage.getCachedMessages(conversationId);
      if (cached.length > 0) {
        console.log(`[ChatSync] Loaded ${cached.length} cached messages for conversation ${conversationId}`);
      }
    }
  }

  // ============================================================
  // Utility
  // ============================================================

  async clearAllOfflineData(): Promise<void> {
    await this.offlineStorage.clearAllData();
    this._syncStatus.set({
      isSyncing: false,
      lastSyncAt: null,
      pendingCount: 0,
      failedCount: 0,
    });
    console.log('[ChatSync] Cleared all offline data');
  }

  async getStorageStats(): Promise<{ messages: number; conversations: number; pending: number }> {
    return this.offlineStorage.getStorageStats();
  }
}
