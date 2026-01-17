import { Router, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.js';
import { masterVocabularyService } from '../../services/v3/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Master Vocabulary Routes (Read-only for regular users)
// ============================================================

// GET /api/v3/master/vocabulary - Get all vocabulary with pagination
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const filters = {
      cefrLevel: req.query.cefrLevel as string,
      partOfSpeech: req.query.partOfSpeech as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const result = await masterVocabularyService.getAll(page, limit, filters);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/vocabulary/search - Search vocabulary
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters' });
      return;
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const results = await masterVocabularyService.search(query, limit);
    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/vocabulary/cefr/:level - Get vocabulary by CEFR level
router.get('/cefr/:level', async (req: AuthRequest, res: Response) => {
  try {
    const level = req.params.level.toUpperCase();
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    if (!validLevels.includes(level)) {
      res.status(400).json({ error: 'Invalid CEFR level. Valid: A1, A2, B1, B2, C1, C2' });
      return;
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const vocabulary = await masterVocabularyService.getByCefrLevel(level, limit);
    res.json({ vocabulary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary by CEFR level';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/vocabulary/stats - Get vocabulary statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await masterVocabularyService.getCountByCefrLevel();
    res.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vocabulary stats';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/vocabulary/:id - Get vocabulary by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const vocabulary = await masterVocabularyService.getById(id);
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

// ============================================================
// Admin-only routes
// ============================================================

// POST /api/v3/master/vocabulary - Create vocabulary (admin only)
router.post('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const vocabulary = await masterVocabularyService.create(req.body);
    res.status(201).json({ vocabulary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create vocabulary';
    res.status(500).json({ error: message });
  }
});

// PUT /api/v3/master/vocabulary/:id - Update vocabulary (admin only)
router.put('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const vocabulary = await masterVocabularyService.update(id, req.body);
    if (!vocabulary) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json({ vocabulary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update vocabulary';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/v3/master/vocabulary/:id - Delete vocabulary (admin only)
router.delete('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const deleted = await masterVocabularyService.delete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Vocabulary not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete vocabulary';
    res.status(500).json({ error: message });
  }
});

export default router;
