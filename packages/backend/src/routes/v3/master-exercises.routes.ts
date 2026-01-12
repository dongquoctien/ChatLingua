import { Router, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.js';
import { masterExercisesService } from '../../services/v3/index.js';
import type { ExerciseTypeV3 } from '../../services/v3/master-exercises.service.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Master Exercises Routes (Read-only for regular users)
// ============================================================

// GET /api/v3/master/exercises - Get all exercises with pagination
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const filters = {
      cefrLevel: req.query.cefrLevel as string,
      exerciseType: req.query.exerciseType as ExerciseTypeV3 | undefined,
      category: req.query.category as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const result = await masterExercisesService.getAll(page, limit, filters);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercises';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/exercises/types - Get exercise type counts
router.get('/types', async (req: AuthRequest, res: Response) => {
  try {
    const types = await masterExercisesService.getTypeCounts();
    res.json({ types });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercise types';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/exercises/stats - Get exercise statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await masterExercisesService.getStats();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercise stats';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/exercises/type/:type - Get exercises by type
router.get('/type/:type', async (req: AuthRequest, res: Response) => {
  try {
    const type = req.params.type;
    const validTypes = [
      'multiple_choice', 'fill_blank', 'translation', 'sentence_building',
      'matching', 'spelling', 'listening', 'error_correction',
      'verb_conjugation', 'cloze'
    ];

    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid exercise type. Valid: ${validTypes.join(', ')}` });
      return;
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const exercises = await masterExercisesService.getByType(type as any, limit);
    res.json({ exercises });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercises by type';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/exercises/vocabulary/:vocabularyId - Get exercises for vocabulary
router.get('/vocabulary/:vocabularyId', async (req: AuthRequest, res: Response) => {
  try {
    const vocabularyId = parseInt(req.params.vocabularyId);
    if (isNaN(vocabularyId)) {
      res.status(400).json({ error: 'Invalid vocabulary ID' });
      return;
    }

    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 10));
    const exercises = await masterExercisesService.getForVocabulary(vocabularyId, limit);
    res.json({ exercises });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercises for vocabulary';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/exercises/grammar/:grammarId - Get exercises for grammar
router.get('/grammar/:grammarId', async (req: AuthRequest, res: Response) => {
  try {
    const grammarId = parseInt(req.params.grammarId);
    if (isNaN(grammarId)) {
      res.status(400).json({ error: 'Invalid grammar ID' });
      return;
    }

    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 10));
    const exercises = await masterExercisesService.getForGrammar(grammarId, limit);
    res.json({ exercises });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercises for grammar';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/master/exercises/random - Get random exercises for exam
router.post('/random', async (req: AuthRequest, res: Response) => {
  try {
    const {
      count = 10,
      cefrLevel,
      difficultyLevel,
      exerciseTypes,
      excludeIds,
    } = req.body;

    const exercises = await masterExercisesService.getRandomForExam(
      Math.min(50, Math.max(1, count)),
      {
        cefrLevel,
        difficultyLevel,
        exerciseTypes,
        excludeIds,
      }
    );

    res.json({ exercises });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get random exercises';
    res.status(500).json({ error: message });
  }
});

// GET /api/v3/master/exercises/:id - Get exercise by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid exercise ID' });
      return;
    }

    const exercise = await masterExercisesService.getById(id);
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    res.json({ exercise });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get exercise';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Admin-only routes
// ============================================================

// POST /api/v3/master/exercises - Create exercise (admin only)
router.post('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const exercise = await masterExercisesService.create(req.body);
    res.status(201).json({ exercise });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create exercise';
    res.status(500).json({ error: message });
  }
});

// POST /api/v3/master/exercises/bulk - Bulk create exercises (admin only)
router.post('/bulk', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { exercises } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0) {
      res.status(400).json({ error: 'Exercises array is required' });
      return;
    }

    const ids = await masterExercisesService.bulkCreate(exercises);
    res.status(201).json({ ids, count: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk create exercises';
    res.status(500).json({ error: message });
  }
});

// PUT /api/v3/master/exercises/:id - Update exercise (admin only)
router.put('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid exercise ID' });
      return;
    }

    const exercise = await masterExercisesService.update(id, req.body);
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    res.json({ exercise });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update exercise';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/v3/master/exercises/:id - Delete exercise (admin only)
router.delete('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid exercise ID' });
      return;
    }

    const deleted = await masterExercisesService.delete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete exercise';
    res.status(500).json({ error: message });
  }
});

export default router;
