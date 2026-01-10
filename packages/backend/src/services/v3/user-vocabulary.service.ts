import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

interface UserVocabularyRow extends RowDataPacket {
  id: number;
  user_id: number;
  master_vocabulary_id: number;
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
  created_at: Date;
  updated_at: Date;
  // Joined master_vocabulary fields
  english_word?: string;
  vietnamese_word?: string;
  phonetic?: string;
  part_of_speech?: string;
  cefr_level?: string;
  definitions?: string;
}

export interface UserVocabulary {
  id: number;
  userId: number;
  masterVocabularyId: number;
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
  createdAt: Date;
  updatedAt: Date;
  // Optional joined fields
  englishWord?: string;
  vietnameseWord?: string;
  phonetic?: string;
  partOfSpeech?: string;
  cefrLevel?: string;
}

export interface UserVocabularyWithMaster extends Omit<UserVocabulary, 'englishWord' | 'vietnameseWord' | 'phonetic' | 'partOfSpeech' | 'cefrLevel'> {
  englishWord: string;
  vietnameseWord: string;
  phonetic: string | null;
  partOfSpeech: string;
  cefrLevel: string;
}

export type ReviewStatusV3 = 'new' | 'learning' | 'reviewing' | 'mastered';
export type VocabularySourceTypeV3 = 'conversation' | 'word_map' | 'manual' | 'import';

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

export class UserVocabularyService {
  /**
   * Get user's vocabulary list with pagination
   */
  async getUserVocabulary(
    userId: number,
    page: number = 1,
    limit: number = 20,
    filters: {
      reviewStatus?: ReviewStatusV3;
      sourceType?: VocabularySourceTypeV3;
      cefrLevel?: string;
      searchTerm?: string;
    } = {}
  ): Promise<{ data: UserVocabularyWithMaster[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['uv.user_id = ?'];
    const params: (string | number)[] = [userId];

    if (filters.reviewStatus) {
      conditions.push('uv.review_status = ?');
      params.push(filters.reviewStatus);
    }

    if (filters.sourceType) {
      conditions.push('uv.source_type = ?');
      params.push(filters.sourceType);
    }

    if (filters.cefrLevel) {
      conditions.push('mv.cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.searchTerm) {
      conditions.push('(mv.english_word LIKE ? OR mv.vietnamese_word LIKE ?)');
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get vocabulary with master data
    const [rows] = await pool.query<UserVocabularyRow[]>(
      `SELECT uv.*, mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE ${whereClause}
       ORDER BY uv.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: rows.map(row => this.mapToUserVocabularyWithMaster(row)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get user vocabulary by ID
   */
  async getById(userId: number, id: number): Promise<UserVocabularyWithMaster | null> {
    const [rows] = await pool.execute<UserVocabularyRow[]>(
      `SELECT uv.*, mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE uv.id = ? AND uv.user_id = ?`,
      [id, userId]
    );

    return rows.length > 0 ? this.mapToUserVocabularyWithMaster(rows[0]) : null;
  }

  /**
   * Get user vocabulary by master vocabulary ID
   */
  async getByMasterVocabularyId(userId: number, masterVocabularyId: number): Promise<UserVocabulary | null> {
    const [rows] = await pool.execute<UserVocabularyRow[]>(
      'SELECT * FROM user_vocabulary WHERE user_id = ? AND master_vocabulary_id = ?',
      [userId, masterVocabularyId]
    );

    return rows.length > 0 ? this.mapToUserVocabulary(rows[0]) : null;
  }

  /**
   * Add vocabulary to user's learning list
   */
  async addVocabulary(
    userId: number,
    masterVocabularyId: number,
    sourceType: VocabularySourceTypeV3 = 'manual',
    sourceId?: number
  ): Promise<UserVocabulary> {
    // Check if already exists
    const existing = await this.getByMasterVocabularyId(userId, masterVocabularyId);
    if (existing) {
      return existing;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO user_vocabulary (
        user_id, master_vocabulary_id, source_type, source_id,
        mastery_level, times_practiced, review_interval, ease_factor,
        repetition_count, lapse_count, review_status
      ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 'new')`,
      [userId, masterVocabularyId, sourceType, sourceId || null, SM2.DEFAULT_EASE_FACTOR]
    );

    const [rows] = await pool.execute<UserVocabularyRow[]>(
      'SELECT * FROM user_vocabulary WHERE id = ?',
      [result.insertId]
    );

    return this.mapToUserVocabulary(rows[0]);
  }

  /**
   * Bulk add vocabulary (for lesson completion)
   */
  async bulkAddVocabulary(
    userId: number,
    masterVocabularyIds: number[],
    sourceType: VocabularySourceTypeV3 = 'word_map',
    sourceId?: number
  ): Promise<number> {
    if (masterVocabularyIds.length === 0) return 0;

    // Get existing vocabulary IDs
    const placeholders = masterVocabularyIds.map(() => '?').join(',');
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT master_vocabulary_id FROM user_vocabulary
       WHERE user_id = ? AND master_vocabulary_id IN (${placeholders})`,
      [userId, ...masterVocabularyIds]
    );

    const existingIds = new Set(existing.map(r => r.master_vocabulary_id as number));
    const newIds = masterVocabularyIds.filter(id => !existingIds.has(id));

    if (newIds.length === 0) return 0;

    // Insert new vocabulary
    const values = newIds.map(id =>
      `(${userId}, ${id}, '${sourceType}', ${sourceId || 'NULL'}, 0, 0, 0, ${SM2.DEFAULT_EASE_FACTOR}, 0, 0, 'new')`
    ).join(', ');

    await pool.execute(
      `INSERT INTO user_vocabulary (
        user_id, master_vocabulary_id, source_type, source_id,
        mastery_level, times_practiced, review_interval, ease_factor,
        repetition_count, lapse_count, review_status
      ) VALUES ${values}`
    );

    return newIds.length;
  }

  /**
   * Get vocabulary due for review (SM2)
   */
  async getDueForReview(
    userId: number,
    limit: number = 20
  ): Promise<UserVocabularyWithMaster[]> {
    const [rows] = await pool.query<UserVocabularyRow[]>(
      `SELECT uv.*, mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE uv.user_id = ?
         AND (uv.next_review_at IS NULL OR uv.next_review_at <= NOW())
         AND uv.review_status != 'mastered'
       ORDER BY
         CASE
           WHEN uv.next_review_at IS NULL THEN 0
           WHEN uv.next_review_at < NOW() THEN 1
           ELSE 2
         END,
         uv.next_review_at ASC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    return rows.map(row => this.mapToUserVocabularyWithMaster(row));
  }

  /**
   * Submit review result (SM2 algorithm)
   */
  async submitReview(
    userId: number,
    userVocabularyId: number,
    quality: number // 0-5 scale
  ): Promise<{
    success: boolean;
    nextReviewAt: Date | null;
    newInterval: number;
    newEaseFactor: number;
    newStatus: ReviewStatusV3;
  }> {
    const vocab = await this.getById(userId, userVocabularyId);
    if (!vocab) {
      return { success: false, nextReviewAt: null, newInterval: 0, newEaseFactor: 0, newStatus: 'new' };
    }

    // Calculate new ease factor using SM2
    let newEaseFactor = vocab.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(SM2.MIN_EASE_FACTOR, newEaseFactor);

    let newInterval: number;
    let newRepetitionCount: number;
    let newLapseCount = vocab.lapseCount;

    if (quality < 3) {
      // Failed review - reset to learning
      newInterval = 1;
      newRepetitionCount = 0;
      newLapseCount += 1;
    } else {
      // Successful review
      newRepetitionCount = vocab.repetitionCount + 1;

      if (vocab.repetitionCount === 0) {
        newInterval = 1;
      } else if (vocab.repetitionCount === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(vocab.reviewInterval * newEaseFactor * SM2.INTERVAL_MODIFIER);
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
    let newStatus: ReviewStatusV3;
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
      `UPDATE user_vocabulary SET
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
      [masteryLevel, nextReviewAt, newInterval, newEaseFactor, newRepetitionCount, newLapseCount, newStatus, userVocabularyId]
    );

    // Record review in vocabulary_reviews_v3
    await pool.execute(
      `INSERT INTO vocabulary_reviews_v3 (
        user_id, user_vocabulary_id, quality,
        ease_factor_before, ease_factor_after,
        interval_before, interval_after,
        review_type, direction, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'flashcard', 'vi_to_en', NOW())`,
      [userId, userVocabularyId, quality, vocab.easeFactor, newEaseFactor, vocab.reviewInterval, newInterval]
    );

    return {
      success: true,
      nextReviewAt,
      newInterval,
      newEaseFactor,
      newStatus,
    };
  }

  /**
   * Get user's vocabulary statistics
   */
  async getStats(userId: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCefrLevel: Record<string, number>;
    dueToday: number;
    masteredCount: number;
  }> {
    const [totalResult] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM user_vocabulary WHERE user_id = ?',
      [userId]
    );

    const [byStatus] = await pool.execute<RowDataPacket[]>(
      `SELECT review_status, COUNT(*) as count
       FROM user_vocabulary WHERE user_id = ? GROUP BY review_status`,
      [userId]
    );

    const [byCefr] = await pool.execute<RowDataPacket[]>(
      `SELECT mv.cefr_level, COUNT(*) as count
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE uv.user_id = ?
       GROUP BY mv.cefr_level`,
      [userId]
    );

    const [dueResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM user_vocabulary
       WHERE user_id = ? AND (next_review_at IS NULL OR next_review_at <= NOW())
       AND review_status != 'mastered'`,
      [userId]
    );

    const [masteredResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM user_vocabulary
       WHERE user_id = ? AND review_status = 'mastered'`,
      [userId]
    );

    return {
      total: totalResult[0].total as number,
      byStatus: Object.fromEntries(byStatus.map(r => [r.review_status, r.count])),
      byCefrLevel: Object.fromEntries(byCefr.map(r => [r.cefr_level, r.count])),
      dueToday: dueResult[0].count as number,
      masteredCount: masteredResult[0].count as number,
    };
  }

  /**
   * Remove vocabulary from user's list
   */
  async removeVocabulary(userId: number, userVocabularyId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM user_vocabulary WHERE id = ? AND user_id = ?',
      [userVocabularyId, userId]
    );
    return result.affectedRows > 0;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private mapToUserVocabulary(row: UserVocabularyRow): UserVocabulary {
    return {
      id: row.id,
      userId: row.user_id,
      masterVocabularyId: row.master_vocabulary_id,
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUserVocabularyWithMaster(row: UserVocabularyRow): UserVocabularyWithMaster {
    return {
      ...this.mapToUserVocabulary(row),
      englishWord: row.english_word || '',
      vietnameseWord: row.vietnamese_word || '',
      phonetic: row.phonetic || null,
      partOfSpeech: row.part_of_speech || '',
      cefrLevel: row.cefr_level || '',
    };
  }
}

export const userVocabularyService = new UserVocabularyService();
