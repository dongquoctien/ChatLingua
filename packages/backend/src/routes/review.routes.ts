import { Router, Response } from 'express';
import {
  spacedRepetitionService,
  buttonToQuality,
  type ReviewType,
  type FlashcardDirection,
} from '../services/spaced-repetition.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================
// Daily Queue Endpoints
// ============================================================

/**
 * GET /api/review/queue
 * Get today's review queue
 */
router.get('/queue', async (req: AuthRequest, res: Response) => {
  try {
    const includeCompleted = req.query.includeCompleted === 'true';
    const queue = await spacedRepetitionService.getDailyQueue(req.userId!, includeCompleted);

    // Transform to API response format
    const items = queue.map(item => {
      // Safely parse JSON fields - MySQL JSON columns may return object or string
      const parseJsonSafe = (value: unknown): unknown => {
        if (!value) return null;
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          // Skip invalid "[object Object]" strings
          if (value === '[object Object]') return null;
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        }
        return null;
      };

      return {
        id: item.id,
        englishWord: item.english_word,
        vietnameseWord: item.vietnamese_word,
        phonetic: item.phonetic,
        pronunciationUk: item.pronunciation_uk,
        pronunciationUs: item.pronunciation_us,
        partOfSpeech: item.part_of_speech,
        difficultyLevel: item.difficulty_level,
        cefrLevel: item.cefr_level,
        definitions: parseJsonSafe(item.definitions),
        // SM2 info
        reviewStatus: item.review_status,
        easeFactor: item.ease_factor,
        reviewInterval: item.review_interval,
        nextReviewAt: item.next_review_at,
        // Queue info
        priority: item.priority,
      };
    });

    res.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review queue';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/review/queue/stats
 * Get queue statistics for today
 */
router.get('/queue/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await spacedRepetitionService.getQueueStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get queue stats';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/review/queue/rebuild
 * Force rebuild today's queue
 */
router.post('/queue/rebuild', async (req: AuthRequest, res: Response) => {
  try {
    await spacedRepetitionService.buildDailyQueue(req.userId!);
    const stats = await spacedRepetitionService.getQueueStats(req.userId!);
    res.json({ message: 'Queue rebuilt successfully', stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rebuild queue';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Review Submission Endpoints
// ============================================================

/**
 * POST /api/review/submit
 * Submit a single review result
 *
 * Body:
 * - vocabularyId: number
 * - rating: 'again' | 'hard' | 'good' | 'easy' (or quality: 0-5)
 * - direction?: 'vi_to_en' | 'en_to_vi'
 * - timeSpentSeconds?: number
 * - reviewType?: 'flashcard' | 'quiz' | 'exercise'
 */
router.post('/submit', async (req: AuthRequest, res: Response) => {
  try {
    const {
      vocabularyId,
      rating,
      quality: rawQuality,
      direction = 'vi_to_en',
      timeSpentSeconds = 0,
      reviewType = 'flashcard',
    } = req.body;

    if (!vocabularyId) {
      res.status(400).json({ error: 'vocabularyId is required' });
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

    const result = await spacedRepetitionService.processReview(
      req.userId!,
      vocabularyId,
      quality,
      reviewType as ReviewType,
      direction,
      timeSpentSeconds
    );

    res.json({
      success: true,
      nextReviewAt: result.nextReviewAt,
      newInterval: result.newInterval,
      newEaseFactor: result.newEaseFactor,
      newStatus: result.newStatus,
      // Friendly interval message
      intervalText: formatInterval(result.newInterval),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit review';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/review/submit-batch
 * Submit multiple reviews at once (for quiz/exercise completion)
 *
 * Body:
 * - reviews: Array<{ vocabularyId, rating, timeSpentSeconds? }>
 * - reviewType?: 'quiz' | 'exercise'
 */
router.post('/submit-batch', async (req: AuthRequest, res: Response) => {
  try {
    const { reviews, reviewType = 'quiz' } = req.body;

    if (!Array.isArray(reviews) || reviews.length === 0) {
      res.status(400).json({ error: 'reviews array is required and cannot be empty' });
      return;
    }

    const processedReviews = reviews.map((r: { vocabularyId: number; rating?: string; quality?: number; timeSpentSeconds?: number }) => ({
      vocabularyId: r.vocabularyId,
      quality: r.rating ? buttonToQuality(r.rating as 'again' | 'hard' | 'good' | 'easy') : (r.quality || 3),
      timeSpentSeconds: r.timeSpentSeconds || 0,
    }));

    const results = await spacedRepetitionService.processBatchReviews(
      req.userId!,
      processedReviews,
      reviewType
    );

    res.json({
      success: true,
      processed: results.length,
      results: results.map((r, i) => ({
        vocabularyId: reviews[i].vocabularyId,
        nextReviewAt: r.nextReviewAt,
        newStatus: r.newStatus,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit batch reviews';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Statistics Endpoints
// ============================================================

/**
 * GET /api/review/stats
 * Get overall review statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await spacedRepetitionService.getReviewStats(req.userId!);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review stats';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/review/history
 * Get review history with pagination
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await spacedRepetitionService.getReviewHistory(req.userId!, page, limit);

    // Transform to API format
    const data = result.data.map(row => ({
      id: row.id,
      vocabularyId: row.vocabulary_id,
      englishWord: row.english_word,
      vietnameseWord: row.vietnamese_word,
      quality: row.quality,
      qualityLabel: getQualityLabel(row.quality),
      easeFactorBefore: row.ease_factor_before,
      easeFactorAfter: row.ease_factor_after,
      intervalBefore: row.interval_before,
      intervalAfter: row.interval_after,
      reviewType: row.review_type,
      direction: row.direction,
      timeSpentSeconds: row.time_spent_seconds,
      reviewedAt: row.reviewed_at,
    }));

    res.json({ ...result, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review history';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/review/streak
 * Get user's review streak
 */
router.get('/streak', async (req: AuthRequest, res: Response) => {
  try {
    const streak = await spacedRepetitionService.getStreak(req.userId!);
    res.json(streak);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get streak';
    res.status(500).json({ error: message });
  }
});

// ============================================================
// Learning Goals Endpoints
// ============================================================

/**
 * GET /api/review/goals
 * Get user's learning goals
 */
router.get('/goals', async (req: AuthRequest, res: Response) => {
  try {
    const goals = await spacedRepetitionService.getLearningGoals(req.userId!);
    res.json(goals);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get learning goals';
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/review/goals
 * Update user's learning goals
 *
 * Body (all optional):
 * - dailyNewWords: number
 * - dailyReviews: number
 * - reminderEnabled: boolean
 * - reminderTime: string (HH:MM:SS)
 * - preferredDirection: 'vi_to_en' | 'en_to_vi' | 'mixed'
 */
router.put('/goals', async (req: AuthRequest, res: Response) => {
  try {
    const updates: Record<string, unknown> = {};

    if (req.body.dailyNewWords !== undefined) {
      updates.dailyNewWords = Math.max(1, Math.min(50, Number(req.body.dailyNewWords)));
    }
    if (req.body.dailyReviews !== undefined) {
      updates.dailyReviews = Math.max(5, Math.min(200, Number(req.body.dailyReviews)));
    }
    if (req.body.reminderEnabled !== undefined) {
      updates.reminderEnabled = Boolean(req.body.reminderEnabled);
    }
    if (req.body.reminderTime !== undefined) {
      updates.reminderTime = req.body.reminderTime;
    }
    if (req.body.preferredDirection !== undefined) {
      if (!['vi_to_en', 'en_to_vi', 'mixed'].includes(req.body.preferredDirection)) {
        res.status(400).json({ error: 'Invalid preferredDirection' });
        return;
      }
      updates.preferredDirection = req.body.preferredDirection as FlashcardDirection;
    }

    const goals = await spacedRepetitionService.updateLearningGoals(req.userId!, updates);
    res.json(goals);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update learning goals';
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

function getQualityLabel(quality: number): string {
  switch (quality) {
    case 0: return 'Blackout';
    case 1: return 'Again';
    case 2: return 'Hard';
    case 3: return 'Good';
    case 4: return 'Good+';
    case 5: return 'Easy';
    default: return 'Unknown';
  }
}

export default router;
