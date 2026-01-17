import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import { userVocabularyService } from '../../services/v3/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// User Vocabulary Routes (Personal vocabulary with spaced repetition)
// ============================================================

// GET /api/v3/user/vocabulary - Get user's vocabulary list
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const filters = {
      cefrLevel: req.query.cefrLevel as string,
      partOfSpeech: req.query.partOfSpeech as string,
      reviewStatus: req.query.reviewStatus as 'new' | 'learning' | 'reviewing' | 'mastered',
      sourceType: req.query.sourceType as 'conversation' | 'word_map' | 'manual' | 'import',
      searchTerm: req.query.search as string,
      mapId: req.query.mapId ? parseInt(req.query.mapId as string) : undefined,
      unitId: req.query.unitId ? parseInt(req.query.unitId as string) : undefined,
      lessonId: req.query.lessonId ? parseInt(req.query.lessonId as string) : undefined,
    };

    const result = await userVocabularyService.getUserVocabulary(
      req.userId!,
      page,
      limit,
      filters
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/vocabulary/filters - Get available filter options
router.get('/filters', async (req: AuthRequest, res: Response) => {
  try {
    const filters = await userVocabularyService.getAvailableFilters(req.userId!);
    res.json(filters);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get filters';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/vocabulary/review - Get vocabulary due for review
router.get('/review', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const options: {
      sourceType?: 'conversation' | 'word_map' | 'manual' | 'import';
      mapId?: number;
    } = {};

    if (req.query.sourceType) {
      options.sourceType = req.query.sourceType as 'conversation' | 'word_map' | 'manual' | 'import';
    }
    if (req.query.mapId) {
      options.mapId = parseInt(req.query.mapId as string);
    }

    const vocabulary = await userVocabularyService.getDueForReview(req.userId!, limit, options);
    res.json({ vocabulary, count: vocabulary.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/vocabulary/stats - Get user vocabulary statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await userVocabularyService.getStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary stats';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/user/vocabulary/:id - Get specific user vocabulary item
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const vocabulary = await userVocabularyService.getById(req.userId!, id);
    if (!vocabulary) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json({ vocabulary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/user/vocabulary - Add vocabulary to user's list
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { masterVocabularyId, sourceType = 'manual', sourceId } = req.body;

    if (!masterVocabularyId) {
      res.status(400).json({ error: 'masterVocabularyId is required' });
      return;
    }

    const vocabulary = await userVocabularyService.addVocabulary(
      req.userId!,
      masterVocabularyId,
      sourceType,
      sourceId
    );

    res.status(201).json({ vocabulary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add vocabulary';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/user/vocabulary/bulk - Bulk add vocabulary
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const result = await userVocabularyService.bulkAddVocabulary(req.userId!, items);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk add vocabulary';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/user/vocabulary/:id/review - Submit review result
router.post('/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const { quality } = req.body;

    if (quality === undefined || quality < 0 || quality > 5) {
      res.status(400).json({ error: 'Quality must be between 0 and 5' });
      return;
    }

    const result = await userVocabularyService.submitReview(
      req.userId!,
      id,
      quality
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit review';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/v3/user/vocabulary/:id - Remove vocabulary from user's list
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const deleted = await userVocabularyService.removeVocabulary(req.userId!, id);
    if (!deleted) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove vocabulary';
    res.status(500).json({ error: message });
  }
});

export default router;
