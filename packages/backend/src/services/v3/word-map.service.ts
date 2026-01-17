import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

interface WordMapRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  cefr_level: string;
  publisher: string | null;
  total_units: number;
  total_lessons: number;
  total_vocabulary: number;
  total_grammar: number;
  estimated_hours: number | null;
  is_free: boolean;
  price_coins: number;
  price_gems: number;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  is_published: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

interface MapUnitRow extends RowDataPacket {
  id: number;
  map_id: number;
  unit_number: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_review_unit: boolean;
  review_unit_ids: string | null;
  prerequisite_unit_id: number | null;
  boss_exam_count: number;
  boss_passing_score: number;
  total_lessons: number;
  total_vocabulary: number;
  total_grammar: number;
  total_exercises: number;
  completion_xp: number;
  completion_coins: number;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UnitLessonRow extends RowDataPacket {
  id: number;
  unit_id: number;
  lesson_number: number;
  title: string;
  lesson_type: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  pdf_page_start: number | null;
  pdf_page_end: number | null;
  prerequisite_lesson_id: number | null;
  has_boss_exam: boolean;
  boss_passing_score: number;
  total_vocabulary: number;
  total_grammar: number;
  total_exercises: number;
  estimated_minutes: number;
  study_xp: number;
  exam_xp: number;
  coins_reward: number;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface LessonContentRow extends RowDataPacket {
  id: number;
  lesson_id: number;
  content_type: string;
  master_vocabulary_id: number | null;
  master_grammar_id: number | null;
  master_exercise_id: number | null;
  custom_content: string | null;
  section: string;
  display_order: number;
  custom_instructions: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface WordMap {
  id: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  cefrLevel: string;
  publisher: string | null;
  totalUnits: number;
  totalLessons: number;
  totalVocabulary: number;
  totalGrammar: number;
  estimatedHours: number | null;
  isFree: boolean;
  priceCoins: number;
  priceGems: number;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MapUnit {
  id: number;
  mapId: number;
  unitNumber: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isReviewUnit: boolean;
  reviewUnitIds: number[] | null;
  prerequisiteUnitId: number | null;
  bossExamCount: number;
  bossPassingScore: number;
  totalLessons: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;
  completionXp: number;
  completionCoins: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitLesson {
  id: number;
  unitId: number;
  lessonNumber: number;
  title: string;
  lessonType: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  pdfPageStart: number | null;
  pdfPageEnd: number | null;
  prerequisiteLessonId: number | null;
  hasBossExam: boolean;
  bossPassingScore: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;
  estimatedMinutes: number;
  studyXp: number;
  examXp: number;
  coinsReward: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonContent {
  id: number;
  lessonId: number;
  contentType: string;
  masterVocabularyId: number | null;
  masterGrammarId: number | null;
  masterExerciseId: number | null;
  customContent: Record<string, unknown> | null;
  section: string;
  displayOrder: number;
  customInstructions: string | null;
  isActive: boolean;
  createdAt: Date;
}

export type LessonType = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing' | 'mixed' | 'review' | 'project';

// ============================================================
// Service
// ============================================================

export class WordMapService {
  // ============================================================
  // Word Maps
  // ============================================================

  /**
   * Get all published word maps
   */
  async getAllMaps(includeUnpublished: boolean = false): Promise<WordMap[]> {
    const condition = includeUnpublished ? 'is_active = TRUE' : 'is_active = TRUE AND is_published = TRUE';
    const [rows] = await pool.execute<WordMapRow[]>(
      `SELECT * FROM word_maps WHERE ${condition} ORDER BY display_order ASC`
    );
    return rows.map(row => this.mapToWordMap(row));
  }

  /**
   * Get featured word maps
   */
  async getFeaturedMaps(): Promise<WordMap[]> {
    const [rows] = await pool.execute<WordMapRow[]>(
      `SELECT * FROM word_maps
       WHERE is_active = TRUE AND is_published = TRUE AND is_featured = TRUE
       ORDER BY display_order ASC`
    );
    return rows.map(row => this.mapToWordMap(row));
  }

  /**
   * Get word map by ID
   */
  async getMapById(id: number): Promise<WordMap | null> {
    const [rows] = await pool.execute<WordMapRow[]>(
      'SELECT * FROM word_maps WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapToWordMap(rows[0]) : null;
  }

  /**
   * Get word map by name
   */
  async getMapByName(name: string): Promise<WordMap | null> {
    const [rows] = await pool.execute<WordMapRow[]>(
      'SELECT * FROM word_maps WHERE name = ?',
      [name]
    );
    return rows.length > 0 ? this.mapToWordMap(rows[0]) : null;
  }

  /**
   * Get word map with full structure (units, lessons)
   */
  async getMapWithStructure(mapId: number): Promise<{
    map: WordMap;
    units: (MapUnit & { lessons: UnitLesson[] })[];
  } | null> {
    const map = await this.getMapById(mapId);
    if (!map) return null;

    const units = await this.getUnitsByMapId(mapId);
    const unitsWithLessons = await Promise.all(
      units.map(async unit => ({
        ...unit,
        lessons: await this.getLessonsByUnitId(unit.id),
      }))
    );

    return { map, units: unitsWithLessons };
  }

  /**
   * Create word map (admin only)
   */
  async createMap(input: {
    name: string;
    description?: string;
    coverImageUrl?: string;
    cefrLevel: string;
    publisher?: string;
    isFree?: boolean;
    priceCoins?: number;
    priceGems?: number;
    displayOrder?: number;
    isFeatured?: boolean;
    createdBy?: number;
  }): Promise<WordMap> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO word_maps (
        name, description, cover_image_url, cefr_level, publisher,
        is_free, price_coins, price_gems, display_order, is_featured,
        created_by, is_active, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, FALSE)`,
      [
        input.name,
        input.description || null,
        input.coverImageUrl || null,
        input.cefrLevel,
        input.publisher || null,
        input.isFree ?? true,
        input.priceCoins || 0,
        input.priceGems || 0,
        input.displayOrder || 0,
        input.isFeatured ?? false,
        input.createdBy || null,
      ]
    );

    const created = await this.getMapById(result.insertId);
    if (!created) throw new Error('Failed to create word map');
    return created;
  }

  /**
   * Update word map (admin only)
   */
  async updateMap(id: number, input: Partial<{
    name: string;
    description: string;
    coverImageUrl: string;
    cefrLevel: string;
    publisher: string;
    isFree: boolean;
    priceCoins: number;
    priceGems: number;
    displayOrder: number;
    isFeatured: boolean;
    isPublished: boolean;
  }>): Promise<WordMap | null> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name); }
    if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description || null); }
    if (input.coverImageUrl !== undefined) { updates.push('cover_image_url = ?'); params.push(input.coverImageUrl || null); }
    if (input.cefrLevel !== undefined) { updates.push('cefr_level = ?'); params.push(input.cefrLevel); }
    if (input.publisher !== undefined) { updates.push('publisher = ?'); params.push(input.publisher || null); }
    if (input.isFree !== undefined) { updates.push('is_free = ?'); params.push(input.isFree); }
    if (input.priceCoins !== undefined) { updates.push('price_coins = ?'); params.push(input.priceCoins); }
    if (input.priceGems !== undefined) { updates.push('price_gems = ?'); params.push(input.priceGems); }
    if (input.displayOrder !== undefined) { updates.push('display_order = ?'); params.push(input.displayOrder); }
    if (input.isFeatured !== undefined) { updates.push('is_featured = ?'); params.push(input.isFeatured); }
    if (input.isPublished !== undefined) { updates.push('is_published = ?'); params.push(input.isPublished); }

    if (updates.length === 0) return this.getMapById(id);

    params.push(id);
    await pool.execute(`UPDATE word_maps SET ${updates.join(', ')} WHERE id = ?`, params);
    return this.getMapById(id);
  }

  /**
   * Update word map statistics (recalculate from content)
   */
  async updateMapStats(mapId: number): Promise<void> {
    await pool.execute(
      `UPDATE word_maps wm SET
        total_units = (SELECT COUNT(*) FROM map_units WHERE map_id = wm.id AND is_active = TRUE),
        total_lessons = (
          SELECT COUNT(*) FROM unit_lessons ul
          JOIN map_units mu ON ul.unit_id = mu.id
          WHERE mu.map_id = wm.id AND ul.is_active = TRUE
        ),
        total_vocabulary = (
          SELECT COUNT(DISTINCT lc.master_vocabulary_id) FROM lesson_content lc
          JOIN unit_lessons ul ON lc.lesson_id = ul.id
          JOIN map_units mu ON ul.unit_id = mu.id
          WHERE mu.map_id = wm.id AND lc.master_vocabulary_id IS NOT NULL AND lc.is_active = TRUE
        ),
        total_grammar = (
          SELECT COUNT(DISTINCT lc.master_grammar_id) FROM lesson_content lc
          JOIN unit_lessons ul ON lc.lesson_id = ul.id
          JOIN map_units mu ON ul.unit_id = mu.id
          WHERE mu.map_id = wm.id AND lc.master_grammar_id IS NOT NULL AND lc.is_active = TRUE
        )
      WHERE wm.id = ?`,
      [mapId]
    );
  }

  // ============================================================
  // Map Units
  // ============================================================

  /**
   * Get units for a word map
   */
  async getUnitsByMapId(mapId: number): Promise<MapUnit[]> {
    const [rows] = await pool.execute<MapUnitRow[]>(
      `SELECT * FROM map_units WHERE map_id = ? AND is_active = TRUE ORDER BY unit_number ASC`,
      [mapId]
    );
    return rows.map(row => this.mapToMapUnit(row));
  }

  /**
   * Get unit by ID
   */
  async getUnitById(id: number): Promise<MapUnit | null> {
    const [rows] = await pool.execute<MapUnitRow[]>(
      'SELECT * FROM map_units WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapToMapUnit(rows[0]) : null;
  }

  /**
   * Get unit with lessons
   */
  async getUnitWithLessons(unitId: number): Promise<{
    unit: MapUnit;
    lessons: UnitLesson[];
  } | null> {
    const unit = await this.getUnitById(unitId);
    if (!unit) return null;

    const lessons = await this.getLessonsByUnitId(unitId);
    return { unit, lessons };
  }

  /**
   * Create unit (admin only)
   */
  async createUnit(input: {
    mapId: number;
    unitNumber: number;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    isReviewUnit?: boolean;
    reviewUnitIds?: number[];
    prerequisiteUnitId?: number;
    bossExamCount?: number;
    bossPassingScore?: number;
    completionXp?: number;
    completionCoins?: number;
    displayOrder?: number;
  }): Promise<MapUnit> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO map_units (
        map_id, unit_number, title, description, thumbnail_url,
        is_review_unit, review_unit_ids, prerequisite_unit_id,
        boss_exam_count, boss_passing_score, completion_xp, completion_coins,
        display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.mapId,
        input.unitNumber,
        input.title,
        input.description || null,
        input.thumbnailUrl || null,
        input.isReviewUnit ?? false,
        input.reviewUnitIds ? JSON.stringify(input.reviewUnitIds) : null,
        input.prerequisiteUnitId || null,
        input.bossExamCount || 2,
        input.bossPassingScore || 100,
        input.completionXp || 100,
        input.completionCoins || 50,
        input.displayOrder || input.unitNumber,
      ]
    );

    const created = await this.getUnitById(result.insertId);
    if (!created) throw new Error('Failed to create unit');
    return created;
  }

  /**
   * Update unit statistics
   */
  async updateUnitStats(unitId: number): Promise<void> {
    await pool.execute(
      `UPDATE map_units mu SET
        total_lessons = (SELECT COUNT(*) FROM unit_lessons WHERE unit_id = mu.id AND is_active = TRUE),
        total_vocabulary = (
          SELECT COUNT(DISTINCT lc.master_vocabulary_id) FROM lesson_content lc
          JOIN unit_lessons ul ON lc.lesson_id = ul.id
          WHERE ul.unit_id = mu.id AND lc.master_vocabulary_id IS NOT NULL AND lc.is_active = TRUE
        ),
        total_grammar = (
          SELECT COUNT(DISTINCT lc.master_grammar_id) FROM lesson_content lc
          JOIN unit_lessons ul ON lc.lesson_id = ul.id
          WHERE ul.unit_id = mu.id AND lc.master_grammar_id IS NOT NULL AND lc.is_active = TRUE
        ),
        total_exercises = (
          SELECT COUNT(DISTINCT lc.master_exercise_id) FROM lesson_content lc
          JOIN unit_lessons ul ON lc.lesson_id = ul.id
          WHERE ul.unit_id = mu.id AND lc.master_exercise_id IS NOT NULL AND lc.is_active = TRUE
        )
      WHERE mu.id = ?`,
      [unitId]
    );
  }

  // ============================================================
  // Unit Lessons
  // ============================================================

  /**
   * Get lessons for a unit
   */
  async getLessonsByUnitId(unitId: number): Promise<UnitLesson[]> {
    const [rows] = await pool.execute<UnitLessonRow[]>(
      `SELECT * FROM unit_lessons WHERE unit_id = ? AND is_active = TRUE ORDER BY lesson_number ASC`,
      [unitId]
    );
    return rows.map(row => this.mapToUnitLesson(row));
  }

  /**
   * Get lesson by ID
   */
  async getLessonById(id: number): Promise<UnitLesson | null> {
    const [rows] = await pool.execute<UnitLessonRow[]>(
      'SELECT * FROM unit_lessons WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? this.mapToUnitLesson(rows[0]) : null;
  }

  /**
   * Get lesson with content
   */
  async getLessonWithContent(lessonId: number): Promise<{
    lesson: UnitLesson;
    content: LessonContent[];
  } | null> {
    const lesson = await this.getLessonById(lessonId);
    if (!lesson) return null;

    const content = await this.getLessonContent(lessonId);
    return { lesson, content };
  }

  /**
   * Create lesson (admin only)
   */
  async createLesson(input: {
    unitId: number;
    lessonNumber: number;
    title: string;
    lessonType: LessonType;
    description?: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    pdfPageStart?: number;
    pdfPageEnd?: number;
    prerequisiteLessonId?: number;
    hasBossExam?: boolean;
    bossPassingScore?: number;
    estimatedMinutes?: number;
    studyXp?: number;
    examXp?: number;
    coinsReward?: number;
    displayOrder?: number;
  }): Promise<UnitLesson> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO unit_lessons (
        unit_id, lesson_number, title, lesson_type, description, thumbnail_url,
        video_url, audio_url, pdf_page_start, pdf_page_end, prerequisite_lesson_id,
        has_boss_exam, boss_passing_score, estimated_minutes, study_xp, exam_xp,
        coins_reward, display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        input.unitId,
        input.lessonNumber,
        input.title,
        input.lessonType,
        input.description || null,
        input.thumbnailUrl || null,
        input.videoUrl || null,
        input.audioUrl || null,
        input.pdfPageStart || null,
        input.pdfPageEnd || null,
        input.prerequisiteLessonId || null,
        input.hasBossExam ?? true,
        input.bossPassingScore || 100,
        input.estimatedMinutes || 30,
        input.studyXp || 20,
        input.examXp || 30,
        input.coinsReward || 10,
        input.displayOrder || input.lessonNumber,
      ]
    );

    const created = await this.getLessonById(result.insertId);
    if (!created) throw new Error('Failed to create lesson');
    return created;
  }

  /**
   * Update lesson statistics
   */
  async updateLessonStats(lessonId: number): Promise<void> {
    await pool.execute(
      `UPDATE unit_lessons ul SET
        total_vocabulary = (
          SELECT COUNT(*) FROM lesson_content
          WHERE lesson_id = ul.id AND master_vocabulary_id IS NOT NULL AND is_active = TRUE
        ),
        total_grammar = (
          SELECT COUNT(*) FROM lesson_content
          WHERE lesson_id = ul.id AND master_grammar_id IS NOT NULL AND is_active = TRUE
        ),
        total_exercises = (
          SELECT COUNT(*) FROM lesson_content
          WHERE lesson_id = ul.id AND master_exercise_id IS NOT NULL AND is_active = TRUE
        )
      WHERE ul.id = ?`,
      [lessonId]
    );
  }

  // ============================================================
  // Lesson Content
  // ============================================================

  /**
   * Get content for a lesson
   */
  async getLessonContent(lessonId: number): Promise<LessonContent[]> {
    const [rows] = await pool.execute<LessonContentRow[]>(
      `SELECT * FROM lesson_content
       WHERE lesson_id = ? AND is_active = TRUE
       ORDER BY section ASC, display_order ASC`,
      [lessonId]
    );
    return rows.map(row => this.mapToLessonContent(row));
  }

  /**
   * Get lesson content by section
   */
  async getLessonContentBySection(lessonId: number, section: string): Promise<LessonContent[]> {
    const [rows] = await pool.execute<LessonContentRow[]>(
      `SELECT * FROM lesson_content
       WHERE lesson_id = ? AND section = ? AND is_active = TRUE
       ORDER BY display_order ASC`,
      [lessonId, section]
    );
    return rows.map(row => this.mapToLessonContent(row));
  }

  /**
   * Add vocabulary to lesson (admin only)
   */
  async addVocabularyToLesson(
    lessonId: number,
    masterVocabularyId: number,
    section: string = 'study',
    displayOrder: number = 0,
    customInstructions?: string
  ): Promise<LessonContent> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO lesson_content (
        lesson_id, content_type, master_vocabulary_id, section, display_order, custom_instructions, is_active
      ) VALUES (?, 'vocabulary', ?, ?, ?, ?, TRUE)`,
      [lessonId, masterVocabularyId, section, displayOrder, customInstructions || null]
    );

    const [rows] = await pool.execute<LessonContentRow[]>(
      'SELECT * FROM lesson_content WHERE id = ?',
      [result.insertId]
    );
    return this.mapToLessonContent(rows[0]);
  }

  /**
   * Add grammar to lesson (admin only)
   */
  async addGrammarToLesson(
    lessonId: number,
    masterGrammarId: number,
    section: string = 'study',
    displayOrder: number = 0,
    customInstructions?: string
  ): Promise<LessonContent> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO lesson_content (
        lesson_id, content_type, master_grammar_id, section, display_order, custom_instructions, is_active
      ) VALUES (?, 'grammar', ?, ?, ?, ?, TRUE)`,
      [lessonId, masterGrammarId, section, displayOrder, customInstructions || null]
    );

    const [rows] = await pool.execute<LessonContentRow[]>(
      'SELECT * FROM lesson_content WHERE id = ?',
      [result.insertId]
    );
    return this.mapToLessonContent(rows[0]);
  }

  /**
   * Add exercise to lesson (admin only)
   */
  async addExerciseToLesson(
    lessonId: number,
    masterExerciseId: number,
    section: string = 'practice',
    displayOrder: number = 0,
    customInstructions?: string
  ): Promise<LessonContent> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO lesson_content (
        lesson_id, content_type, master_exercise_id, section, display_order, custom_instructions, is_active
      ) VALUES (?, 'exercise', ?, ?, ?, ?, TRUE)`,
      [lessonId, masterExerciseId, section, displayOrder, customInstructions || null]
    );

    const [rows] = await pool.execute<LessonContentRow[]>(
      'SELECT * FROM lesson_content WHERE id = ?',
      [result.insertId]
    );
    return this.mapToLessonContent(rows[0]);
  }

  /**
   * Bulk add vocabulary to lesson
   */
  async bulkAddVocabularyToLesson(
    lessonId: number,
    vocabularyIds: number[],
    section: string = 'study'
  ): Promise<void> {
    if (vocabularyIds.length === 0) return;

    const values = vocabularyIds.map((id, index) =>
      `(${lessonId}, 'vocabulary', ${id}, '${section}', ${index}, TRUE)`
    ).join(', ');

    await pool.execute(
      `INSERT INTO lesson_content (lesson_id, content_type, master_vocabulary_id, section, display_order, is_active)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE display_order = VALUES(display_order)`
    );
  }

  /**
   * Remove content from lesson (admin only)
   */
  async removeContentFromLesson(contentId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE lesson_content SET is_active = FALSE WHERE id = ?',
      [contentId]
    );
    return result.affectedRows > 0;
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

  private mapToWordMap(row: WordMapRow): WordMap {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      coverImageUrl: row.cover_image_url,
      cefrLevel: row.cefr_level,
      publisher: row.publisher,
      totalUnits: row.total_units,
      totalLessons: row.total_lessons,
      totalVocabulary: row.total_vocabulary,
      totalGrammar: row.total_grammar,
      estimatedHours: row.estimated_hours,
      isFree: row.is_free,
      priceCoins: row.price_coins,
      priceGems: row.price_gems,
      displayOrder: row.display_order,
      isFeatured: row.is_featured,
      isActive: row.is_active,
      isPublished: row.is_published,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToMapUnit(row: MapUnitRow): MapUnit {
    return {
      id: row.id,
      mapId: row.map_id,
      unitNumber: row.unit_number,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      isReviewUnit: row.is_review_unit,
      reviewUnitIds: this.parseJson<number[]>(row.review_unit_ids),
      prerequisiteUnitId: row.prerequisite_unit_id,
      bossExamCount: row.boss_exam_count,
      bossPassingScore: row.boss_passing_score,
      totalLessons: row.total_lessons,
      totalVocabulary: row.total_vocabulary,
      totalGrammar: row.total_grammar,
      totalExercises: row.total_exercises,
      completionXp: row.completion_xp,
      completionCoins: row.completion_coins,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUnitLesson(row: UnitLessonRow): UnitLesson {
    return {
      id: row.id,
      unitId: row.unit_id,
      lessonNumber: row.lesson_number,
      title: row.title,
      lessonType: row.lesson_type,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      videoUrl: row.video_url,
      audioUrl: row.audio_url,
      pdfPageStart: row.pdf_page_start,
      pdfPageEnd: row.pdf_page_end,
      prerequisiteLessonId: row.prerequisite_lesson_id,
      hasBossExam: row.has_boss_exam,
      bossPassingScore: row.boss_passing_score,
      totalVocabulary: row.total_vocabulary,
      totalGrammar: row.total_grammar,
      totalExercises: row.total_exercises,
      estimatedMinutes: row.estimated_minutes,
      studyXp: row.study_xp,
      examXp: row.exam_xp,
      coinsReward: row.coins_reward,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToLessonContent(row: LessonContentRow): LessonContent {
    return {
      id: row.id,
      lessonId: row.lesson_id,
      contentType: row.content_type,
      masterVocabularyId: row.master_vocabulary_id,
      masterGrammarId: row.master_grammar_id,
      masterExerciseId: row.master_exercise_id,
      customContent: this.parseJson<Record<string, unknown>>(row.custom_content),
      section: row.section,
      displayOrder: row.display_order,
      customInstructions: row.custom_instructions,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}

export const wordMapService = new WordMapService();
