import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { GrammarExample } from './master-grammar.service.js';

// ============================================================
// Types
// ============================================================

interface UserGrammarRow extends RowDataPacket {
  id: number;
  user_id: number;
  master_grammar_id: number;
  source_type: string;
  source_id: number | null;
  mastery_level: number;
  times_practiced: number;
  last_practiced_at: Date | null;
  next_review_at: Date | null;
  review_interval: number;
  ease_factor: number;
  repetition_count: number;
  lapse_count: number;
  review_status: string;
  user_notes: string | null;
  is_favorited: boolean;
  created_at: Date;
  updated_at: Date;
  // Joined master_grammar fields
  grammar_rule?: string;
  category?: string;
  subcategory?: string;
  cefr_level?: string;
  difficulty_level?: string;
  explanation?: string;
  explanation_vi?: string;
  formula?: string;
  examples?: string;
}

export interface UserGrammar {
  id: number;
  userId: number;
  masterGrammarId: number;
  sourceType: string;
  sourceId: number | null;
  masteryLevel: number;
  timesPracticed: number;
  lastPracticedAt: Date | null;
  nextReviewAt: Date | null;
  reviewInterval: number;
  easeFactor: number;
  repetitionCount: number;
  lapseCount: number;
  reviewStatus: string;
  userNotes: string | null;
  isFavorited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserGrammarWithMaster extends UserGrammar {
  grammarRule: string;
  category: string;
  subcategory: string | null;
  cefrLevel: string;
  difficultyLevel: string;
  explanation: string;
  explanationVi: string;
  formula: string | null;
  examples: GrammarExample[];
}

// GrammarExample is imported from master-grammar.service

export type GrammarReviewStatusV3 = 'new' | 'learning' | 'reviewing' | 'mastered';
export type GrammarSourceTypeV3 = 'conversation' | 'word_map' | 'manual' | 'import';

// SM2 algorithm constants
const SM2 = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  EASY_BONUS: 1.3,
  INTERVAL_MODIFIER: 1.0,
};

// ============================================================
// Service
// ============================================================

export class UserGrammarService {
  /**
   * Get user's grammar list with pagination
   */
  async getUserGrammar(
    userId: number,
    page: number = 1,
    limit: number = 20,
    filters: {
      reviewStatus?: GrammarReviewStatusV3;
      sourceType?: GrammarSourceTypeV3;
      category?: string;
      cefrLevel?: string;
      searchTerm?: string;
      favoritesOnly?: boolean;
    } = {}
  ): Promise<{ data: UserGrammarWithMaster[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['ug.user_id = ?'];
    const params: (string | number)[] = [userId];

    if (filters.reviewStatus) {
      conditions.push('ug.review_status = ?');
      params.push(filters.reviewStatus);
    }

    if (filters.sourceType) {
      conditions.push('ug.source_type = ?');
      params.push(filters.sourceType);
    }

    if (filters.category) {
      conditions.push('mg.category = ?');
      params.push(filters.category);
    }

    if (filters.cefrLevel) {
      conditions.push('mg.cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.searchTerm) {
      conditions.push('(mg.grammar_rule LIKE ? OR mg.explanation LIKE ? OR mg.explanation_vi LIKE ?)');
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.favoritesOnly) {
      conditions.push('ug.is_favorited = TRUE');
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get grammar with master data
    const [rows] = await pool.query<UserGrammarRow[]>(
      `SELECT ug.*,
        mg.grammar_rule, mg.category, mg.subcategory, mg.cefr_level,
        mg.difficulty_level, mg.explanation, mg.explanation_vi, mg.formula, mg.examples
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ${whereClause}
       ORDER BY ug.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: rows.map(row => this.mapToUserGrammarWithMaster(row)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get user grammar by ID
   */
  async getById(userId: number, id: number): Promise<UserGrammarWithMaster | null> {
    const [rows] = await pool.execute<UserGrammarRow[]>(
      `SELECT ug.*,
        mg.grammar_rule, mg.category, mg.subcategory, mg.cefr_level,
        mg.difficulty_level, mg.explanation, mg.explanation_vi, mg.formula, mg.examples
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.id = ? AND ug.user_id = ?`,
      [id, userId]
    );

    return rows.length > 0 ? this.mapToUserGrammarWithMaster(rows[0]) : null;
  }

  /**
   * Get user grammar by master grammar ID
   */
  async getByMasterGrammarId(userId: number, masterGrammarId: number): Promise<UserGrammar | null> {
    const [rows] = await pool.execute<UserGrammarRow[]>(
      'SELECT * FROM user_grammar WHERE user_id = ? AND master_grammar_id = ?',
      [userId, masterGrammarId]
    );

    return rows.length > 0 ? this.mapToUserGrammar(rows[0]) : null;
  }

  /**
   * Add grammar to user's learning list
   */
  async addGrammar(
    userId: number,
    masterGrammarId: number,
    sourceType: GrammarSourceTypeV3 = 'manual',
    sourceId?: number
  ): Promise<UserGrammar> {
    // Check if already exists
    const existing = await this.getByMasterGrammarId(userId, masterGrammarId);
    if (existing) {
      return existing;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO user_grammar (
        user_id, master_grammar_id, source_type, source_id,
        mastery_level, times_practiced, review_interval, ease_factor,
        repetition_count, lapse_count, review_status
      ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 'new')`,
      [userId, masterGrammarId, sourceType, sourceId || null, SM2.DEFAULT_EASE_FACTOR]
    );

    const [rows] = await pool.execute<UserGrammarRow[]>(
      'SELECT * FROM user_grammar WHERE id = ?',
      [result.insertId]
    );

    return this.mapToUserGrammar(rows[0]);
  }

  /**
   * Bulk add grammar (for lesson completion)
   */
  async bulkAddGrammar(
    userId: number,
    masterGrammarIds: number[],
    sourceType: GrammarSourceTypeV3 = 'word_map',
    sourceId?: number
  ): Promise<number> {
    if (masterGrammarIds.length === 0) return 0;

    // Get existing grammar IDs
    const placeholders = masterGrammarIds.map(() => '?').join(',');
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT master_grammar_id FROM user_grammar
       WHERE user_id = ? AND master_grammar_id IN (${placeholders})`,
      [userId, ...masterGrammarIds]
    );

    const existingIds = new Set(existing.map(r => r.master_grammar_id as number));
    const newIds = masterGrammarIds.filter(id => !existingIds.has(id));

    if (newIds.length === 0) return 0;

    // Insert new grammar
    const values = newIds.map(id =>
      `(${userId}, ${id}, '${sourceType}', ${sourceId || 'NULL'}, 0, 0, 0, ${SM2.DEFAULT_EASE_FACTOR}, 0, 0, 'new')`
    ).join(', ');

    await pool.execute(
      `INSERT INTO user_grammar (
        user_id, master_grammar_id, source_type, source_id,
        mastery_level, times_practiced, review_interval, ease_factor,
        repetition_count, lapse_count, review_status
      ) VALUES ${values}`
    );

    return newIds.length;
  }

  /**
   * Get grammar due for review (SM2)
   */
  async getDueForReview(
    userId: number,
    limit: number = 20
  ): Promise<UserGrammarWithMaster[]> {
    const [rows] = await pool.query<UserGrammarRow[]>(
      `SELECT ug.*,
        mg.grammar_rule, mg.category, mg.subcategory, mg.cefr_level,
        mg.difficulty_level, mg.explanation, mg.explanation_vi, mg.formula, mg.examples
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.user_id = ?
         AND (ug.next_review_at IS NULL OR ug.next_review_at <= NOW())
         AND ug.review_status != 'mastered'
       ORDER BY
         CASE
           WHEN ug.next_review_at IS NULL THEN 0
           WHEN ug.next_review_at < NOW() THEN 1
           ELSE 2
         END,
         ug.next_review_at ASC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    return rows.map(row => this.mapToUserGrammarWithMaster(row));
  }

  /**
   * Get grammar review queue with categorization
   */
  async getReviewQueue(userId: number, limit: number = 50): Promise<{
    overdue: UserGrammarWithMaster[];
    due: UserGrammarWithMaster[];
    newItems: UserGrammarWithMaster[];
    total: number;
  }> {
    // Get overdue items
    const [overdueRows] = await pool.query<UserGrammarRow[]>(
      `SELECT ug.*,
        mg.grammar_rule, mg.category, mg.subcategory, mg.cefr_level,
        mg.difficulty_level, mg.explanation, mg.explanation_vi, mg.formula, mg.examples
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.user_id = ?
         AND ug.next_review_at IS NOT NULL
         AND ug.next_review_at < DATE(NOW())
         AND ug.review_status != 'mastered'
       ORDER BY ug.next_review_at ASC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    // Get due today items
    const [dueRows] = await pool.query<UserGrammarRow[]>(
      `SELECT ug.*,
        mg.grammar_rule, mg.category, mg.subcategory, mg.cefr_level,
        mg.difficulty_level, mg.explanation, mg.explanation_vi, mg.formula, mg.examples
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.user_id = ?
         AND ug.next_review_at IS NOT NULL
         AND DATE(ug.next_review_at) = DATE(NOW())
         AND ug.review_status != 'mastered'
       ORDER BY ug.next_review_at ASC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    // Get new items (never reviewed)
    const [newRows] = await pool.query<UserGrammarRow[]>(
      `SELECT ug.*,
        mg.grammar_rule, mg.category, mg.subcategory, mg.cefr_level,
        mg.difficulty_level, mg.explanation, mg.explanation_vi, mg.formula, mg.examples
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.user_id = ?
         AND ug.next_review_at IS NULL
         AND ug.review_status = 'new'
       ORDER BY ug.created_at ASC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    // Get total count
    const [totalResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM user_grammar
       WHERE user_id = ?
         AND (next_review_at IS NULL OR next_review_at <= NOW())
         AND review_status != 'mastered'`,
      [userId]
    );

    return {
      overdue: overdueRows.map(row => this.mapToUserGrammarWithMaster(row)),
      due: dueRows.map(row => this.mapToUserGrammarWithMaster(row)),
      newItems: newRows.map(row => this.mapToUserGrammarWithMaster(row)),
      total: totalResult[0].count as number,
    };
  }

  /**
   * Submit review result (SM2 algorithm)
   */
  async submitReview(
    userId: number,
    userGrammarId: number,
    quality: number, // 0-5 scale
    timeSpentSeconds?: number
  ): Promise<{
    success: boolean;
    nextReviewAt: Date | null;
    newInterval: number;
    newEaseFactor: number;
    newStatus: GrammarReviewStatusV3;
    intervalText: string;
  }> {
    const grammar = await this.getById(userId, userGrammarId);
    if (!grammar) {
      return {
        success: false,
        nextReviewAt: null,
        newInterval: 0,
        newEaseFactor: 0,
        newStatus: 'new',
        intervalText: '',
      };
    }

    // Calculate new ease factor using SM2
    let newEaseFactor = grammar.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(SM2.MIN_EASE_FACTOR, newEaseFactor);

    let newInterval: number;
    let newRepetitionCount: number;
    let newLapseCount = grammar.lapseCount;

    if (quality < 3) {
      // Failed review - reset to learning
      newInterval = 1;
      newRepetitionCount = 0;
      newLapseCount += 1;
    } else {
      // Successful review
      newRepetitionCount = grammar.repetitionCount + 1;

      if (grammar.repetitionCount === 0) {
        newInterval = 1;
      } else if (grammar.repetitionCount === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(grammar.reviewInterval * newEaseFactor * SM2.INTERVAL_MODIFIER);
      }

      // Easy bonus
      if (quality === 5) {
        newInterval = Math.round(newInterval * SM2.EASY_BONUS);
      }
    }

    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    // Determine new status
    let newStatus: GrammarReviewStatusV3;
    if (newRepetitionCount === 0) {
      newStatus = 'learning';
    } else if (newInterval >= 21) {
      newStatus = 'mastered';
    } else {
      newStatus = 'reviewing';
    }

    // Calculate mastery level (0-100)
    const masteryLevel = Math.min(100, Math.round(
      (newRepetitionCount / 10) * 50 +
      ((newEaseFactor - SM2.MIN_EASE_FACTOR) / (3.0 - SM2.MIN_EASE_FACTOR)) * 30 +
      (quality / 5) * 20
    ));

    // Update database
    await pool.execute(
      `UPDATE user_grammar SET
        mastery_level = ?,
        times_practiced = times_practiced + 1,
        last_practiced_at = NOW(),
        next_review_at = ?,
        review_interval = ?,
        ease_factor = ?,
        repetition_count = ?,
        lapse_count = ?,
        review_status = ?
      WHERE id = ?`,
      [masteryLevel, nextReviewAt, newInterval, newEaseFactor, newRepetitionCount, newLapseCount, newStatus, userGrammarId]
    );

    // Record review in grammar_reviews_v3
    await pool.execute(
      `INSERT INTO grammar_reviews_v3 (
        user_id, user_grammar_id, quality,
        ease_factor_before, ease_factor_after,
        interval_before, interval_after,
        review_type, time_spent_seconds, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'flashcard', ?, NOW())`,
      [userId, userGrammarId, quality, grammar.easeFactor, newEaseFactor, grammar.reviewInterval, newInterval, timeSpentSeconds || 0]
    );

    return {
      success: true,
      nextReviewAt,
      newInterval,
      newEaseFactor,
      newStatus,
      intervalText: this.formatInterval(newInterval),
    };
  }

  /**
   * Get user's grammar statistics
   */
  async getStats(userId: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byCefrLevel: Record<string, number>;
    dueToday: number;
    masteredCount: number;
    averageEaseFactor: number;
  }> {
    const [totalResult] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM user_grammar WHERE user_id = ?',
      [userId]
    );

    const [byStatus] = await pool.execute<RowDataPacket[]>(
      `SELECT review_status, COUNT(*) as count
       FROM user_grammar WHERE user_id = ? GROUP BY review_status`,
      [userId]
    );

    const [byCategory] = await pool.execute<RowDataPacket[]>(
      `SELECT mg.category, COUNT(*) as count
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.user_id = ?
       GROUP BY mg.category`,
      [userId]
    );

    const [byCefr] = await pool.execute<RowDataPacket[]>(
      `SELECT mg.cefr_level, COUNT(*) as count
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.user_id = ?
       GROUP BY mg.cefr_level`,
      [userId]
    );

    const [dueResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM user_grammar
       WHERE user_id = ? AND (next_review_at IS NULL OR next_review_at <= NOW())
       AND review_status != 'mastered'`,
      [userId]
    );

    const [masteredResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM user_grammar
       WHERE user_id = ? AND review_status = 'mastered'`,
      [userId]
    );

    const [avgEfResult] = await pool.execute<RowDataPacket[]>(
      `SELECT AVG(ease_factor) as avg FROM user_grammar WHERE user_id = ?`,
      [userId]
    );

    return {
      total: totalResult[0].total as number,
      byStatus: Object.fromEntries(byStatus.map(r => [r.review_status, r.count])),
      byCategory: Object.fromEntries(byCategory.map(r => [r.category, r.count])),
      byCefrLevel: Object.fromEntries(byCefr.map(r => [r.cefr_level, r.count])),
      dueToday: dueResult[0].count as number,
      masteredCount: masteredResult[0].count as number,
      averageEaseFactor: avgEfResult[0].avg as number || SM2.DEFAULT_EASE_FACTOR,
    };
  }

  /**
   * Get available grammar categories for a user
   */
  async getCategories(userId: number): Promise<{ category: string; count: number }[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT mg.category, COUNT(*) as count
       FROM user_grammar ug
       JOIN master_grammar mg ON ug.master_grammar_id = mg.id
       WHERE ug.user_id = ?
       GROUP BY mg.category
       ORDER BY count DESC`,
      [userId]
    );

    return rows.map(r => ({ category: r.category as string, count: r.count as number }));
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(userId: number, userGrammarId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE user_grammar SET is_favorited = NOT is_favorited
       WHERE id = ? AND user_id = ?`,
      [userGrammarId, userId]
    );

    if (result.affectedRows === 0) {
      return false;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT is_favorited FROM user_grammar WHERE id = ?',
      [userGrammarId]
    );

    return rows[0].is_favorited as boolean;
  }

  /**
   * Update user notes for a grammar item
   */
  async updateNotes(userId: number, userGrammarId: number, notes: string | null): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE user_grammar SET user_notes = ?
       WHERE id = ? AND user_id = ?`,
      [notes, userGrammarId, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Remove grammar from user's list
   */
  async removeGrammar(userId: number, userGrammarId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM user_grammar WHERE id = ? AND user_id = ?',
      [userGrammarId, userId]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private mapToUserGrammar(row: UserGrammarRow): UserGrammar {
    return {
      id: row.id,
      userId: row.user_id,
      masterGrammarId: row.master_grammar_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      masteryLevel: row.mastery_level,
      timesPracticed: row.times_practiced,
      lastPracticedAt: row.last_practiced_at,
      nextReviewAt: row.next_review_at,
      reviewInterval: row.review_interval,
      easeFactor: row.ease_factor,
      repetitionCount: row.repetition_count,
      lapseCount: row.lapse_count,
      reviewStatus: row.review_status,
      userNotes: row.user_notes,
      isFavorited: row.is_favorited,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUserGrammarWithMaster(row: UserGrammarRow): UserGrammarWithMaster {
    let examples: GrammarExample[] = [];
    try {
      if (row.examples) {
        const parsed = typeof row.examples === 'string' ? JSON.parse(row.examples) : row.examples;
        examples = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      examples = [];
    }

    return {
      ...this.mapToUserGrammar(row),
      grammarRule: row.grammar_rule || '',
      category: row.category || '',
      subcategory: row.subcategory || null,
      cefrLevel: row.cefr_level || '',
      difficultyLevel: row.difficulty_level || 'beginner',
      explanation: row.explanation || '',
      explanationVi: row.explanation_vi || '',
      formula: row.formula || null,
      examples,
    };
  }

  private formatInterval(days: number): string {
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days === 7) return '1 week';
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    if (days === 30) return '1 month';
    if (days < 365) return `${Math.round(days / 30)} months`;
    return `${Math.round(days / 365)} years`;
  }
}

export const userGrammarService = new UserGrammarService();
