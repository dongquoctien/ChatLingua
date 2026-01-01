import { Server as SocketIOServer } from 'socket.io';
import { chatService } from '../../services/chat.service.js';
import { statusService } from '../../services/status.service.js';
import type { AuthenticatedSocket } from '../index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  MessageType,
  SharedContentType,
} from '../../types/chat.types.js';

export function registerChatHandlers(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: AuthenticatedSocket
): void {
  // ============================================================
  // Send Message
  // ============================================================
  socket.on('message:send', async (data) => {
    try {
      const { conversationId, recipientId, messageType, content, metadata } = data;

      // Validate content
      if (!content || content.trim().length === 0) {
        socket.emit('message:error', { error: 'Message content cannot be empty' });
        return;
      }

      // Get or create conversation
      let targetConversationId = conversationId;
      let targetRecipientId = recipientId;

      if (!targetConversationId && targetRecipientId) {
        // Check if blocked
        const isBlocked = await chatService.isBlocked(socket.userId, targetRecipientId);
        if (isBlocked) {
          socket.emit('message:error', { error: 'Cannot send message to this user' });
          return;
        }

        // Check messaging permissions
        const canMessage = await statusService.canSendMessage(socket.userId, targetRecipientId);
        if (!canMessage) {
          socket.emit('message:error', { error: 'User does not accept messages' });
          return;
        }

        const conversation = await chatService.getOrCreateConversation(socket.userId, targetRecipientId);
        targetConversationId = conversation.id;
      }

      if (!targetConversationId) {
        socket.emit('message:error', { error: 'conversationId or recipientId is required' });
        return;
      }

      // Get recipient ID if not already known
      if (!targetRecipientId) {
        targetRecipientId = await chatService.getOtherParticipant(targetConversationId, socket.userId);
      }

      // Create message
      const message = await chatService.createMessage({
        conversationId: targetConversationId,
        senderId: socket.userId,
        messageType: messageType as MessageType,
        content,
        metadata,
      });

      // Send confirmation to sender
      socket.emit('message:sent', message);

      // Send to recipient (if online)
      io.to(`user:${targetRecipientId}`).emit('message:new', message);

      console.log(`[Chat] Message sent from ${socket.userId} to ${targetRecipientId} in conversation ${targetConversationId}`);

    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      socket.emit('message:error', { error: 'Failed to send message' });
    }
  });

  // ============================================================
  // Mark Messages as Read
  // ============================================================
  socket.on('message:read', async (data) => {
    try {
      const { conversationId, messageIds } = data;

      if (!messageIds || messageIds.length === 0) {
        return;
      }

      await chatService.markMessagesAsRead(socket.userId, messageIds);

      // Get other participant
      const senderId = await chatService.getOtherParticipant(conversationId, socket.userId);

      // Notify sender that messages were read
      io.to(`user:${senderId}`).emit('message:read', {
        conversationId,
        messageIds,
        readBy: socket.userId,
        readAt: new Date().toISOString(),
      });

      console.log(`[Chat] Messages marked as read by ${socket.userId} in conversation ${conversationId}`);

    } catch (error) {
      console.error('[Chat] Error marking messages as read:', error);
    }
  });

  // ============================================================
  // Delete Message
  // ============================================================
  socket.on('message:delete', async (data) => {
    try {
      const { messageId } = data;

      const message = await chatService.deleteMessage(socket.userId, messageId);

      if (message) {
        // Get other participant
        const recipientId = await chatService.getOtherParticipant(message.conversationId, socket.userId);

        // Notify recipient about deletion
        io.to(`user:${recipientId}`).emit('message:deleted', {
          messageId,
          conversationId: message.conversationId,
        });

        console.log(`[Chat] Message ${messageId} deleted by ${socket.userId}`);
      } else {
        socket.emit('message:error', { error: 'Message not found or not authorized' });
      }

    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      socket.emit('message:error', { error: 'Failed to delete message' });
    }
  });

  // ============================================================
  // Share Content (Achievement/Game/Exercise/Vocabulary)
  // ============================================================
  socket.on('share:content', async (data) => {
    try {
      const { recipientId, contentType, contentId, comment } = data;

      // Check if blocked
      const isBlocked = await chatService.isBlocked(socket.userId, recipientId);
      if (isBlocked) {
        socket.emit('share:error', { error: 'Cannot share content with this user' });
        return;
      }

      // Share content and create message
      const message = await chatService.shareContent(
        socket.userId,
        recipientId,
        contentType as SharedContentType,
        contentId,
        comment
      );

      // Send to sender
      socket.emit('message:sent', message);

      // Send to recipient
      io.to(`user:${recipientId}`).emit('message:new', message);

      console.log(`[Chat] Content shared from ${socket.userId} to ${recipientId}: ${contentType}#${contentId}`);

    } catch (error) {
      console.error('[Chat] Error sharing content:', error);
      socket.emit('share:error', { error: 'Failed to share content' });
    }
  });
}
