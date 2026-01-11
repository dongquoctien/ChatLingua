import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { calculateSM2, type SM2Result } from './spaced-repetition.service.js';
import { gamificationService } from './gamification.service.js';
import { challengeService } from './challenge.service.js';
import { petService } from './pet.service.js';
import { isAnswerCorrect } from '../utils/answer-matching.js';

// ============================================================
// Types
// ============================================================

export type GrammarReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
export type GrammarReviewType = 'flashcard' | 'quiz' | 'exercise';
export type GrammarQueuePriority = 'overdue' | 'due' | 'new';
export type GrammarExerciseType =
  | 'error_correction'
  | 'verb_conjugation'
  | 'tense_selection'
  | 'article_usage'
  | 'preposition_fill'
  | 'sentence_transformation'
  | 'word_order';

export interface GrammarPoint {
  id: number;
  conversationId: number;
  userId: number;
  grammarRule: string;
  explanation: string;
  exampleVi?: string;
  exampleEn?: string;
  category?: string;
  difficultyLevel: string;
  timesPracticed: number;
  createdAt: Date;
}

export interface GrammarPointWithReview extends GrammarPoint {
  nextReviewAt?: Date;
  reviewInterval: number;
  easeFactor: number;
  repetitionCount: number;
  lapseCount: number;
  reviewStatus: GrammarReviewStatus;
  masteryLevel: number;
  lastReviewedAt?: Date;
}

export interface GrammarQueueItem {
  id: number;
  userId: number;
  grammarPointId: number;
  grammarPoint: GrammarPointWithReview;
  queueDate: Date;
  priority: GrammarQueuePriority;
  queueOrder: number;
  isCompleted: boolean;
  completedAt?: Date;
  qualityRating?: number;
}

export interface GrammarReviewQueue {
  date: Date;
  overdue: GrammarQueueItem[];
  due: GrammarQueueItem[];
  newItems: GrammarQueueItem[];
  totalCount: number;
  completedCount: number;
}

export interface GrammarStats {
  totalGrammarPoints: number;
  masteredCount: number;
  reviewingCount: number;
  learningCount: number;
  newCount: number;
  averageMastery: number;
  dueToday: number;
  overdueCount: number;
}

export interface GrammarExercise {
  id: number;
  userId: number;
  grammarPointId?: number;
  exerciseType: GrammarExerciseType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  category?: string;
  difficultyLevel: string;
  errorPosition?: number;
  verbData?: { base: string; tense: string; subject: string };
  createdAt: Date;
}

export interface GrammarLearningGoals {
  id: number;
  userId: number;
  dailyNewRules: number;
  dailyReviews: number;
  focusCategories?: string[];
  isActive: boolean;
}

// ============================================================
// Row Interfaces
// ============================================================

interface GrammarPointRow extends RowDataPacket {
  id: number;
  conversation_id: number;
  user_id: number;
  grammar_rule: string;
  explanation: string;
  example_vi: string | null;
  example_en: string | null;
  category: string | null;
  difficulty_level: string;
  times_practiced: number;
  next_review_at: Date | null;
  review_interval: number;
  ease_factor: number;
  repetition_count: number;
  lapse_count: number;
  review_status: GrammarReviewStatus;
  created_at: Date;
}

interface GrammarQueueRow extends RowDataPacket {
  id: number;
  user_id: number;
  grammar_point_id: number;
  queue_date: Date;
  priority: GrammarQueuePriority;
  queue_order: number;
  is_completed: boolean;
  completed_at: Date | null;
  quality_rating: number | null;
}

interface GrammarExerciseRow extends RowDataPacket {
  id: number;
  user_id: number;
  grammar_point_id: number | null;
  exercise_type: GrammarExerciseType;
  question: string;
  options: string | null;
  correct_answer: string;
  explanation: string | null;
  category: string | null;
  difficulty_level: string;
  error_position: number | null;
  verb_data: string | null;
  created_at: Date;
}

interface GrammarGoalsRow extends RowDataPacket {
  id: number;
  user_id: number;
  daily_new_rules: number;
  daily_reviews: number;
  focus_categories: string | null;
  is_active: boolean;
}

interface CountRow extends RowDataPacket {
  count: number;
}

// ============================================================
// Service Class
// ============================================================

export class GrammarSpacedRepetitionService {
  // --------------------------------------------------------
  // Grammar Points
  // --------------------------------------------------------

  /**
   * Get grammar points for a user
   */
  async getGrammarPoints(
    userId: number,
    filters?: { category?: string; status?: GrammarReviewStatus }
  ): Promise<GrammarPointWithReview[]> {
    let query = `SELECT * FROM grammar_points WHERE user_id = ?`;
    const params: (string | number)[] = [userId];

    if (filters?.category) {
      query += ` AND category = ?`;
      params.push(filters.category);
    }

    if (filters?.status) {
      query += ` AND review_status = ?`;
      params.push(filters.status);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.execute<GrammarPointRow[]>(query, params);

    return rows.map(row => this.mapToGrammarPoint(row));
  }

  /**
   * Get grammar point by ID
   */
  async getGrammarPointById(
    userId: number,
    grammarPointId: number
  ): Promise<GrammarPointWithReview | null> {
    const [rows] = await pool.execute<GrammarPointRow[]>(
      `SELECT * FROM grammar_points WHERE id = ? AND user_id = ?`,
      [grammarPointId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToGrammarPoint(rows[0]);
  }

  /**
   * Get grammar categories
   */
  async getCategories(userId: number): Promise<{ category: string; count: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT category, COUNT(*) as count
       FROM grammar_points
       WHERE user_id = ? AND category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC`,
      [userId]
    );

    return rows.map(row => ({
      category: row.category as string,
      count: Number(row.count),
    }));
  }

  // --------------------------------------------------------
  // Daily Queue
  // --------------------------------------------------------

  /**
   * Build daily grammar review queue
   */
  async buildDailyQueue(userId: number, date: Date = new Date()): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];

    // Get goals
    const goals = await this.getLearningGoals(userId);
    const dailyNewLimit = goals?.dailyNewRules || 3;

    // Clear incomplete items for this date
    await pool.execute(
      `DELETE FROM daily_grammar_queue
       WHERE user_id = ? AND queue_date = ? AND is_completed = FALSE`,
      [userId, dateStr]
    );

    // Add overdue items
    await pool.execute(
      `INSERT IGNORE INTO daily_grammar_queue (user_id, grammar_point_id, queue_date, priority, queue_order)
       SELECT ?, id, ?, 'overdue', DATEDIFF(?, next_review_at)
       FROM grammar_points
       WHERE user_id = ?
         AND review_status != 'new'
         AND next_review_at < ?
       ORDER BY next_review_at ASC`,
      [userId, dateStr, dateStr, userId, dateStr]
    );

    // Add due today items
    await pool.execute(
      `INSERT IGNORE INTO daily_grammar_queue (user_id, grammar_point_id, queue_date, priority, queue_order)
       SELECT ?, id, ?, 'due', UNIX_TIMESTAMP(next_review_at)
       FROM grammar_points
       WHERE user_id = ?
         AND review_status != 'new'
         AND DATE(next_review_at) = ?
       ORDER BY next_review_at ASC`,
      [userId, dateStr, userId, dateStr]
    );

    // Add new items up to daily limit
    await pool.query(
      `INSERT IGNORE INTO daily_grammar_queue (user_id, grammar_point_id, queue_date, priority, queue_order)
       SELECT ?, id, ?, 'new', id
       FROM grammar_points
       WHERE user_id = ? AND review_status = 'new'
       ORDER BY created_at ASC
       LIMIT ${Number(dailyNewLimit)}`,
      [userId, dateStr, userId]
    );
  }

  /**
   * Get daily grammar review queue
   */
  async getDailyQueue(
    userId: number,
    includeCompleted: boolean = false
  ): Promise<GrammarReviewQueue> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Ensure queue is built
    await this.buildDailyQueue(userId);

    const completedCondition = includeCompleted ? '' : 'AND q.is_completed = FALSE';

    const [rows] = await pool.execute<(GrammarQueueRow & GrammarPointRow)[]>(
      `SELECT q.*, g.*
       FROM daily_grammar_queue q
       JOIN grammar_points g ON q.grammar_point_id = g.id
       WHERE q.user_id = ? AND q.queue_date = ? ${completedCondition}
       ORDER BY FIELD(q.priority, 'overdue', 'due', 'new'), q.queue_order ASC`,
      [userId, todayStr]
    );

    const overdue: GrammarQueueItem[] = [];
    const due: GrammarQueueItem[] = [];
    const newItems: GrammarQueueItem[] = [];
    let completedCount = 0;

    for (const row of rows) {
      const item: GrammarQueueItem = {
        id: row.id,
        userId: row.user_id,
        grammarPointId: row.grammar_point_id,
        grammarPoint: this.mapToGrammarPoint(row),
        queueDate: row.queue_date,
        priority: row.priority,
        queueOrder: row.queue_order,
        isCompleted: row.is_completed,
        completedAt: row.completed_at || undefined,
        qualityRating: row.quality_rating || undefined,
      };

      if (row.is_completed) {
        completedCount++;
      }

      switch (row.priority) {
        case 'overdue':
          overdue.push(item);
          break;
        case 'due':
          due.push(item);
          break;
        case 'new':
          newItems.push(item);
          break;
      }
    }

    return {
      date: today,
      overdue,
      due,
      newItems,
      totalCount: rows.length,
      completedCount,
    };
  }

  // --------------------------------------------------------
  // Review Processing
  // --------------------------------------------------------

  /**
   * Process a grammar review
   */
  async processReview(
    userId: number,
    grammarPointId: number,
    quality: number,
    reviewType: GrammarReviewType = 'flashcard',
    timeSpentSeconds: number = 0
  ): Promise<SM2Result> {
    // Get current grammar point
    const [rows] = await pool.execute<GrammarPointRow[]>(
      `SELECT * FROM grammar_points WHERE id = ? AND user_id = ?`,
      [grammarPointId, userId]
    );

    if (rows.length === 0) {
      throw new Error('Grammar point not found');
    }

    const grammarPoint = rows[0];

    // Calculate SM2
    const result = calculateSM2(
      quality,
      grammarPoint.review_interval,
      Number(grammarPoint.ease_factor),
      grammarPoint.repetition_count,
      grammarPoint.lapse_count
    );

    // Update grammar point
    await pool.execute(
      `UPDATE grammar_points SET
         next_review_at = ?,
         review_interval = ?,
         ease_factor = ?,
         repetition_count = ?,
         lapse_count = ?,
         review_status = ?,
         times_practiced = times_practiced + 1
       WHERE id = ?`,
      [
        result.nextReviewAt,
        result.newInterval,
        result.newEaseFactor,
        result.newRepetitionCount,
        result.newLapseCount,
        result.newStatus,
        grammarPointId,
      ]
    );

    // Record review history
    await pool.execute(
      `INSERT INTO grammar_reviews
       (user_id, grammar_point_id, quality, ease_factor_before, ease_factor_after,
        interval_before, interval_after, review_type, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        grammarPointId,
        quality,
        grammarPoint.ease_factor,
        result.newEaseFactor,
        grammarPoint.review_interval,
        result.newInterval,
        reviewType,
        timeSpentSeconds,
      ]
    );

    // Mark as completed in queue
    const today = new Date().toISOString().split('T')[0];
    await pool.execute(
      `UPDATE daily_grammar_queue SET
         is_completed = TRUE,
         completed_at = NOW(),
         quality_rating = ?
       WHERE user_id = ? AND grammar_point_id = ? AND queue_date = ?`,
      [quality, userId, grammarPointId, today]
    );

    // Award XP for review
    const xpAmount = quality >= 3 ? 4 : 2;
    await gamificationService.awardXP(
      userId,
      xpAmount,
      'review',
      grammarPointId,
      'Grammar review'
    );

    // Update challenge progress
    await challengeService.checkProgress(userId, 'review_complete');

    // ============================================================
    // Pet Care Integration - Play with pet based on grammar review
    // ============================================================
    try {
      // Quality 0-2 = poor, 3-5 = good. Convert to percentage (0-100)
      const scorePercent = Math.round((quality / 5) * 100);
      await petService.processCareFromActivity(
        userId,
        'play', // Grammar reviews = play care type
        'review', // Map grammar review to 'review' source type
        scorePercent
      );
      console.log(`[Pet Care] Processed grammar review for user ${userId}, quality: ${quality}`);
    } catch (error) {
      console.error('Failed to process pet care from grammar review:', error);
    }

    // Pet Daily Tasks Integration
    try {
      await petService.recordActivityForTasks(userId, 'review', { // Map to 'review'
        scorePercent: Math.round((quality / 5) * 100),
        count: 1
      });
    } catch (error) {
      console.error('Failed to update pet tasks from grammar review:', error);
    }

    // Pet XP Integration
    try {
      await petService.onLearningActivity(userId, 'grammar_review', xpAmount);
      console.log(`[Pet XP] Pet gained XP from grammar review: userId=${userId}, xp=${xpAmount}`);
    } catch (error) {
      console.error('Failed to process pet XP from grammar review:', error);
    }

    return result;
  }

  // --------------------------------------------------------
  // Grammar Exercises
  // --------------------------------------------------------

  /**
   * Get grammar exercises for a user
   */
  async getGrammarExercises(
    userId: number,
    filters?: { category?: string; type?: GrammarExerciseType }
  ): Promise<GrammarExercise[]> {
    let query = `SELECT * FROM grammar_exercises WHERE user_id = ?`;
    const params: (string | number)[] = [userId];

    if (filters?.category) {
      query += ` AND category = ?`;
      params.push(filters.category);
    }

    if (filters?.type) {
      query += ` AND exercise_type = ?`;
      params.push(filters.type);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.execute<GrammarExerciseRow[]>(query, params);

    return rows.map(row => this.mapToGrammarExercise(row));
  }

  /**
   * Get random grammar exercises
   */
  async getRandomGrammarExercises(
    userId: number,
    count: number = 10,
    category?: string
  ): Promise<GrammarExercise[]> {
    let query = `SELECT * FROM grammar_exercises WHERE user_id = ?`;
    const params: (string | number)[] = [userId];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY RAND() LIMIT ${Number(count)}`;

    const [rows] = await pool.query<GrammarExerciseRow[]>(query, params);

    return rows.map(row => this.mapToGrammarExercise(row));
  }

  /**
   * Submit grammar exercise answer
   */
  async submitGrammarExerciseAnswer(
    userId: number,
    exerciseId: number,
    userAnswer: string,
    timeSpentSeconds: number
  ): Promise<{ isCorrect: boolean; correctAnswer: string; explanation?: string }> {
    const [exercises] = await pool.execute<GrammarExerciseRow[]>(
      `SELECT * FROM grammar_exercises WHERE id = ? AND user_id = ?`,
      [exerciseId, userId]
    );

    if (exercises.length === 0) {
      throw new Error('Grammar exercise not found');
    }

    const exercise = exercises[0];
    const correctAnswer = exercise.correct_answer || '';
    const exerciseType = exercise.exercise_type || '';
    const isCorrect = isAnswerCorrect(userAnswer, correctAnswer, exerciseType);

    // Record attempt
    await pool.execute(
      `INSERT INTO grammar_exercise_attempts
       (grammar_exercise_id, user_id, user_answer, is_correct, time_spent_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [exerciseId, userId, userAnswer, isCorrect, timeSpentSeconds]
    );

    // Update grammar point if linked
    if (exercise.grammar_point_id) {
      const masteryDelta = isCorrect ? 1 : -1;
      await pool.execute(
        `UPDATE grammar_points
         SET times_practiced = times_practiced + 1
         WHERE id = ?`,
        [exercise.grammar_point_id]
      );
    }

    // Award XP
    const xpAmount = isCorrect ? 5 : 1;
    await gamificationService.awardXP(
      userId,
      xpAmount,
      'exercise',
      exerciseId,
      'Grammar exercise'
    );

    // Update challenge progress
    await challengeService.checkProgress(userId, 'exercise_complete', { isCorrect });

    // ============================================================
    // Pet Care Integration - Feed pet based on grammar exercise
    // ============================================================
    try {
      const scorePercent = isCorrect ? 100 : 0;
      await petService.processCareFromActivity(
        userId,
        'feed', // Grammar exercises = feed care type
        'exercise', // Map grammar exercise to 'exercise' source type
        scorePercent
      );
      console.log(`[Pet Care] Processed grammar exercise for user ${userId}, correct: ${isCorrect}`);
    } catch (error) {
      console.error('Failed to process pet care from grammar exercise:', error);
    }

    // Pet Daily Tasks Integration
    try {
      await petService.recordActivityForTasks(userId, 'exercise', { // Map to 'exercise'
        scorePercent: isCorrect ? 100 : 0,
        count: 1
      });
    } catch (error) {
      console.error('Failed to update pet tasks from grammar exercise:', error);
    }

    // Pet XP Integration
    try {
      await petService.onLearningActivity(userId, 'grammar_exercise', xpAmount);
      console.log(`[Pet XP] Pet gained XP from grammar exercise: userId=${userId}, xp=${xpAmount}`);
    } catch (error) {
      console.error('Failed to process pet XP from grammar exercise:', error);
    }

    return {
      isCorrect,
      correctAnswer: exercise.correct_answer,
      explanation: exercise.explanation || undefined,
    };
  }

  // --------------------------------------------------------
  // Statistics
  // --------------------------------------------------------

  /**
   * Get grammar statistics
   */
  async getGrammarStats(userId: number): Promise<GrammarStats> {
    const today = new Date().toISOString().split('T')[0];

    // Get counts by status
    const [statusCounts] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN review_status = 'mastered' THEN 1 ELSE 0 END) as mastered,
         SUM(CASE WHEN review_status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
         SUM(CASE WHEN review_status = 'learning' THEN 1 ELSE 0 END) as learning,
         SUM(CASE WHEN review_status = 'new' THEN 1 ELSE 0 END) as new_count
       FROM grammar_points
       WHERE user_id = ?`,
      [userId]
    );

    // Get due/overdue counts
    const [dueCounts] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN DATE(next_review_at) = ? THEN 1 ELSE 0 END) as due_today,
         SUM(CASE WHEN next_review_at < ? THEN 1 ELSE 0 END) as overdue
       FROM grammar_points
       WHERE user_id = ? AND review_status != 'new'`,
      [today, today, userId]
    );

    // Calculate average mastery (based on ease factor)
    const [avgResult] = await pool.execute<RowDataPacket[]>(
      `SELECT AVG((ease_factor - 1.3) / 3.7 * 100) as avg_mastery
       FROM grammar_points
       WHERE user_id = ? AND review_status != 'new'`,
      [userId]
    );

    const stats = statusCounts[0];
    const dueStats = dueCounts[0];

    return {
      totalGrammarPoints: Number(stats.total) || 0,
      masteredCount: Number(stats.mastered) || 0,
      reviewingCount: Number(stats.reviewing) || 0,
      learningCount: Number(stats.learning) || 0,
      newCount: Number(stats.new_count) || 0,
      averageMastery: Number(avgResult[0].avg_mastery) || 0,
      dueToday: Number(dueStats.due_today) || 0,
      overdueCount: Number(dueStats.overdue) || 0,
    };
  }

  // --------------------------------------------------------
  // Learning Goals
  // --------------------------------------------------------

  /**
   * Get user's grammar learning goals
   */
  async getLearningGoals(userId: number): Promise<GrammarLearningGoals | null> {
    const [rows] = await pool.execute<GrammarGoalsRow[]>(
      `SELECT * FROM grammar_learning_goals WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Create default goals
      await pool.execute(
        `INSERT INTO grammar_learning_goals (user_id) VALUES (?)`,
        [userId]
      );
      return this.getLearningGoals(userId);
    }

    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      dailyNewRules: row.daily_new_rules,
      dailyReviews: row.daily_reviews,
      focusCategories: row.focus_categories ? JSON.parse(row.focus_categories) : undefined,
      isActive: row.is_active,
    };
  }

  /**
   * Update grammar learning goals
   */
  async updateLearningGoals(
    userId: number,
    updates: Partial<Omit<GrammarLearningGoals, 'id' | 'userId'>>
  ): Promise<GrammarLearningGoals> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.dailyNewRules !== undefined) {
      fields.push('daily_new_rules = ?');
      values.push(updates.dailyNewRules);
    }
    if (updates.dailyReviews !== undefined) {
      fields.push('daily_reviews = ?');
      values.push(updates.dailyReviews);
    }
    if (updates.focusCategories !== undefined) {
      fields.push('focus_categories = ?');
      values.push(JSON.stringify(updates.focusCategories));
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive);
    }

    if (fields.length > 0) {
      values.push(userId);
      await pool.execute(
        `UPDATE grammar_learning_goals SET ${fields.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    const goals = await this.getLearningGoals(userId);
    if (!goals) {
      throw new Error('Failed to get grammar learning goals');
    }
    return goals;
  }

  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------

  private mapToGrammarPoint(row: GrammarPointRow): GrammarPointWithReview {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      grammarRule: row.grammar_rule,
      explanation: row.explanation,
      exampleVi: row.example_vi || undefined,
      exampleEn: row.example_en || undefined,
      category: row.category || undefined,
      difficultyLevel: row.difficulty_level,
      timesPracticed: row.times_practiced,
      createdAt: row.created_at,
      nextReviewAt: row.next_review_at || undefined,
      reviewInterval: row.review_interval,
      easeFactor: Number(row.ease_factor),
      repetitionCount: row.repetition_count,
      lapseCount: row.lapse_count,
      reviewStatus: row.review_status,
      masteryLevel: this.calculateMasteryLevel(row.review_status, row.repetition_count),
    };
  }

  private mapToGrammarExercise(row: GrammarExerciseRow): GrammarExercise {
    let options: string[] | undefined;
    if (row.options) {
      try {
        options = JSON.parse(row.options);
      } catch {
        options = undefined;
      }
    }

    let verbData: { base: string; tense: string; subject: string } | undefined;
    if (row.verb_data) {
      try {
        verbData = JSON.parse(row.verb_data);
      } catch {
        verbData = undefined;
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      grammarPointId: row.grammar_point_id || undefined,
      exerciseType: row.exercise_type,
      question: row.question,
      options,
      correctAnswer: row.correct_answer,
      explanation: row.explanation || undefined,
      category: row.category || undefined,
      difficultyLevel: row.difficulty_level,
      errorPosition: row.error_position || undefined,
      verbData,
      createdAt: row.created_at,
    };
  }

  private calculateMasteryLevel(status: GrammarReviewStatus, repetitionCount: number): number {
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
}

export const grammarSpacedRepetitionService = new GrammarSpacedRepetitionService();
