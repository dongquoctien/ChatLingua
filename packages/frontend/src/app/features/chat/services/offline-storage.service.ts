import { Injectable, signal } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Message, ConversationPreview, MessageType } from '../chat.types';

// ============================================================
// IndexedDB Schema
// ============================================================

export interface PendingMessage {
  tempId: string;
  conversationId?: number;
  recipientId?: number;
  messageType: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface ChatDB extends DBSchema {
  messages: {
    key: number;
    value: Message;
    indexes: {
      'by-conversation': number;
      'by-created': string;
    };
  };
  conversations: {
    key: number;
    value: ConversationPreview;
  };
  pendingMessages: {
    key: string; // UUID tempId
    value: PendingMessage;
    indexes: {
      'by-created': string;
    };
  };
}

const DB_NAME = 'chatlingua-chat';
const DB_VERSION = 1;

@Injectable({
  providedIn: 'root',
})
export class OfflineStorageService {
  private db: IDBPDatabase<ChatDB> | null = null;
  private _isInitialized = signal(false);
  private _pendingCount = signal(0);

  readonly isInitialized = this._isInitialized.asReadonly();
  readonly pendingCount = this._pendingCount.asReadonly();

  // ============================================================
  // Initialization
  // ============================================================

  async init(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    try {
      this.db = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Messages store
          if (!db.objectStoreNames.contains('messages')) {
            const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
            messageStore.createIndex('by-conversation', 'conversationId');
            messageStore.createIndex('by-created', 'createdAt');
          }

          // Conversations store
          if (!db.objectStoreNames.contains('conversations')) {
            db.createObjectStore('conversations', { keyPath: 'id' });
          }

          // Pending messages (not yet sent)
          if (!db.objectStoreNames.contains('pendingMessages')) {
            const pendingStore = db.createObjectStore('pendingMessages', { keyPath: 'tempId' });
            pendingStore.createIndex('by-created', 'createdAt');
          }
        },
      });

      this._isInitialized.set(true);
      await this.updatePendingCount();
      console.log('[OfflineStorage] Initialized successfully');
    } catch (error) {
      console.error('[OfflineStorage] Failed to initialize:', error);
      throw error;
    }
  }

  private ensureInitialized(): boolean {
    if (!this.db) {
      console.warn('[OfflineStorage] Not initialized yet, skipping operation');
      return false;
    }
    return true;
  }

  private async ensureInitializedAsync(): Promise<boolean> {
    if (!this.db) {
      try {
        await this.init();
        return true;
      } catch (error) {
        console.error('[OfflineStorage] Auto-init failed:', error);
        return false;
      }
    }
    return true;
  }

  // ============================================================
  // Message Caching
  // ============================================================

  async cacheMessage(message: Message): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    await this.db!.put('messages', message);
  }

  async cacheMessages(messages: Message[]): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    const tx = this.db!.transaction('messages', 'readwrite');
    await Promise.all([
      ...messages.map(msg => tx.store.put(msg)),
      tx.done,
    ]);
  }

  async getCachedMessages(conversationId: number): Promise<Message[]> {
    if (!await this.ensureInitializedAsync()) return [];
    const messages = await this.db!.getAllFromIndex('messages', 'by-conversation', conversationId);
    // Sort by createdAt ascending (oldest first)
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getCachedMessage(messageId: number): Promise<Message | undefined> {
    if (!await this.ensureInitializedAsync()) return undefined;
    return this.db!.get('messages', messageId);
  }

  async deleteCachedMessage(messageId: number): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    await this.db!.delete('messages', messageId);
  }

  async clearMessagesForConversation(conversationId: number): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    const messages = await this.getCachedMessages(conversationId);
    const tx = this.db!.transaction('messages', 'readwrite');
    await Promise.all([
      ...messages.map(msg => tx.store.delete(msg.id)),
      tx.done,
    ]);
  }

  // ============================================================
  // Conversation Caching
  // ============================================================

  async cacheConversation(conversation: ConversationPreview): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    await this.db!.put('conversations', conversation);
  }

  async cacheConversations(conversations: ConversationPreview[]): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    const tx = this.db!.transaction('conversations', 'readwrite');
    await Promise.all([
      ...conversations.map(conv => tx.store.put(conv)),
      tx.done,
    ]);
  }

  async getCachedConversations(): Promise<ConversationPreview[]> {
    if (!await this.ensureInitializedAsync()) return [];
    return this.db!.getAll('conversations');
  }

  async getCachedConversation(conversationId: number): Promise<ConversationPreview | undefined> {
    if (!await this.ensureInitializedAsync()) return undefined;
    return this.db!.get('conversations', conversationId);
  }

  async deleteCachedConversation(conversationId: number): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    await this.db!.delete('conversations', conversationId);
  }

  // ============================================================
  // Pending Messages (Offline Queue)
  // ============================================================

  async queueMessage(message: Omit<PendingMessage, 'tempId' | 'createdAt' | 'retryCount'>): Promise<PendingMessage | null> {
    if (!await this.ensureInitializedAsync()) return null;

    const pendingMessage: PendingMessage = {
      ...message,
      tempId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await this.db!.put('pendingMessages', pendingMessage);
    await this.updatePendingCount();

    return pendingMessage;
  }

  async getPendingMessages(): Promise<PendingMessage[]> {
    if (!await this.ensureInitializedAsync()) return [];
    const messages = await this.db!.getAll('pendingMessages');
    // Sort by createdAt ascending (oldest first - FIFO)
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getPendingMessagesForConversation(conversationId: number): Promise<PendingMessage[]> {
    if (!await this.ensureInitializedAsync()) return [];
    const allPending = await this.getPendingMessages();
    return allPending.filter(msg => msg.conversationId === conversationId);
  }

  async removePendingMessage(tempId: string): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    await this.db!.delete('pendingMessages', tempId);
    await this.updatePendingCount();
  }

  async incrementRetryCount(tempId: string): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    const message = await this.db!.get('pendingMessages', tempId);
    if (message) {
      message.retryCount++;
      await this.db!.put('pendingMessages', message);
    }
  }

  async clearFailedMessages(maxRetries: number = 5): Promise<number> {
    if (!await this.ensureInitializedAsync()) return 0;
    const pending = await this.getPendingMessages();
    const failed = pending.filter(msg => msg.retryCount >= maxRetries);

    const tx = this.db!.transaction('pendingMessages', 'readwrite');
    await Promise.all([
      ...failed.map(msg => tx.store.delete(msg.tempId)),
      tx.done,
    ]);

    await this.updatePendingCount();
    return failed.length;
  }

  private async updatePendingCount(): Promise<void> {
    if (!this.db) return;
    const count = await this.db.count('pendingMessages');
    this._pendingCount.set(count);
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  async clearAllData(): Promise<void> {
    if (!await this.ensureInitializedAsync()) return;
    const tx1 = this.db!.transaction('messages', 'readwrite');
    await tx1.store.clear();
    await tx1.done;

    const tx2 = this.db!.transaction('conversations', 'readwrite');
    await tx2.store.clear();
    await tx2.done;

    const tx3 = this.db!.transaction('pendingMessages', 'readwrite');
    await tx3.store.clear();
    await tx3.done;

    this._pendingCount.set(0);
    console.log('[OfflineStorage] All data cleared');
  }

  async getStorageStats(): Promise<{ messages: number; conversations: number; pending: number }> {
    if (!await this.ensureInitializedAsync()) {
      return { messages: 0, conversations: 0, pending: 0 };
    }
    return {
      messages: await this.db!.count('messages'),
      conversations: await this.db!.count('conversations'),
      pending: await this.db!.count('pendingMessages'),
    };
  }
}
