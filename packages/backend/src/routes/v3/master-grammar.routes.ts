import { Router, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.js';
import { masterGrammarService } from '../../services/v3/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Master Grammar Routes (Read-only for regular users)
// ============================================================

// GET /api/v3/master/grammar - Get all grammar with pagination
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const filters = {
      cefrLevel: req.query.cefrLevel as string,
      category: req.query.category as string,
      subcategory: req.query.subcategory as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const result = await masterGrammarService.getAll(page, limit, filters);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/grammar/search - Search grammar
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters' });
      return;
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const results = await masterGrammarService.search(query, limit);
    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search grammar';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/grammar/categories - Get all categories
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await masterGrammarService.getCategories();
    res.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/grammar/category/:category - Get grammar by category
router.get('/category/:category', async (req: AuthRequest, res: Response) => {
  try {
    const category = req.params.category;
    const grammar = await masterGrammarService.getByCategory(category);
    res.json({ grammar });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar by category';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/grammar/cefr/:level - Get grammar by CEFR level
router.get('/cefr/:level', async (req: AuthRequest, res: Response) => {
  try {
    const level = req.params.level.toUpperCase();
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    if (!validLevels.includes(level)) {
      res.status(400).json({ error: 'Invalid CEFR level. Valid: A1, A2, B1, B2, C1, C2' });
      return;
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const grammar = await masterGrammarService.getByCefrLevel(level, limit);
    res.json({ grammar });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar by CEFR level';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/grammar/stats - Get grammar statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await masterGrammarService.getCountByCategory();
    res.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar stats';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/grammar/:id - Get grammar by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const grammar = await masterGrammarService.getById(id);
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

// GET /api/v3/master/grammar/:id/related - Get related grammar points
router.get('/:id/related', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const related = await masterGrammarService.getRelatedGrammar(id);
    res.json({ related });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get related grammar';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Admin-only routes
// ============================================================

// POST /api/v3/master/grammar - Create grammar (admin only)
router.post('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const grammar = await masterGrammarService.create(req.body);
    res.status(201).json({ grammar });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create grammar';
    res.status(500).json({ error: message });
  }
});

// PUT /api/v3/master/grammar/:id - Update grammar (admin only)
router.put('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const grammar = await masterGrammarService.update(id, req.body);
    if (!grammar) {
      res.status(404).json({ error: 'Grammar not found' });
      return;
    }

    res.json({ grammar });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update grammar';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/v3/master/grammar/:id - Delete grammar (admin only)
router.delete('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const deleted = await masterGrammarService.delete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Grammar not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete grammar';
    res.status(500).json({ error: message });
  }
});

export default router;
