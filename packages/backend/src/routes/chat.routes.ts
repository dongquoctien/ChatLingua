import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { chatService } from '../services/chat.service.js';
import { statusService } from '../services/status.service.js';
import { emitToUser, broadcastExcept } from '../socket/index.js';
import type { Response } from 'express';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Conversations
// ============================================================

// GET /api/chat/conversations - List all conversations
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const includeArchived = req.query.includeArchived === 'true';

    const result = await chatService.getConversations(userId, page, limit, includeArchived);
    res.json(result);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// GET /api/chat/conversations/:id - Get single conversation
router.get('/conversations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const conversationId = parseInt(req.params.id);

    const result = await chatService.getConversationById(conversationId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(404).json({ error: 'Conversation not found' });
  }
});

// GET /api/chat/conversations/:id/messages - Get messages with pagination
router.get('/conversations/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const conversationId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const result = await chatService.getMessages(conversationId, userId, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// POST /api/chat/conversations - Create/get conversation with user
router.post('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      res.status(400).json({ error: 'otherUserId is required' });
      return;
    }

    if (otherUserId === userId) {
      res.status(400).json({ error: 'Cannot create conversation with yourself' });
      return;
    }

    // Check if blocked
    const isBlocked = await chatService.isBlocked(userId, otherUserId);
    if (isBlocked) {
      res.status(403).json({ error: 'Cannot create conversation with this user' });
      return;
    }

    const result = await chatService.getOrCreateConversation(userId, otherUserId);
    res.json(result);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// PUT /api/chat/conversations/:id/settings - Update conversation settings
router.put('/conversations/:id/settings', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const conversationId = parseInt(req.params.id);
    const settings = req.body;

    const result = await chatService.updateConversationSettings(conversationId, userId, settings);
    res.json(result);
  } catch (error) {
    console.error('Error updating conversation settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// DELETE /api/chat/conversations/:id - Archive conversation
router.delete('/conversations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const conversationId = parseInt(req.params.id);

    await chatService.deleteConversation(conversationId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ============================================================
// Messages (REST fallback)
// ============================================================

// POST /api/chat/messages - Send message via REST (fallback)
router.post('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { conversationId, recipientId, messageType = 'text', content, metadata } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    let targetConversationId = conversationId;
    let targetRecipientId = recipientId;

    // If no conversationId, create/get conversation with recipient
    if (!targetConversationId && recipientId) {
      const isBlocked = await chatService.isBlocked(userId, recipientId);
      if (isBlocked) {
        res.status(403).json({ error: 'Cannot send message to this user' });
        return;
      }

      const conversation = await chatService.getOrCreateConversation(userId, recipientId);
      targetConversationId = conversation.id;
    }

    if (!targetConversationId) {
      res.status(400).json({ error: 'conversationId or recipientId is required' });
      return;
    }

    // If we have conversationId but no recipientId, get it from the conversation
    if (!targetRecipientId) {
      const conversation = await chatService.getConversationById(targetConversationId, userId);
      targetRecipientId = conversation.otherUser.id;
    }

    const message = await chatService.createMessage({
      conversationId: targetConversationId,
      senderId: userId,
      messageType,
      content,
      metadata,
    });

    // Emit socket event to recipient for real-time update
    if (targetRecipientId) {
      emitToUser(targetRecipientId, 'message:new', message);
    }

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE /api/chat/messages/:id - Delete message
router.delete('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = parseInt(req.params.id);

    const message = await chatService.deleteMessage(userId, messageId);

    if (!message) {
      res.status(404).json({ error: 'Message not found or not authorized' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// POST /api/chat/messages/read - Mark messages as read
router.post('/messages/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({ error: 'messageIds array is required' });
      return;
    }

    await chatService.markMessagesAsRead(userId, messageIds);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// ============================================================
// Users & Status
// ============================================================

// GET /api/chat/users - Get all users with status
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const result = await statusService.getAllUsersWithStatus(userId, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET /api/chat/users/online - Get online users only
router.get('/users/online', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await statusService.getOnlineUsers(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

// GET /api/chat/users/:id/status - Get specific user status
router.get('/users/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const result = await statusService.getUserStatus(targetUserId);
    res.json(result);
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(404).json({ error: 'User not found' });
  }
});

// PUT /api/chat/status - Update my status
router.put('/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await statusService.updateStatus(userId, req.body);

    // Broadcast status change to all other users via socket
    if (req.body.statusType !== undefined || req.body.statusText !== undefined) {
      broadcastExcept(userId, 'user:status_changed', {
        userId,
        status: result.statusType,
        statusText: result.statusText ?? undefined,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// GET /api/chat/status - Get my status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await statusService.getUserStatus(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ============================================================
// Block Management
// ============================================================

// GET /api/chat/blocks - Get my blocked users
router.get('/blocks', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await chatService.getBlockedUsers(userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting blocked users:', error);
    res.status(500).json({ error: 'Failed to get blocked users' });
  }
});

// POST /api/chat/blocks - Block a user
router.post('/blocks', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { blockedUserId, reason } = req.body;

    if (!blockedUserId) {
      res.status(400).json({ error: 'blockedUserId is required' });
      return;
    }

    if (blockedUserId === userId) {
      res.status(400).json({ error: 'Cannot block yourself' });
      return;
    }

    await chatService.blockUser(userId, blockedUserId, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/chat/blocks/:userId - Unblock a user
router.delete('/blocks/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const blockedUserId = parseInt(req.params.userId);

    await chatService.unblockUser(userId, blockedUserId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// ============================================================
// Sharing
// ============================================================

// POST /api/chat/share - Share content
router.post('/share', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { recipientId, contentType, contentId, comment } = req.body;

    if (!recipientId || !contentType || !contentId) {
      res.status(400).json({ error: 'recipientId, contentType, and contentId are required' });
      return;
    }

    // Check if blocked
    const isBlocked = await chatService.isBlocked(userId, recipientId);
    if (isBlocked) {
      res.status(403).json({ error: 'Cannot share content with this user' });
      return;
    }

    const message = await chatService.shareContent(
      userId,
      recipientId,
      contentType,
      contentId,
      comment
    );

    res.json(message);
  } catch (error) {
    console.error('Error sharing content:', error);
    res.status(500).json({ error: 'Failed to share content' });
  }
});

// ============================================================
// Conversation Sharing (Learning Conversations)
// ============================================================

// POST /api/chat/share-conversation - Share a learning conversation to users
router.post('/share-conversation', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { conversationId, recipientIds, message } = req.body;

    if (!conversationId) {
      res.status(400).json({ error: 'conversationId is required' });
      return;
    }

    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      res.status(400).json({ error: 'recipientIds array is required and must not be empty' });
      return;
    }

    const messages = await chatService.shareConversation(
      userId,
      conversationId,
      recipientIds,
      message
    );

    // Emit socket events to recipients
    for (const msg of messages) {
      const recipientId = recipientIds.find(id =>
        msg.conversationId !== undefined
      );
      if (recipientId) {
        // Get the other participant for this message
        try {
          const otherParticipant = await chatService.getOtherParticipant(msg.conversationId, userId);
          emitToUser(otherParticipant, 'message:new', msg);
        } catch (e) {
          // Continue with other messages
        }
      }
    }

    res.json({ messages, count: messages.length });
  } catch (error) {
    console.error('Error sharing conversation:', error);
    res.status(500).json({ error: 'Failed to share conversation' });
  }
});

// GET /api/chat/shared/:messageId/preview - Get preview before import
router.get('/shared/:messageId/preview', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = parseInt(req.params.messageId);

    if (isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid messageId' });
      return;
    }

    const result = await chatService.getSharedPreview(messageId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting shared preview:', error);
    res.status(404).json({ error: 'Shared conversation not found' });
  }
});

// POST /api/chat/import-shared/:messageId - Import shared conversation
router.post('/import-shared/:messageId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = parseInt(req.params.messageId);
    const { importVocabulary = true, importGrammar = true, importExercises = false } = req.body;

    if (isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid messageId' });
      return;
    }

    const result = await chatService.importSharedConversation(messageId, userId, {
      importVocabulary,
      importGrammar,
      importExercises,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error importing shared conversation:', error);
    if (error.message === 'Already imported this conversation') {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to import conversation' });
    }
  }
});

// GET /api/chat/shared/:messageId/import-status - Check import status
router.get('/shared/:messageId/import-status', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = parseInt(req.params.messageId);

    if (isNaN(messageId)) {
      res.status(400).json({ error: 'Invalid messageId' });
      return;
    }

    const result = await chatService.getImportStatus(messageId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting import status:', error);
    res.status(500).json({ error: 'Failed to get import status' });
  }
});

// ============================================================
// Search
// ============================================================

// GET /api/chat/search/messages - Search in messages
router.get('/search/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string;
    const conversationId = req.query.conversationId
      ? parseInt(req.query.conversationId as string)
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (!query) {
      res.status(400).json({ error: 'Search query (q) is required' });
      return;
    }

    const result = await chatService.searchMessages(userId, query, conversationId, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// GET /api/chat/search/users - Search users to chat
router.get('/search/users', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (!query) {
      res.status(400).json({ error: 'Search query (q) is required' });
      return;
    }

    const result = await chatService.searchUsers(userId, query, page, limit);
    res.json(result);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;
