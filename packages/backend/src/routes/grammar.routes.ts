import { Router, Response } from 'express';
import {
  grammarSpacedRepetitionService,
  type GrammarReviewType,
} from '../services/grammar-spaced-repetition.service.js';
import { buttonToQuality } from '../services/spaced-repetition.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Grammar Points Endpoints
// ============================================================

/**
 * GET /api/grammar
 * Get user's grammar points
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const filters: { category?: string; status?: 'new' | 'learning' | 'reviewing' | 'mastered' } = {};

    if (req.query.category) {
      filters.category = req.query.category as string;
    }
    if (req.query.status) {
      const status = req.query.status as string;
      if (['new', 'learning', 'reviewing', 'mastered'].includes(status)) {
        filters.status = status as 'new' | 'learning' | 'reviewing' | 'mastered';
      }
    }

    const grammarPoints = await grammarSpacedRepetitionService.getGrammarPoints(
      req.userId!,
      filters
    );

    res.json(grammarPoints);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar points';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/grammar/categories
 * Get grammar categories with counts
 */
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await grammarSpacedRepetitionService.getCategories(req.userId!);
    res.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/grammar/:id
 * Get specific grammar point
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const grammarPointId = parseInt(req.params.id);
    if (isNaN(grammarPointId)) {
      res.status(400).json({ error: 'Invalid grammar point ID' });
      return;
    }

    const grammarPoint = await grammarSpacedRepetitionService.getGrammarPointById(
      req.userId!,
      grammarPointId
    );

    if (!grammarPoint) {
      res.status(404).json({ error: 'Grammar point not found' });
      return;
    }

    res.json(grammarPoint);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar point';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/grammar/stats
 * Get grammar statistics
 */
router.get('/stats/overview', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await grammarSpacedRepetitionService.getGrammarStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar stats';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Grammar Review Queue Endpoints
// ============================================================

/**
 * GET /api/grammar/review/queue
 * Get today's grammar review queue
 */
router.get('/review/queue', async (req: AuthRequest, res: Response) => {
  try {
    const includeCompleted = req.query.includeCompleted === 'true';
    const queue = await grammarSpacedRepetitionService.getDailyQueue(
      req.userId!,
      includeCompleted
    );

    res.json(queue);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar review queue';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/grammar/review/queue/rebuild
 * Force rebuild today's grammar queue
 */
router.post('/review/queue/rebuild', async (req: AuthRequest, res: Response) => {
  try {
    await grammarSpacedRepetitionService.buildDailyQueue(req.userId!);
    const queue = await grammarSpacedRepetitionService.getDailyQueue(req.userId!);
    res.json({ message: 'Queue rebuilt successfully', queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rebuild queue';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Grammar Review Submission Endpoints
// ============================================================

/**
 * POST /api/grammar/review/submit
 * Submit a grammar review result
 *
 * Body:
 * - grammarPointId: number
 * - rating: 'again' | 'hard' | 'good' | 'easy' (or quality: 0-5)
 * - timeSpentSeconds?: number
 * - reviewType?: 'flashcard' | 'quiz' | 'exercise'
 */
router.post('/review/submit', async (req: AuthRequest, res: Response) => {
  try {
    const {
      grammarPointId,
      rating,
      quality: rawQuality,
      timeSpentSeconds = 0,
      reviewType = 'flashcard',
    } = req.body;

    if (!grammarPointId) {
      res.status(400).json({ error: 'grammarPointId is required' });
      return;
    }

    // Convert button rating to quality if provided
    let quality: number;
    if (rating) {
      if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
        res.status(400).json({ error: 'Invalid rating. Must be: again, hard, good, or easy' });
        return;
      }
      quality = buttonToQuality(rating);
    } else if (rawQuality !== undefined) {
      quality = Math.max(0, Math.min(5, Number(rawQuality)));
    } else {
      res.status(400).json({ error: 'Either rating or quality is required' });
      return;
    }

    const result = await grammarSpacedRepetitionService.processReview(
      req.userId!,
      grammarPointId,
      quality,
      reviewType as GrammarReviewType,
      timeSpentSeconds
    );

    res.json({
      success: true,
      nextReviewAt: result.nextReviewAt,
      newInterval: result.newInterval,
      newEaseFactor: result.newEaseFactor,
      newStatus: result.newStatus,
      intervalText: formatInterval(result.newInterval),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit grammar review';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Grammar Exercise Endpoints
// ============================================================

/**
 * GET /api/grammar/exercises
 * Get grammar exercises
 */
router.get('/exercises', async (req: AuthRequest, res: Response) => {
  try {
    const filters: { category?: string; type?: string } = {};

    if (req.query.category) {
      filters.category = req.query.category as string;
    }
    if (req.query.type) {
      filters.type = req.query.type as string;
    }

    const exercises = await grammarSpacedRepetitionService.getGrammarExercises(
      req.userId!,
      filters as any
    );

    res.json(exercises);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar exercises';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/grammar/exercises/random
 * Get random grammar exercises
 */
router.get('/exercises/random', async (req: AuthRequest, res: Response) => {
  try {
    const count = Math.min(parseInt(req.query.count as string) || 10, 50);
    const category = req.query.category as string | undefined;

    const exercises = await grammarSpacedRepetitionService.getRandomGrammarExercises(
      req.userId!,
      count,
      category
    );

    res.json(exercises);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get random grammar exercises';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/grammar/exercises/:id/submit
 * Submit grammar exercise answer
 *
 * Body:
 * - userAnswer: string
 * - timeSpentSeconds?: number
 */
router.post('/exercises/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const exerciseId = parseInt(req.params.id);
    if (isNaN(exerciseId)) {
      res.status(400).json({ error: 'Invalid exercise ID' });
      return;
    }

    const { userAnswer, timeSpentSeconds = 0 } = req.body;

    if (!userAnswer) {
      res.status(400).json({ error: 'userAnswer is required' });
      return;
    }

    const result = await grammarSpacedRepetitionService.submitGrammarExerciseAnswer(
      req.userId!,
      exerciseId,
      userAnswer,
      timeSpentSeconds
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit exercise answer';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Grammar Learning Goals Endpoints
// ============================================================

/**
 * GET /api/grammar/goals
 * Get user's grammar learning goals
 */
router.get('/goals', async (req: AuthRequest, res: Response) => {
  try {
    const goals = await grammarSpacedRepetitionService.getLearningGoals(req.userId!);
    res.json(goals);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get grammar learning goals';
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/grammar/goals
 * Update grammar learning goals
 *
 * Body (all optional):
 * - dailyNewRules: number
 * - dailyReviews: number
 * - focusCategories: string[]
 * - isActive: boolean
 */
router.put('/goals', async (req: AuthRequest, res: Response) => {
  try {
    const updates: Record<string, unknown> = {};

    if (req.body.dailyNewRules !== undefined) {
      updates.dailyNewRules = Math.max(1, Math.min(20, Number(req.body.dailyNewRules)));
    }
    if (req.body.dailyReviews !== undefined) {
      updates.dailyReviews = Math.max(5, Math.min(100, Number(req.body.dailyReviews)));
    }
    if (req.body.focusCategories !== undefined) {
      if (Array.isArray(req.body.focusCategories)) {
        updates.focusCategories = req.body.focusCategories;
      }
    }
    if (req.body.isActive !== undefined) {
      updates.isActive = Boolean(req.body.isActive);
    }

    const goals = await grammarSpacedRepetitionService.updateLearningGoals(
      req.userId!,
      updates
    );

    res.json(goals);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update grammar learning goals';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Helper Functions
// ============================================================

function formatInterval(days: number): string {
  if (days === 0) return 'Now';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 14) return '1 week';
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  if (days < 60) return '1 month';
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} year${days >= 730 ? 's' : ''}`;
}

export default router;
