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

// Extended row for full dictionary entry
interface DictionaryEntryRow extends UserVocabularyRow {
  pronunciation_uk?: string;
  pronunciation_us?: string;
  audio_uk_url?: string;
  audio_us_url?: string;
  difficulty_level?: string;
  word_forms?: string;
  word_family?: string;
  synonyms?: string;
  antonyms?: string;
  collocations?: string;
  idioms?: string;
  usage_notes?: string;
  grammar_info?: string;
  register?: string;
  extra_examples?: string;
  frequency_rank?: number;
  topics?: string;
  word_origin?: string;
  see_also?: string;
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
  // Source info for review display
  sourceName?: string; // Word Map name or "Conversation"
  lessonTitle?: string;
  unitName?: string;
}

// Full dictionary entry with all master vocabulary data
export interface DictionaryEntryV3 extends UserVocabularyWithMaster {
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  audioUkUrl: string | null;
  audioUsUrl: string | null;
  difficultyLevel: string;
  definitions: Definition[] | null;
  wordForms: Record<string, string> | null;
  wordFamily: Record<string, string[]> | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  collocations: Record<string, string[]> | null;
  idioms: Idiom[] | null;
  usageNotes: string | null;
  grammarInfo: Record<string, unknown> | null;
  register: string;
  extraExamples: Example[] | null;
  frequencyRank: number | null;
  topics: Topic[] | null;
  wordOrigin: string | null;
  seeAlso: string[] | null;
  definitionCount: number;
  exampleCount: number;
}

interface Definition {
  definition: string;
  definitionVi: string;
  grammar?: string;
  register?: string;
  examples: Example[];
  patterns?: string[];
}

interface Example {
  en: string;
  vi: string;
}

interface Idiom {
  phrase: string;
  meaning: string;
  meaningVi: string;
}

interface Topic {
  name: string;
  level: string;
}

export type ReviewStatusV3 = 'new' | 'learning' | 'reviewing' | 'mastered';
export type VocabularySourceTypeV3 = 'conversation' | 'word_map' | 'manual' | 'import';

export interface VocabularyFiltersV3 {
  reviewStatus?: ReviewStatusV3;
  sourceType?: VocabularySourceTypeV3;
  cefrLevel?: string;
  partOfSpeech?: string;
  searchTerm?: string;
  mapId?: number;
  unitId?: number;
  lessonId?: number;
}

export interface AvailableFilters {
  maps: Array<{ id: number; name: string; vocabularyCount: number }>;
  units: Array<{ id: number; name: string; mapId: number; vocabularyCount: number }>;
  lessons: Array<{ id: number; title: string; unitId: number; mapId: number; vocabularyCount: number }>;
  cefrLevels: Array<{ level: string; count: number }>;
  sourceTypes: Array<{ type: string; count: number }>;
  reviewStatuses: Array<{ status: string; count: number }>;
}

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
   * Get user's vocabulary list with pagination and advanced filters
   */
  async getUserVocabulary(
    userId: number,
    page: number = 1,
    limit: number = 20,
    filters: VocabularyFiltersV3 = {}
  ): Promise<{ data: UserVocabularyWithMaster[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['uv.user_id = ?'];
    const params: (string | number)[] = [userId];
    let needsLessonJoin = false;

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

    if (filters.partOfSpeech) {
      conditions.push('mv.part_of_speech = ?');
      params.push(filters.partOfSpeech);
    }

    if (filters.searchTerm) {
      conditions.push('(mv.english_word LIKE ? OR mv.vietnamese_word LIKE ?)');
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    // Word Map filters - need to join with lesson_content to find vocabulary linked to lessons
    if (filters.mapId || filters.unitId || filters.lessonId) {
      needsLessonJoin = true;

      if (filters.lessonId) {
        conditions.push('lc.lesson_id = ?');
        params.push(filters.lessonId);
      } else if (filters.unitId) {
        conditions.push('ul.unit_id = ?');
        params.push(filters.unitId);
      } else if (filters.mapId) {
        conditions.push('wmu.map_id = ?');
        params.push(filters.mapId);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Build JOIN clause based on filters
    let joinClause = 'JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id';
    if (needsLessonJoin) {
      joinClause += `
        LEFT JOIN lesson_content lc ON lc.master_vocabulary_id = mv.id AND lc.content_type = 'vocabulary'
        LEFT JOIN unit_lessons ul ON ul.id = lc.lesson_id
        LEFT JOIN map_units wmu ON wmu.id = ul.unit_id`;
    }

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT uv.id) as total FROM user_vocabulary uv
       ${joinClause}
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get vocabulary with master data
    const [rows] = await pool.query<UserVocabularyRow[]>(
      `SELECT DISTINCT uv.*, mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level
       FROM user_vocabulary uv
       ${joinClause}
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
   * Get full dictionary entry by user vocabulary ID
   * Returns all master vocabulary data + user progress
   */
  async getDictionaryEntryById(userId: number, id: number): Promise<DictionaryEntryV3 | null> {
    const [rows] = await pool.execute<DictionaryEntryRow[]>(
      `SELECT uv.*,
              mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level,
              mv.pronunciation_uk, mv.pronunciation_us, mv.audio_uk_url, mv.audio_us_url,
              mv.difficulty_level, mv.definitions, mv.word_forms, mv.word_family,
              mv.synonyms, mv.antonyms, mv.collocations, mv.idioms, mv.usage_notes,
              mv.grammar_info, mv.register, mv.extra_examples, mv.frequency_rank,
              mv.topics, mv.word_origin, mv.see_also
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE uv.id = ? AND uv.user_id = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToDictionaryEntry(rows[0]);
  }

  /**
   * Get dictionary entry by English word
   */
  async getDictionaryByWord(userId: number, word: string): Promise<DictionaryEntryV3 | null> {
    const [rows] = await pool.execute<DictionaryEntryRow[]>(
      `SELECT uv.*,
              mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level,
              mv.pronunciation_uk, mv.pronunciation_us, mv.audio_uk_url, mv.audio_us_url,
              mv.difficulty_level, mv.definitions, mv.word_forms, mv.word_family,
              mv.synonyms, mv.antonyms, mv.collocations, mv.idioms, mv.usage_notes,
              mv.grammar_info, mv.register, mv.extra_examples, mv.frequency_rank,
              mv.topics, mv.word_origin, mv.see_also
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE mv.english_word = ? AND uv.user_id = ?
       LIMIT 1`,
      [word, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToDictionaryEntry(rows[0]);
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
   * Get vocabulary due for review (SM2) with source information
   */
  async getDueForReview(
    userId: number,
    limit: number = 20,
    options?: {
      sourceType?: VocabularySourceTypeV3;
      mapId?: number;
    }
  ): Promise<UserVocabularyWithMaster[]> {
    const conditions: string[] = [
      'uv.user_id = ?',
      '(uv.next_review_at IS NULL OR uv.next_review_at <= NOW())',
      "uv.review_status != 'mastered'"
    ];
    const params: any[] = [userId];

    // Add optional filters
    if (options?.sourceType) {
      conditions.push('uv.source_type = ?');
      params.push(options.sourceType);
    }
    if (options?.mapId) {
      conditions.push(`uv.master_vocabulary_id IN (
        SELECT lc.master_vocabulary_id
        FROM lesson_content lc
        JOIN unit_lessons ul ON ul.id = lc.lesson_id
        JOIN map_units wmu ON wmu.id = ul.unit_id
        WHERE wmu.map_id = ? AND lc.content_type = 'vocabulary'
      )`);
      params.push(options.mapId);
    }

    params.push(Number(limit));

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT uv.*, mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.cefr_level,
              wm.name as word_map_name, wmu.title as unit_name, ul.title as lesson_title
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       LEFT JOIN lesson_content lc ON lc.master_vocabulary_id = mv.id AND lc.content_type = 'vocabulary'
       LEFT JOIN unit_lessons ul ON ul.id = lc.lesson_id
       LEFT JOIN map_units wmu ON wmu.id = ul.unit_id
       LEFT JOIN word_maps wm ON wm.id = wmu.map_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY uv.id
       ORDER BY
         CASE
           WHEN uv.next_review_at IS NULL THEN 0
           WHEN uv.next_review_at < NOW() THEN 1
           ELSE 2
         END,
         uv.next_review_at ASC
       LIMIT ?`,
      params
    );

    return rows.map(row => ({
      ...this.mapToUserVocabularyWithMaster(row as UserVocabularyRow),
      sourceName: row.word_map_name || (row.source_type === 'conversation' ? 'Conversation' : row.source_type),
      unitName: row.unit_name || undefined,
      lessonTitle: row.lesson_title || undefined,
    }));
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

  /**
   * Get available filter options for user's vocabulary
   */
  async getAvailableFilters(userId: number): Promise<AvailableFilters> {
    // Get Word Maps that have vocabulary user has learned
    const [maps] = await pool.execute<RowDataPacket[]>(
      `SELECT wm.id, wm.name, COUNT(DISTINCT uv.id) as vocabularyCount
       FROM word_maps wm
       JOIN map_units wmu ON wmu.map_id = wm.id
       JOIN unit_lessons ul ON ul.unit_id = wmu.id
       JOIN lesson_content lc ON lc.lesson_id = ul.id AND lc.content_type = 'vocabulary'
       JOIN user_vocabulary uv ON uv.master_vocabulary_id = lc.master_vocabulary_id AND uv.user_id = ?
       GROUP BY wm.id, wm.name
       ORDER BY wm.name`,
      [userId]
    );

    // Get Units that have vocabulary user has learned
    const [units] = await pool.execute<RowDataPacket[]>(
      `SELECT wmu.id, wmu.title as name, wmu.map_id as mapId, COUNT(DISTINCT uv.id) as vocabularyCount
       FROM map_units wmu
       JOIN unit_lessons ul ON ul.unit_id = wmu.id
       JOIN lesson_content lc ON lc.lesson_id = ul.id AND lc.content_type = 'vocabulary'
       JOIN user_vocabulary uv ON uv.master_vocabulary_id = lc.master_vocabulary_id AND uv.user_id = ?
       GROUP BY wmu.id, wmu.title, wmu.map_id
       ORDER BY wmu.map_id, wmu.display_order`,
      [userId]
    );

    // Get Lessons that have vocabulary user has learned
    const [lessons] = await pool.execute<RowDataPacket[]>(
      `SELECT ul.id, ul.title, ul.unit_id as unitId, wmu.map_id as mapId, COUNT(DISTINCT uv.id) as vocabularyCount
       FROM unit_lessons ul
       JOIN map_units wmu ON wmu.id = ul.unit_id
       JOIN lesson_content lc ON lc.lesson_id = ul.id AND lc.content_type = 'vocabulary'
       JOIN user_vocabulary uv ON uv.master_vocabulary_id = lc.master_vocabulary_id AND uv.user_id = ?
       GROUP BY ul.id, ul.title, ul.unit_id, wmu.map_id
       ORDER BY wmu.map_id, wmu.display_order, ul.lesson_number`,
      [userId]
    );

    // Get CEFR levels with counts
    const [cefrLevels] = await pool.execute<RowDataPacket[]>(
      `SELECT mv.cefr_level as level, COUNT(*) as count
       FROM user_vocabulary uv
       JOIN master_vocabulary mv ON uv.master_vocabulary_id = mv.id
       WHERE uv.user_id = ?
       GROUP BY mv.cefr_level
       ORDER BY FIELD(mv.cefr_level, 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')`,
      [userId]
    );

    // Get source types with counts
    const [sourceTypes] = await pool.execute<RowDataPacket[]>(
      `SELECT source_type as type, COUNT(*) as count
       FROM user_vocabulary
       WHERE user_id = ?
       GROUP BY source_type
       ORDER BY source_type`,
      [userId]
    );

    // Get review statuses with counts
    const [reviewStatuses] = await pool.execute<RowDataPacket[]>(
      `SELECT review_status as status, COUNT(*) as count
       FROM user_vocabulary
       WHERE user_id = ?
       GROUP BY review_status
       ORDER BY FIELD(review_status, 'new', 'learning', 'reviewing', 'mastered')`,
      [userId]
    );

    return {
      maps: maps.map(r => ({ id: r.id, name: r.name, vocabularyCount: r.vocabularyCount })),
      units: units.map(r => ({ id: r.id, name: r.name, mapId: r.mapId, vocabularyCount: r.vocabularyCount })),
      lessons: lessons.map(r => ({ id: r.id, title: r.title, unitId: r.unitId, mapId: r.mapId, vocabularyCount: r.vocabularyCount })),
      cefrLevels: cefrLevels.map(r => ({ level: r.level, count: r.count })),
      sourceTypes: sourceTypes.map(r => ({ type: r.type, count: r.count })),
      reviewStatuses: reviewStatuses.map(r => ({ status: r.status, count: r.count })),
    };
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

  private mapToDictionaryEntry(row: DictionaryEntryRow): DictionaryEntryV3 {
    const definitions = this.parseJson<Definition[]>(row.definitions);

    // Calculate definition and example counts
    let definitionCount = 0;
    let exampleCount = 0;
    if (definitions && Array.isArray(definitions)) {
      definitionCount = definitions.length;
      exampleCount = definitions.reduce((count, def) => {
        return count + (def.examples?.length || 0);
      }, 0);
    }

    return {
      ...this.mapToUserVocabularyWithMaster(row),
      pronunciationUk: row.pronunciation_uk || null,
      pronunciationUs: row.pronunciation_us || null,
      audioUkUrl: row.audio_uk_url || null,
      audioUsUrl: row.audio_us_url || null,
      difficultyLevel: row.difficulty_level || 'beginner',
      definitions,
      wordForms: this.parseJson<Record<string, string>>(row.word_forms),
      wordFamily: this.parseJson<Record<string, string[]>>(row.word_family),
      synonyms: this.parseJson<string[]>(row.synonyms),
      antonyms: this.parseJson<string[]>(row.antonyms),
      collocations: this.parseJson<Record<string, string[]>>(row.collocations),
      idioms: this.parseJson<Idiom[]>(row.idioms),
      usageNotes: row.usage_notes || null,
      grammarInfo: this.parseJson<Record<string, unknown>>(row.grammar_info),
      register: row.register || 'neutral',
      extraExamples: this.parseJson<Example[]>(row.extra_examples),
      frequencyRank: row.frequency_rank || null,
      topics: this.parseJson<Topic[]>(row.topics),
      wordOrigin: row.word_origin || null,
      seeAlso: this.parseJson<string[]>(row.see_also),
      definitionCount,
      exampleCount,
    };
  }

  private parseJson<T>(value: string | object | null | undefined): T | null {
    if (!value) return null;
    if (typeof value === 'object') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
}

export const userVocabularyService = new UserVocabularyService();
