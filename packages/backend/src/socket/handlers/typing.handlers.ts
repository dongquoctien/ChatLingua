import { Server as SocketIOServer } from 'socket.io';
import { chatService } from '../../services/chat.service.js';
import type { AuthenticatedSocket } from '../index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../../types/chat.types.js';

// Track typing timeouts to auto-clear typing status
const typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
const TYPING_TIMEOUT_MS = 3000; // 3 seconds

export function registerTypingHandlers(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: AuthenticatedSocket
): void {
  // ============================================================
  // Typing Start
  // ============================================================
  socket.on('typing:start', async (data) => {
    try {
      const { conversationId } = data;

      // Get recipient
      const recipientId = await chatService.getOtherParticipant(conversationId, socket.userId);

      if (!recipientId) {
        return;
      }

      // Clear existing timeout for this user/conversation
      const timeoutKey = `${socket.userId}:${conversationId}`;
      const existingTimeout = typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Notify recipient
      io.to(`user:${recipientId}`).emit('typing:started', {
        conversationId,
        userId: socket.userId,
      });

      // Set auto-clear timeout
      const timeout = setTimeout(() => {
        io.to(`user:${recipientId}`).emit('typing:stopped', {
          conversationId,
          userId: socket.userId,
        });
        typingTimeouts.delete(timeoutKey);
      }, TYPING_TIMEOUT_MS);

      typingTimeouts.set(timeoutKey, timeout);

    } catch (error) {
      console.error('[Typing] Error handling typing start:', error);
    }
  });

  // ============================================================
  // Typing Stop
  // ============================================================
  socket.on('typing:stop', async (data) => {
    try {
      const { conversationId } = data;

      // Get recipient
      const recipientId = await chatService.getOtherParticipant(conversationId, socket.userId);

      if (!recipientId) {
        return;
      }

      // Clear timeout
      const timeoutKey = `${socket.userId}:${conversationId}`;
      const existingTimeout = typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeouts.delete(timeoutKey);
      }

      // Notify recipient
      io.to(`user:${recipientId}`).emit('typing:stopped', {
        conversationId,
        userId: socket.userId,
      });

    } catch (error) {
      console.error('[Typing] Error handling typing stop:', error);
    }
  });

  // ============================================================
  // Cleanup on Disconnect
  // ============================================================
  socket.on('disconnect', () => {
    // Clear all typing timeouts for this user
    for (const [key, timeout] of typingTimeouts.entries()) {
      if (key.startsWith(`${socket.userId}:`)) {
        clearTimeout(timeout);
        typingTimeouts.delete(key);
      }
    }
  });
}
