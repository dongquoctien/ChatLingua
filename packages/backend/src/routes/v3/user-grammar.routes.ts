import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { userGrammarService } from '../../services/v3/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// User Grammar Routes (Personal grammar with spaced repetition)
// ============================================================

// GET /api/v3/user/grammar - Get user's grammar list
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const filters = {
      cefrLevel: req.query.cefrLevel as string,
      category: req.query.category as string,
      reviewStatus: req.query.reviewStatus as 'new' | 'learning' | 'reviewing' | 'mastered',
      sourceType: req.query.sourceType as 'conversation' | 'word_map' | 'manual' | 'import',
      isFavorited: req.query.isFavorited === 'true' ? true : undefined,
    };

    const result = await userGrammarService.getUserGrammar(
      req.userId!,
      page,
      limit,
      filters
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/grammar/review - Get grammar due for review
router.get('/review', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const grammar = await userGrammarService.getDueForReview(req.userId!, limit);
    res.json({ grammar, count: grammar.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review grammar';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/grammar/queue - Get review queue with priorities
router.get('/queue', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const queue = await userGrammarService.getReviewQueue(req.userId!, limit);
    res.json(queue);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review queue';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/grammar/stats - Get user grammar statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await userGrammarService.getStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar stats';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/grammar/categories - Get user's grammar categories
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await userGrammarService.getCategories(req.userId!);
    res.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/grammar/:id - Get specific user grammar item
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const grammar = await userGrammarService.getById(req.userId!, id);
    if (!grammar) {
      res.status(404).json({ error: 'Grammar not found' });
      return;
    }

    res.json({ grammar });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/user/grammar - Add grammar to user's list
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { masterGrammarId, sourceType = 'manual', sourceId } = req.body;

    if (!masterGrammarId) {
      res.status(400).json({ error: 'masterGrammarId is required' });
      return;
    }

    const grammar = await userGrammarService.addGrammar(
      req.userId!,
      masterGrammarId,
      sourceType,
      sourceId
    );

    res.status(201).json({ grammar });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add grammar';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/user/grammar/bulk - Bulk add grammar
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const result = await userGrammarService.bulkAddGrammar(req.userId!, items);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk add grammar';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/user/grammar/:id/review - Submit review result
router.post('/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const { quality, timeSpentSeconds } = req.body;

    if (quality === undefined || quality < 0 || quality > 5) {
      res.status(400).json({ error: 'Quality must be between 0 and 5' });
      return;
    }

    const result = await userGrammarService.submitReview(
      req.userId!,
      id,
      quality,
      timeSpentSeconds
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit review';
    res.status(500).json({ error: message });
  }
});

// PUT /api/v3/user/grammar/:id/favorite - Toggle favorite status
router.put('/:id/favorite', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const isFavorited = await userGrammarService.toggleFavorite(req.userId!, id);
    res.json({ isFavorited });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle favorite';
    res.status(500).json({ error: message });
  }
});

// PUT /api/v3/user/grammar/:id/notes - Update notes
router.put('/:id/notes', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const { notes } = req.body;
    const updated = await userGrammarService.updateNotes(req.userId!, id, notes || null);

    if (!updated) {
      res.status(404).json({ error: 'Grammar not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update notes';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/v3/user/grammar/:id - Remove grammar from user's list
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const deleted = await userGrammarService.removeGrammar(req.userId!, id);
    if (!deleted) {
      res.status(404).json({ error: 'Grammar not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove grammar';
    res.status(500).json({ error: message });
  }
});

export default router;
