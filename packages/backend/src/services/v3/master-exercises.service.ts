import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

export type ExerciseTypeV3 =
  | 'multiple_choice'
  | 'fill_blank'
  | 'translation'
  | 'sentence_building'
  | 'matching'
  | 'spelling'
  | 'listening'
  | 'error_correction'
  | 'verb_conjugation'
  | 'cloze'
  | 'article_usage'
  | 'preposition_fill'
  | 'tense_selection'
  | 'sentence_transformation'
  | 'word_order';

interface MasterExerciseRow extends RowDataPacket {
  id: number;
  exercise_type: string;
  question: string;
  options: string | null;
  correct_answer: string;
  explanation: string | null;
  explanation_vi: string | null;
  exercise_data: string | null;
  audio_url: string | null;
  image_url: string | null;
  difficulty_level: string;
  cefr_level: string | null;
  time_limit_seconds: number;
  points: number;
  related_vocabulary_ids: string | null;
  related_grammar_ids: string | null;
  category: string | null;
  tags: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface MasterExerciseItem {
  id: number;
  exerciseType: ExerciseTypeV3;
  question: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  explanationVi: string | null;
  exerciseData: Record<string, unknown> | null;
  audioUrl: string | null;
  imageUrl: string | null;
  difficultyLevel: string;
  cefrLevel: string | null;
  timeLimitSeconds: number;
  points: number;
  relatedVocabularyIds: number[] | null;
  relatedGrammarIds: number[] | null;
  category: string | null;
  tags: string[] | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface MasterExerciseFilters {
  exerciseType?: ExerciseTypeV3;
  cefrLevel?: string;
  difficultyLevel?: string;
  category?: string;
  tag?: string;
  hasAudio?: boolean;
  isActive?: boolean;
}

export interface CreateMasterExerciseInput {
  exerciseType: ExerciseTypeV3;
  question: string;
  correctAnswer: string;
  options?: string[];
  explanation?: string;
  explanationVi?: string;
  exerciseData?: Record<string, unknown>;
  audioUrl?: string;
  imageUrl?: string;
  difficultyLevel?: string;
  cefrLevel?: string;
  timeLimitSeconds?: number;
  points?: number;
  relatedVocabularyIds?: number[];
  relatedGrammarIds?: number[];
  category?: string;
  tags?: string[];
  createdBy?: number;
}

// ============================================================
// Service
// ============================================================

export class MasterExercisesService {
  /**
   * Get all master exercises with pagination and filters
   */
  async getAll(
    page: number = 1,
    limit: number = 20,
    filters: MasterExerciseFilters = {}
  ): Promise<{ data: MasterExerciseItem[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (filters.exerciseType) {
      conditions.push('exercise_type = ?');
      params.push(filters.exerciseType);
    }

    if (filters.cefrLevel) {
      conditions.push('cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.difficultyLevel) {
      conditions.push('difficulty_level = ?');
      params.push(filters.difficultyLevel);
    }

    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters.tag) {
      conditions.push('JSON_CONTAINS(tags, ?)');
      params.push(JSON.stringify(filters.tag));
    }

    if (filters.hasAudio !== undefined) {
      conditions.push(filters.hasAudio ? 'audio_url IS NOT NULL' : 'audio_url IS NULL');
    }

    if (filters.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.isActive);
    } else {
      conditions.push('is_active = TRUE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM master_exercises ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;

    // Get exercises with pagination
    const [rows] = await pool.query<MasterExerciseRow[]>(
      `SELECT * FROM master_exercises ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: rows.map(row => this.mapToMasterExerciseItem(row)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get master exercise by ID
   */
  async getById(id: number): Promise<MasterExerciseItem | null> {
    const [rows] = await pool.execute<MasterExerciseRow[]>(
      'SELECT * FROM master_exercises WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToMasterExerciseItem(rows[0]);
  }

  /**
   * Get exercises by IDs (for exams)
   */
  async getByIds(ids: number[]): Promise<MasterExerciseItem[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query<MasterExerciseRow[]>(
      `SELECT * FROM master_exercises WHERE id IN (${placeholders}) AND is_active = TRUE`,
      ids
    );

    return rows.map(row => this.mapToMasterExerciseItem(row));
  }

  /**
   * Get exercises by type
   */
  async getByType(exerciseType: ExerciseTypeV3, limit: number = 20): Promise<MasterExerciseItem[]> {
    const [rows] = await pool.query<MasterExerciseRow[]>(
      `SELECT * FROM master_exercises
       WHERE exercise_type = ? AND is_active = TRUE
       ORDER BY RAND()
       LIMIT ?`,
      [exerciseType, Number(limit)]
    );

    return rows.map(row => this.mapToMasterExerciseItem(row));
  }

  /**
   * Get exercises for vocabulary (related vocabulary IDs)
   */
  async getForVocabulary(vocabularyId: number, limit: number = 10): Promise<MasterExerciseItem[]> {
    const [rows] = await pool.query<MasterExerciseRow[]>(
      `SELECT * FROM master_exercises
       WHERE is_active = TRUE AND JSON_CONTAINS(related_vocabulary_ids, ?)
       ORDER BY RAND()
       LIMIT ?`,
      [JSON.stringify(vocabularyId), Number(limit)]
    );

    return rows.map(row => this.mapToMasterExerciseItem(row));
  }

  /**
   * Get exercises for grammar (related grammar IDs)
   */
  async getForGrammar(grammarId: number, limit: number = 10): Promise<MasterExerciseItem[]> {
    const [rows] = await pool.query<MasterExerciseRow[]>(
      `SELECT * FROM master_exercises
       WHERE is_active = TRUE AND JSON_CONTAINS(related_grammar_ids, ?)
       ORDER BY RAND()
       LIMIT ?`,
      [JSON.stringify(grammarId), Number(limit)]
    );

    return rows.map(row => this.mapToMasterExerciseItem(row));
  }

  /**
   * Get random exercises for exam (shuffled)
   */
  async getRandomForExam(
    count: number,
    filters: {
      cefrLevel?: string;
      difficultyLevel?: string;
      exerciseTypes?: ExerciseTypeV3[];
      excludeIds?: number[];
    } = {}
  ): Promise<MasterExerciseItem[]> {
    const conditions: string[] = ['is_active = TRUE'];
    const params: (string | number)[] = [];

    if (filters.cefrLevel) {
      conditions.push('cefr_level = ?');
      params.push(filters.cefrLevel);
    }

    if (filters.difficultyLevel) {
      conditions.push('difficulty_level = ?');
      params.push(filters.difficultyLevel);
    }

    if (filters.exerciseTypes && filters.exerciseTypes.length > 0) {
      const placeholders = filters.exerciseTypes.map(() => '?').join(',');
      conditions.push(`exercise_type IN (${placeholders})`);
      params.push(...filters.exerciseTypes);
    }

    if (filters.excludeIds && filters.excludeIds.length > 0) {
      const placeholders = filters.excludeIds.map(() => '?').join(',');
      conditions.push(`id NOT IN (${placeholders})`);
      params.push(...filters.excludeIds);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.query<MasterExerciseRow[]>(
      `SELECT * FROM master_exercises ${whereClause}
       ORDER BY RAND()
       LIMIT ?`,
      [...params, Number(count)]
    );

    return rows.map(row => this.mapToMasterExerciseItem(row));
  }

  /**
   * Create new master exercise (admin only)
   */
  async create(input: CreateMasterExerciseInput): Promise<MasterExerciseItem> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO master_exercises (
        exercise_type, question, options, correct_answer, explanation, explanation_vi,
        exercise_data, audio_url, image_url, difficulty_level, cefr_level,
        time_limit_seconds, points, related_vocabulary_ids, related_grammar_ids,
        category, tags, created_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.exerciseType,
        input.question,
        input.options ? JSON.stringify(input.options) : null,
        input.correctAnswer,
        input.explanation || null,
        input.explanationVi || null,
        input.exerciseData ? JSON.stringify(input.exerciseData) : null,
        input.audioUrl || null,
        input.imageUrl || null,
        input.difficultyLevel || 'beginner',
        input.cefrLevel || null,
        input.timeLimitSeconds || 60,
        input.points || 10,
        input.relatedVocabularyIds ? JSON.stringify(input.relatedVocabularyIds) : null,
        input.relatedGrammarIds ? JSON.stringify(input.relatedGrammarIds) : null,
        input.category || null,
        input.tags ? JSON.stringify(input.tags) : null,
        input.createdBy || null,
      ]
    );

    const created = await this.getById(result.insertId);
    if (!created) {
      throw new Error('Failed to create master exercise');
    }
    return created;
  }

  /**
   * Bulk create exercises (for imports)
   */
  async bulkCreate(inputs: CreateMasterExerciseInput[]): Promise<number[]> {
    if (inputs.length === 0) return [];

    const insertedIds: number[] = [];

    for (const input of inputs) {
      const exercise = await this.create(input);
      insertedIds.push(exercise.id);
    }

    return insertedIds;
  }

  /**
   * Update master exercise (admin only)
   */
  async update(id: number, input: Partial<CreateMasterExerciseInput>): Promise<MasterExerciseItem | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.exerciseType !== undefined) {
      updates.push('exercise_type = ?');
      params.push(input.exerciseType);
    }
    if (input.question !== undefined) {
      updates.push('question = ?');
      params.push(input.question);
    }
    if (input.options !== undefined) {
      updates.push('options = ?');
      params.push(input.options ? JSON.stringify(input.options) : null);
    }
    if (input.correctAnswer !== undefined) {
      updates.push('correct_answer = ?');
      params.push(input.correctAnswer);
    }
    if (input.explanation !== undefined) {
      updates.push('explanation = ?');
      params.push(input.explanation || null);
    }
    if (input.explanationVi !== undefined) {
      updates.push('explanation_vi = ?');
      params.push(input.explanationVi || null);
    }
    if (input.exerciseData !== undefined) {
      updates.push('exercise_data = ?');
      params.push(input.exerciseData ? JSON.stringify(input.exerciseData) : null);
    }
    if (input.audioUrl !== undefined) {
      updates.push('audio_url = ?');
      params.push(input.audioUrl || null);
    }
    if (input.imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(input.imageUrl || null);
    }
    if (input.difficultyLevel !== undefined) {
      updates.push('difficulty_level = ?');
      params.push(input.difficultyLevel);
    }
    if (input.cefrLevel !== undefined) {
      updates.push('cefr_level = ?');
      params.push(input.cefrLevel || null);
    }
    if (input.timeLimitSeconds !== undefined) {
      updates.push('time_limit_seconds = ?');
      params.push(input.timeLimitSeconds);
    }
    if (input.points !== undefined) {
      updates.push('points = ?');
      params.push(input.points);
    }
    if (input.relatedVocabularyIds !== undefined) {
      updates.push('related_vocabulary_ids = ?');
      params.push(input.relatedVocabularyIds ? JSON.stringify(input.relatedVocabularyIds) : null);
    }
    if (input.relatedGrammarIds !== undefined) {
      updates.push('related_grammar_ids = ?');
      params.push(input.relatedGrammarIds ? JSON.stringify(input.relatedGrammarIds) : null);
    }
    if (input.category !== undefined) {
      updates.push('category = ?');
      params.push(input.category || null);
    }
    if (input.tags !== undefined) {
      updates.push('tags = ?');
      params.push(input.tags ? JSON.stringify(input.tags) : null);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    params.push(id);
    await pool.execute(
      `UPDATE master_exercises SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  /**
   * Soft delete master exercise (admin only)
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE master_exercises SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get exercise types with counts
   */
  async getTypeCounts(): Promise<Record<string, number>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT exercise_type, COUNT(*) as count
       FROM master_exercises WHERE is_active = TRUE
       GROUP BY exercise_type`
    );

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.exercise_type as string] = row.count as number;
    }
    return result;
  }

  /**
   * Get exercises statistics
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byCefrLevel: Record<string, number>;
    byDifficulty: Record<string, number>;
  }> {
    const [totalResult] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM master_exercises WHERE is_active = TRUE'
    );

    const [byType] = await pool.execute<RowDataPacket[]>(
      `SELECT exercise_type, COUNT(*) as count
       FROM master_exercises WHERE is_active = TRUE GROUP BY exercise_type`
    );

    const [byCefr] = await pool.execute<RowDataPacket[]>(
      `SELECT cefr_level, COUNT(*) as count
       FROM master_exercises WHERE is_active = TRUE AND cefr_level IS NOT NULL GROUP BY cefr_level`
    );

    const [byDiff] = await pool.execute<RowDataPacket[]>(
      `SELECT difficulty_level, COUNT(*) as count
       FROM master_exercises WHERE is_active = TRUE GROUP BY difficulty_level`
    );

    return {
      total: totalResult[0].total as number,
      byType: Object.fromEntries(byType.map(r => [r.exercise_type, r.count])),
      byCefrLevel: Object.fromEntries(byCefr.map(r => [r.cefr_level, r.count])),
      byDifficulty: Object.fromEntries(byDiff.map(r => [r.difficulty_level, r.count])),
    };
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private parseJson<T>(value: string | object | null): T | null {
    if (!value) return null;
    if (typeof value === 'object') return value as T;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private mapToMasterExerciseItem(row: MasterExerciseRow): MasterExerciseItem {
    return {
      id: row.id,
      exerciseType: row.exercise_type as ExerciseTypeV3,
      question: row.question,
      options: this.parseJson<string[]>(row.options),
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      explanationVi: row.explanation_vi,
      exerciseData: this.parseJson<Record<string, unknown>>(row.exercise_data),
      audioUrl: row.audio_url,
      imageUrl: row.image_url,
      difficultyLevel: row.difficulty_level,
      cefrLevel: row.cefr_level,
      timeLimitSeconds: row.time_limit_seconds,
      points: row.points,
      relatedVocabularyIds: this.parseJson<number[]>(row.related_vocabulary_ids),
      relatedGrammarIds: this.parseJson<number[]>(row.related_grammar_ids),
      category: row.category,
      tags: this.parseJson<string[]>(row.tags),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
    };
  }
}

export const masterExercisesService = new MasterExercisesService();
