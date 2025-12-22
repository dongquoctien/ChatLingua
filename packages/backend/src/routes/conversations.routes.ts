import { Router, Response } from 'express';
import { conversationService } from '../services/conversation.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/conversations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const result = await conversationService.getConversations(req.userId!, page, limit);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get conversations';
    res.status(500).json({ error: message });
  }
});

// GET /api/conversations/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ error: 'Invalid conversation ID' });
      return;
    }

    const conversation = await conversationService.getConversationById(req.userId!, conversationId);

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get conversation';
    res.status(500).json({ error: message });
  }
});

export default router;
