import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { challengeService } from './challenge.service.js';

// ============================================================
// Types
// ============================================================

export type ReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
export type ReviewType = 'flashcard' | 'quiz' | 'exercise';
export type FlashcardDirection = 'vi_to_en' | 'en_to_vi' | 'mixed';
export type QueuePriority = 'overdue' | 'due' | 'new';

export interface SM2Result {
  nextReviewAt: Date;
  newInterval: number;
  newEaseFactor: number;
  newRepetitionCount: number;
  newLapseCount: number;
  newStatus: ReviewStatus;
}

export interface VocabularyWithReview extends RowDataPacket {
  id: number;
  user_id: number;
  english_word: string;
  vietnamese_word: string;
  phonetic: string | null;
  pronunciation_uk: string | null;
  pronunciation_us: string | null;
  part_of_speech: string | null;
  difficulty_level: string;
  cefr_level: string | null;
  definitions: string | null;
  // SM2 fields
  next_review_at: Date | null;
  review_interval: number;
  ease_factor: number;
  repetition_count: number;
  lapse_count: number;
  review_status: ReviewStatus;
  // Queue info (when fetched from queue)
  priority?: QueuePriority;
  queue_order?: number;
}

export interface ReviewStats {
  dueToday: number;
  overdueCount: number;
  newAvailable: number;
  completedToday: number;
  totalReviews: number;
  averageEaseFactor: number;
  masteredCount: number;
  learningCount: number;
  reviewingCount: number;
}

export interface QueueStats {
  due: number;
  overdue: number;
  new: number;
  completed: number;
  total: number;
}

export interface LearningGoals {
  id: number;
  userId: number;
  dailyNewWords: number;
  dailyReviews: number;
  reminderEnabled: boolean;
  reminderTime: string;
  preferredDirection: FlashcardDirection;
  isActive: boolean;
}

export interface ReviewStreak {
  currentStreak: number;
  longestStreak: number;
  lastReviewDate: Date | null;
  streakStartDate: Date | null;
  totalReviewDays: number;
}

interface LearningGoalsRow extends RowDataPacket {
  id: number;
  user_id: number;
  daily_new_words: number;
  daily_reviews: number;
  reminder_enabled: boolean;
  reminder_time: string;
  preferred_direction: FlashcardDirection;
  is_active: boolean;
}

interface ReviewStreakRow extends RowDataPacket {
  current_streak: number;
  longest_streak: number;
  last_review_date: Date | null;
  streak_start_date: Date | null;
  total_review_days: number;
}

interface CountRow extends RowDataPacket {
  count: number;
}

interface AvgRow extends RowDataPacket {
  avg_ef: number | null;
}

// ============================================================
// SM2 Algorithm Implementation
// ============================================================

/**
 * SM2 Algorithm for Spaced Repetition
 *
 * Quality ratings:
 * 0 - Complete blackout, no memory
 * 1 - Wrong answer, but remembered upon seeing
 * 2 - Wrong answer, but seemed easy to recall
 * 3 - Correct with serious difficulty (Hard)
 * 4 - Correct with some hesitation (Good)
 * 5 - Perfect, instant recall (Easy)
 *
 * For 4-button UI (Anki-style):
 * - Again → quality 1
 * - Hard → quality 2
 * - Good → quality 3
 * - Easy → quality 5
 */
export function calculateSM2(
  quality: number,
  currentInterval: number,
  currentEaseFactor: number,
  repetitionCount: number,
  lapseCount: number
): SM2Result {
  // Clamp quality to 0-5
  quality = Math.max(0, Math.min(5, quality));

  let newInterval: number;
  let newEaseFactor: number;
  let newRepetitionCount: number;
  let newLapseCount = lapseCount;
  let newStatus: ReviewStatus;

  if (quality < 3) {
    // Failed review - reset to learning phase
    newRepetitionCount = 0;
    newInterval = 1; // Review again tomorrow
    newLapseCount = lapseCount + 1;
    newStatus = 'learning';

    // Reduce ease factor on failure (but not below 1.3)
    newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2);
  } else {
    // Successful review
    if (repetitionCount === 0) {
      newInterval = 1;
    } else if (repetitionCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor);
    }

    newRepetitionCount = repetitionCount + 1;

    // Update ease factor using SM2 formula
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor); // Minimum EF is 1.3
    newEaseFactor = Math.min(5.0, newEaseFactor); // Maximum EF is 5.0
    newEaseFactor = Math.round(newEaseFactor * 100) / 100; // Round to 2 decimals

    // Determine status based on interval
    if (newInterval >= 21) {
      newStatus = 'mastered';
    } else if (newInterval >= 3) {
      newStatus = 'reviewing';
    } else {
      newStatus = 'learning';
    }
  }

  // Cap interval at 365 days
  newInterval = Math.min(365, newInterval);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  nextReviewAt.setHours(0, 0, 0, 0); // Set to start of day

  return {
    nextReviewAt,
    newInterval,
    newEaseFactor,
    newRepetitionCount,
    newLapseCount,
    newStatus,
  };
}

/**
 * Convert 4-button rating to SM2 quality
 * Again = 1, Hard = 2, Good = 3, Easy = 5
 */
export function buttonToQuality(button: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (button) {
    case 'again': return 1;
    case 'hard': return 2;
    case 'good': return 3;
    case 'easy': return 5;
    default: return 3;
  }
}

// ============================================================
// Service Class
// ============================================================

export class SpacedRepetitionService {

  // --------------------------------------------------------
  // Daily Queue Management
  // --------------------------------------------------------

  /**
   * Build daily review queue for a user
   * Includes: overdue items, due today, and new items up to daily limit
   */
  async buildDailyQueue(userId: number, date: Date = new Date()): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];

    // Get user's learning goals
    const goals = await this.getLearningGoals(userId);
    const dailyNewLimit = goals?.dailyNewWords || 5;

    // Clear existing queue for this date (only incomplete items)
    await pool.execute(
      `DELETE FROM daily_review_queue
       WHERE user_id = ? AND queue_date = ? AND is_completed = FALSE`,
      [userId, dateStr]
    );

    // 1. Add overdue items (past due date, not yet reviewed)
    await pool.execute(
      `INSERT IGNORE INTO daily_review_queue (user_id, vocabulary_id, queue_date, priority, queue_order)
       SELECT ?, id, ?, 'overdue',
              DATEDIFF(?, next_review_at) -- More overdue = higher priority
       FROM vocabulary
       WHERE user_id = ?
         AND review_status != 'new'
         AND next_review_at < ?
       ORDER BY next_review_at ASC`,
      [userId, dateStr, dateStr, userId, dateStr]
    );

    // 2. Add due today items
    await pool.execute(
      `INSERT IGNORE INTO daily_review_queue (user_id, vocabulary_id, queue_date, priority, queue_order)
       SELECT ?, id, ?, 'due',
              UNIX_TIMESTAMP(next_review_at) -- Earlier scheduled = higher priority
       FROM vocabulary
       WHERE user_id = ?
         AND review_status != 'new'
         AND DATE(next_review_at) = ?
       ORDER BY next_review_at ASC`,
      [userId, dateStr, userId, dateStr]
    );

    // 3. Add new items up to daily limit
    await pool.query(
      `INSERT IGNORE INTO daily_review_queue (user_id, vocabulary_id, queue_date, priority, queue_order)
       SELECT ?, id, ?, 'new', id
       FROM vocabulary
       WHERE user_id = ?
         AND review_status = 'new'
       ORDER BY created_at ASC
       LIMIT ${Number(dailyNewLimit)}`,
      [userId, dateStr, userId]
    );
  }

  /**
   * Get today's review queue for a user
   */
  async getDailyQueue(
    userId: number,
    includeCompleted: boolean = false
  ): Promise<VocabularyWithReview[]> {
    const today = new Date().toISOString().split('T')[0];

    // Ensure queue is built for today
    await this.buildDailyQueue(userId);

    const completedCondition = includeCompleted ? '' : 'AND q.is_completed = FALSE';

    const [rows] = await pool.execute<VocabularyWithReview[]>(
      `SELECT v.*, q.priority, q.queue_order
       FROM daily_review_queue q
       JOIN vocabulary v ON q.vocabulary_id = v.id
       WHERE q.user_id = ? AND q.queue_date = ? ${completedCondition}
       ORDER BY
         FIELD(q.priority, 'overdue', 'due', 'new'),
         q.queue_order ASC`,
      [userId, today]
    );

    return rows;
  }

  /**
   * Get queue statistics for today
   */
  async getQueueStats(userId: number): Promise<QueueStats> {
    const today = new Date().toISOString().split('T')[0];

    // Ensure queue is built
    await this.buildDailyQueue(userId);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN priority = 'due' AND is_completed = FALSE THEN 1 ELSE 0 END) as due,
         SUM(CASE WHEN priority = 'overdue' AND is_completed = FALSE THEN 1 ELSE 0 END) as overdue,
         SUM(CASE WHEN priority = 'new' AND is_completed = FALSE THEN 1 ELSE 0 END) as new_count,
         SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed,
         COUNT(*) as total
       FROM daily_review_queue
       WHERE user_id = ? AND queue_date = ?`,
      [userId, today]
    );

    const stats = rows[0];
    return {
      due: Number(stats.due) || 0,
      overdue: Number(stats.overdue) || 0,
      new: Number(stats.new_count) || 0,
      completed: Number(stats.completed) || 0,
      total: Number(stats.total) || 0,
    };
  }

  // --------------------------------------------------------
  // Review Processing
  // --------------------------------------------------------

  /**
   * Process a vocabulary review
   */
  async processReview(
    userId: number,
    vocabularyId: number,
    quality: number,
    reviewType: ReviewType = 'flashcard',
    direction: 'vi_to_en' | 'en_to_vi' = 'vi_to_en',
    timeSpentSeconds: number = 0
  ): Promise<SM2Result> {
    // Get current vocabulary state
    const [vocabRows] = await pool.execute<VocabularyWithReview[]>(
      `SELECT * FROM vocabulary WHERE id = ? AND user_id = ?`,
      [vocabularyId, userId]
    );

    if (vocabRows.length === 0) {
      throw new Error('Vocabulary not found');
    }

    const vocab = vocabRows[0];

    // Calculate new SM2 values
    const result = calculateSM2(
      quality,
      vocab.review_interval,
      Number(vocab.ease_factor),
      vocab.repetition_count,
      vocab.lapse_count
    );

    // Update vocabulary with new SM2 values
    await pool.execute(
      `UPDATE vocabulary SET
         next_review_at = ?,
         review_interval = ?,
         ease_factor = ?,
         repetition_count = ?,
         lapse_count = ?,
         review_status = ?,
         times_practiced = times_practiced + 1,
         last_practiced_at = NOW(),
         mastery_level = ?
       WHERE id = ?`,
      [
        result.nextReviewAt,
        result.newInterval,
        result.newEaseFactor,
        result.newRepetitionCount,
        result.newLapseCount,
        result.newStatus,
        this.calculateMasteryLevel(result.newStatus, result.newRepetitionCount),
        vocabularyId,
      ]
    );

    // Record review history
    await pool.execute(
      `INSERT INTO vocabulary_reviews
         (user_id, vocabulary_id, quality, ease_factor_before, ease_factor_after,
          interval_before, interval_after, review_type, direction, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        vocabularyId,
        quality,
        vocab.ease_factor,
        result.newEaseFactor,
        vocab.review_interval,
        result.newInterval,
        reviewType,
        direction,
        timeSpentSeconds,
      ]
    );

    // Mark as completed in today's queue
    const today = new Date().toISOString().split('T')[0];
    await pool.execute(
      `UPDATE daily_review_queue SET
         is_completed = TRUE,
         completed_at = NOW(),
         quality_rating = ?
       WHERE user_id = ? AND vocabulary_id = ? AND queue_date = ?`,
      [quality, userId, vocabularyId, today]
    );

    // Update streak
    await this.updateStreak(userId);

    // Update daily challenge progress
    await challengeService.checkProgress(userId, 'review_complete');

    return result;
  }

  /**
   * Process a batch of reviews (for quiz/exercise completion)
   */
  async processBatchReviews(
    userId: number,
    reviews: Array<{
      vocabularyId: number;
      quality: number;
      timeSpentSeconds?: number;
    }>,
    reviewType: ReviewType = 'quiz'
  ): Promise<SM2Result[]> {
    const results: SM2Result[] = [];

    for (const review of reviews) {
      const result = await this.processReview(
        userId,
        review.vocabularyId,
        review.quality,
        reviewType,
        'vi_to_en',
        review.timeSpentSeconds || 0
      );
      results.push(result);
    }

    return results;
  }

  // --------------------------------------------------------
  // Statistics
  // --------------------------------------------------------

  /**
   * Get overall review statistics for a user
   */
  async getReviewStats(userId: number): Promise<ReviewStats> {
    const today = new Date().toISOString().split('T')[0];

    // Get queue stats
    const queueStats = await this.getQueueStats(userId);

    // Get vocabulary counts by status
    const [statusCounts] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN review_status = 'mastered' THEN 1 ELSE 0 END) as mastered,
         SUM(CASE WHEN review_status = 'learning' THEN 1 ELSE 0 END) as learning,
         SUM(CASE WHEN review_status = 'reviewing' THEN 1 ELSE 0 END) as reviewing
       FROM vocabulary
       WHERE user_id = ?`,
      [userId]
    );

    // Get total reviews all time
    const [totalResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM vocabulary_reviews WHERE user_id = ?`,
      [userId]
    );

    // Get average ease factor
    const [avgResult] = await pool.execute<AvgRow[]>(
      `SELECT AVG(ease_factor) as avg_ef FROM vocabulary
       WHERE user_id = ? AND review_status != 'new'`,
      [userId]
    );

    // Count new vocabulary available
    const [newCount] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM vocabulary
       WHERE user_id = ? AND review_status = 'new'`,
      [userId]
    );

    const stats = statusCounts[0];

    return {
      dueToday: Number(queueStats.due) + Number(queueStats.overdue),
      overdueCount: Number(queueStats.overdue),
      newAvailable: Number(newCount[0].count) || 0,
      completedToday: Number(queueStats.completed),
      totalReviews: Number(totalResult[0].count) || 0,
      averageEaseFactor: Number(avgResult[0].avg_ef) || 2.5,
      masteredCount: Number(stats.mastered) || 0,
      learningCount: Number(stats.learning) || 0,
      reviewingCount: Number(stats.reviewing) || 0,
    };
  }

  /**
   * Get review history with pagination
   */
  async getReviewHistory(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: RowDataPacket[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM vocabulary_reviews WHERE user_id = ?`,
      [userId]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT vr.*, v.english_word, v.vietnamese_word
       FROM vocabulary_reviews vr
       JOIN vocabulary v ON vr.vocabulary_id = v.id
       WHERE vr.user_id = ?
       ORDER BY vr.reviewed_at DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [userId]
    );

    return {
      data: rows,
      total: countResult[0].count,
      page,
      limit,
    };
  }

  // --------------------------------------------------------
  // Learning Goals
  // --------------------------------------------------------

  /**
   * Get user's learning goals
   */
  async getLearningGoals(userId: number): Promise<LearningGoals | null> {
    const [rows] = await pool.execute<LearningGoalsRow[]>(
      `SELECT * FROM learning_goals WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Create default goals
      await pool.execute(
        `INSERT INTO learning_goals (user_id) VALUES (?)`,
        [userId]
      );
      return this.getLearningGoals(userId);
    }

    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      dailyNewWords: row.daily_new_words,
      dailyReviews: row.daily_reviews,
      reminderEnabled: row.reminder_enabled,
      reminderTime: row.reminder_time,
      preferredDirection: row.preferred_direction,
      isActive: row.is_active,
    };
  }

  /**
   * Update user's learning goals
   */
  async updateLearningGoals(
    userId: number,
    updates: Partial<Omit<LearningGoals, 'id' | 'userId'>>
  ): Promise<LearningGoals> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.dailyNewWords !== undefined) {
      fields.push('daily_new_words = ?');
      values.push(updates.dailyNewWords);
    }
    if (updates.dailyReviews !== undefined) {
      fields.push('daily_reviews = ?');
      values.push(updates.dailyReviews);
    }
    if (updates.reminderEnabled !== undefined) {
      fields.push('reminder_enabled = ?');
      values.push(updates.reminderEnabled);
    }
    if (updates.reminderTime !== undefined) {
      fields.push('reminder_time = ?');
      values.push(updates.reminderTime);
    }
    if (updates.preferredDirection !== undefined) {
      fields.push('preferred_direction = ?');
      values.push(updates.preferredDirection);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive);
    }

    if (fields.length > 0) {
      values.push(userId);
      await pool.execute(
        `UPDATE learning_goals SET ${fields.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    const goals = await this.getLearningGoals(userId);
    if (!goals) {
      throw new Error('Failed to get learning goals');
    }
    return goals;
  }

  // --------------------------------------------------------
  // Streaks
  // --------------------------------------------------------

  /**
   * Get user's review streak
   */
  async getStreak(userId: number): Promise<ReviewStreak> {
    const [rows] = await pool.execute<ReviewStreakRow[]>(
      `SELECT * FROM review_streaks WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Create default streak record
      await pool.execute(
        `INSERT INTO review_streaks (user_id) VALUES (?)`,
        [userId]
      );
      return this.getStreak(userId);
    }

    const row = rows[0];
    return {
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastReviewDate: row.last_review_date,
      streakStartDate: row.streak_start_date,
      totalReviewDays: row.total_review_days,
    };
  }

  /**
   * Update streak after a review
   */
  private async updateStreak(userId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await pool.execute<ReviewStreakRow[]>(
      `SELECT * FROM review_streaks WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Create new streak record
      await pool.execute(
        `INSERT INTO review_streaks
           (user_id, current_streak, longest_streak, last_review_date, streak_start_date, total_review_days)
         VALUES (?, 1, 1, ?, ?, 1)`,
        [userId, today, today]
      );
      return;
    }

    const streak = rows[0];
    const lastDate = streak.last_review_date;

    if (lastDate) {
      const lastDateStr = new Date(lastDate).toISOString().split('T')[0];

      if (lastDateStr === today) {
        // Already reviewed today, no streak update needed
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDateStr === yesterdayStr) {
        // Consecutive day - increment streak
        const newStreak = streak.current_streak + 1;
        const newLongest = Math.max(newStreak, streak.longest_streak);

        await pool.execute(
          `UPDATE review_streaks SET
             current_streak = ?,
             longest_streak = ?,
             last_review_date = ?,
             total_review_days = total_review_days + 1
           WHERE user_id = ?`,
          [newStreak, newLongest, today, userId]
        );
      } else {
        // Streak broken - reset
        await pool.execute(
          `UPDATE review_streaks SET
             current_streak = 1,
             last_review_date = ?,
             streak_start_date = ?,
             total_review_days = total_review_days + 1
           WHERE user_id = ?`,
          [today, today, userId]
        );
      }
    } else {
      // First ever review
      await pool.execute(
        `UPDATE review_streaks SET
           current_streak = 1,
           longest_streak = 1,
           last_review_date = ?,
           streak_start_date = ?,
           total_review_days = 1
         WHERE user_id = ?`,
        [today, today, userId]
      );
    }
  }

  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------

  /**
   * Calculate mastery level (0-100) from review status and repetition count
   */
  private calculateMasteryLevel(status: ReviewStatus, repetitionCount: number): number {
    switch (status) {
      case 'new':
        return 0;
      case 'learning':
        return Math.min(30, repetitionCount * 10);
      case 'reviewing':
        return 30 + Math.min(50, repetitionCount * 5);
      case 'mastered':
        return 80 + Math.min(20, repetitionCount);
      default:
        return 0;
    }
  }

  /**
   * Get vocabulary items due for review (for external use)
   */
  async getVocabularyDueForReview(
    userId: number,
    limit: number = 20
  ): Promise<VocabularyWithReview[]> {
    const [rows] = await pool.query<VocabularyWithReview[]>(
      `SELECT * FROM vocabulary
       WHERE user_id = ?
         AND review_status != 'new'
         AND (next_review_at IS NULL OR next_review_at <= NOW())
       ORDER BY next_review_at ASC
       LIMIT ${Number(limit)}`,
      [userId]
    );

    return rows;
  }

  /**
   * Get new vocabulary items (not yet learned)
   */
  async getNewVocabulary(
    userId: number,
    limit: number = 10
  ): Promise<VocabularyWithReview[]> {
    const [rows] = await pool.query<VocabularyWithReview[]>(
      `SELECT * FROM vocabulary
       WHERE user_id = ? AND review_status = 'new'
       ORDER BY created_at ASC
       LIMIT ${Number(limit)}`,
      [userId]
    );

    return rows;
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();
