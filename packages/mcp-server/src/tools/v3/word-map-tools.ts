import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DatabaseConnection } from '../../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ============================================================
// Tool Definitions
// ============================================================

export const getWordMapsTool: Tool = {
  name: 'get_word_maps',
  description: `[WORD-MAP] Get list of available Word Maps (curriculum courses).

Returns all Word Maps with their CEFR level, unit count, and user progress if authenticated.
Use this to show available courses for the user to study.`,
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
        description: 'User ID to include progress (optional)',
      },
      cefrLevel: {
        type: 'string',
        enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        description: 'Filter by CEFR level',
      },
      includeProgress: {
        type: 'boolean',
        description: 'Include user progress for each map (default: true if userId provided)',
      },
    },
    required: [],
  },
};

export const getWordMapDetailTool: Tool = {
  name: 'get_word_map_detail',
  description: `[WORD-MAP] Get detailed information about a Word Map including all units and lessons.

Returns the full curriculum structure with user progress if authenticated.`,
  inputSchema: {
    type: 'object',
    properties: {
      mapId: {
        type: 'number',
        description: 'Word Map ID',
      },
      userId: {
        type: 'number',
        description: 'User ID to include progress (optional)',
      },
    },
    required: ['mapId'],
  },
};

export const activateWordMapTool: Tool = {
  name: 'activate_word_map',
  description: `[WORD-MAP] Activate a Word Map for user learning.

This initializes the user's progress tracking for the map, unlocking the first unit.
Returns the initial progress state.`,
  inputSchema: {
    type: 'object',
    properties: {
      mapId: {
        type: 'number',
        description: 'Word Map ID to activate',
      },
      userId: {
        type: 'number',
        description: 'User ID (uses authenticated user if not provided)',
      },
    },
    required: ['mapId'],
  },
};

export const getLessonContentTool: Tool = {
  name: 'get_lesson_content',
  description: `[WORD-MAP] Get content for a specific lesson.

Returns all vocabulary, grammar, exercises, and media for the lesson.
Used when user starts studying a lesson.`,
  inputSchema: {
    type: 'object',
    properties: {
      lessonId: {
        type: 'number',
        description: 'Unit Lesson ID',
      },
      userId: {
        type: 'number',
        description: 'User ID to track progress',
      },
      includeExercises: {
        type: 'boolean',
        description: 'Include exercises (default: true)',
      },
    },
    required: ['lessonId'],
  },
};

export const completeLessonStudyTool: Tool = {
  name: 'complete_lesson_study',
  description: `[WORD-MAP] Mark a lesson's study phase as complete.

Called when user finishes studying all content in a lesson.
Unlocks the lesson exam and awards XP.`,
  inputSchema: {
    type: 'object',
    properties: {
      lessonId: {
        type: 'number',
        description: 'Unit Lesson ID',
      },
      userId: {
        type: 'number',
        description: 'User ID',
      },
      timeSpentSeconds: {
        type: 'number',
        description: 'Time spent studying in seconds',
      },
      vocabularyMastered: {
        type: 'number',
        description: 'Number of vocabulary items mastered',
      },
      grammarMastered: {
        type: 'number',
        description: 'Number of grammar points mastered',
      },
    },
    required: ['lessonId'],
  },
};

// ============================================================
// Zod Schemas
// ============================================================

const getWordMapsSchema = z.object({
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  includeProgress: z.boolean().optional(),
});

const getWordMapDetailSchema = z.object({
  mapId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
});

const activateWordMapSchema = z.object({
  mapId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
});

const getLessonContentSchema = z.object({
  lessonId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  includeExercises: z.boolean().optional().default(true),
});

const completeLessonStudySchema = z.object({
  lessonId: z.number(),
  userId: z.number().optional(),
  _resolvedUserId: z.number().optional(),
  timeSpentSeconds: z.number().optional(),
  vocabularyMastered: z.number().optional(),
  grammarMastered: z.number().optional(),
});

// ============================================================
// Type Definitions
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
  // User progress (joined)
  progress_percentage?: number;
  units_completed?: number;
  lessons_completed?: number;
  total_xp_earned?: number;
  is_activated?: boolean;
}

interface MapUnitRow extends RowDataPacket {
  id: number;
  map_id: number;  // DB uses map_id, not word_map_id
  unit_number: number;
  title: string;  // DB uses title, not name
  description: string | null;
  thumbnail_url: string | null;
  is_review_unit: boolean;
  review_unit_ids: unknown | null;
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
  // User progress (joined)
  status?: string;
  progress_percentage?: number;
  lessons_completed?: number;
  boss_exam_passed?: boolean;
}

interface UnitLessonRow extends RowDataPacket {
  id: number;
  unit_id: number;  // DB uses unit_id, not map_unit_id
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
  // User progress (joined)
  status?: string;
  progress_percentage?: number;
  content_completed?: number;
  total_content?: number;
}

interface LessonContentRow extends RowDataPacket {
  id: number;
  lesson_id: number;
  content_type: string;
  master_vocabulary_id: number | null;
  master_grammar_id: number | null;
  master_exercise_id: number | null;
  custom_content: string | null;
  display_order: number;
  section: string | null;
  // Master vocabulary fields
  english_word?: string;
  vietnamese_word?: string;
  phonetic?: string;
  part_of_speech?: string;
  definitions?: string;
  // Master grammar fields
  grammar_rule?: string;
  category?: string;
  explanation?: string;
  explanation_vi?: string;
  examples?: string;
  // Master exercise fields
  exercise_type?: string;
  question?: string;
  options?: string;
  correct_answer?: string;
}

// ============================================================
// Tool Implementations
// ============================================================

export async function getWordMaps(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  wordMaps: Array<{
    id: number;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    cefrLevel: string;
    publisher: string | null;
    totalUnits: number;
    totalLessons: number;
    estimatedHours: number | null;
    isFree: boolean;
    priceCoins: number;
    isFeatured: boolean;
    isPublished: boolean;
    progress?: {
      percentage: number;
      unitsCompleted: number;
      lessonsCompleted: number;
      totalXpEarned: number;
      isActivated: boolean;
    };
  }>;
  total: number;
}> {
  const input = getWordMapsSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId;

  let sql = `
    SELECT wm.*
    ${effectiveUserId ? `,
      ump.completion_percentage as progress_percentage,
      ump.units_completed,
      ump.lessons_completed,
      ump.total_xp_earned,
      CASE WHEN ump.id IS NOT NULL THEN TRUE ELSE FALSE END as is_activated
    ` : ''}
    FROM word_maps wm
    ${effectiveUserId ? `
      LEFT JOIN user_map_progress ump ON wm.id = ump.map_id AND ump.user_id = ?
    ` : ''}
    WHERE wm.is_active = TRUE
  `;

  const params: (string | number)[] = [];
  if (effectiveUserId) params.push(effectiveUserId);

  if (input.cefrLevel) {
    sql += ` AND wm.cefr_level = ?`;
    params.push(input.cefrLevel);
  }

  sql += ` ORDER BY wm.display_order ASC, wm.cefr_level ASC`;

  const rows = await db.query<WordMapRow[]>(sql, params);

  const wordMaps = rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    cefrLevel: row.cefr_level,
    publisher: row.publisher,
    totalUnits: row.total_units,
    totalLessons: row.total_lessons,
    estimatedHours: row.estimated_hours,
    isFree: Boolean(row.is_free),
    priceCoins: row.price_coins,
    isFeatured: Boolean(row.is_featured),
    isPublished: Boolean(row.is_published),
    ...(effectiveUserId ? {
      progress: {
        percentage: row.progress_percentage ?? 0,
        unitsCompleted: row.units_completed ?? 0,
        lessonsCompleted: row.lessons_completed ?? 0,
        totalXpEarned: row.total_xp_earned ?? 0,
        isActivated: Boolean(row.is_activated),
      },
    } : {}),
  }));

  return {
    success: true,
    wordMaps,
    total: wordMaps.length,
  };
}

export async function getWordMapDetail(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  wordMap: {
    id: number;
    name: string;
    description: string | null;
    cefrLevel: string;
    units: Array<{
      id: number;
      unitNumber: number;
      name: string;
      description: string | null;
      isReviewUnit: boolean;
      totalLessons: number;
      status?: string;
      progressPercentage?: number;
      lessons: Array<{
        id: number;
        lessonNumber: number;
        title: string;
        lessonType: string;
        estimatedMinutes: number;
        status?: string;
        progressPercentage?: number;
      }>;
    }>;
    progress?: {
      percentage: number;
      currentUnitId: number | null;
      unitsCompleted: number;
      lessonsCompleted: number;
    };
  };
} | { success: false; error: string }> {
  const input = getWordMapDetailSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId;

  // Get word map
  const mapRows = await db.query<WordMapRow[]>(
    `SELECT * FROM word_maps WHERE id = ? AND is_active = TRUE`,
    [input.mapId]
  );

  if (mapRows.length === 0) {
    return { success: false, error: 'Word Map not found' };
  }

  const wordMap = mapRows[0];

  // Get units with optional progress
  let unitsSql = `
    SELECT mu.*
    ${effectiveUserId ? `,
      uup.status,
      uup.completion_percentage as progress_percentage,
      uup.lessons_completed,
      uup.boss_exams_passed as boss_exam_passed
    ` : ''}
    FROM map_units mu
    ${effectiveUserId ? `
      LEFT JOIN user_unit_progress uup ON mu.id = uup.unit_id AND uup.user_id = ?
    ` : ''}
    WHERE mu.map_id = ? AND mu.is_active = TRUE
    ORDER BY mu.unit_number ASC
  `;

  const unitsParams: number[] = effectiveUserId ? [effectiveUserId, input.mapId] : [input.mapId];
  const unitRows = await db.query<MapUnitRow[]>(unitsSql, unitsParams);

  // Get lessons for each unit
  const units = await Promise.all(unitRows.map(async (unit) => {
    let lessonsSql = `
      SELECT ul.*
      ${effectiveUserId ? `,
        ulp.status,
        ulp.content_progress_percentage as progress_percentage
      ` : ''}
      FROM unit_lessons ul
      ${effectiveUserId ? `
        LEFT JOIN user_lesson_progress ulp ON ul.id = ulp.lesson_id AND ulp.user_id = ?
      ` : ''}
      WHERE ul.unit_id = ? AND ul.is_active = TRUE
      ORDER BY ul.lesson_number ASC
    `;

    const lessonsParams: number[] = effectiveUserId ? [effectiveUserId, unit.id] : [unit.id];
    const lessonRows = await db.query<UnitLessonRow[]>(lessonsSql, lessonsParams);

    return {
      id: unit.id,
      unitNumber: unit.unit_number,
      name: unit.title,  // DB uses title, not name
      description: unit.description,
      isReviewUnit: Boolean(unit.is_review_unit),
      totalLessons: unit.total_lessons,
      ...(effectiveUserId ? {
        status: unit.status ?? 'locked',
        progressPercentage: unit.progress_percentage ?? 0,
      } : {}),
      lessons: lessonRows.map(lesson => ({
        id: lesson.id,
        lessonNumber: lesson.lesson_number,
        title: lesson.title,
        lessonType: lesson.lesson_type,
        estimatedMinutes: lesson.estimated_minutes,
        ...(effectiveUserId ? {
          status: lesson.status ?? 'locked',
          progressPercentage: lesson.progress_percentage ?? 0,
        } : {}),
      })),
    };
  }));

  // Get user progress if authenticated
  let progress: {
    percentage: number;
    currentUnitId: number | null;
    unitsCompleted: number;
    lessonsCompleted: number;
  } | undefined;

  if (effectiveUserId) {
    const progressRows = await db.query<RowDataPacket[]>(
      `SELECT * FROM user_map_progress WHERE user_id = ? AND map_id = ?`,
      [effectiveUserId, input.mapId]
    );

    if (progressRows.length > 0) {
      const p = progressRows[0];
      progress = {
        percentage: p.completion_percentage ?? 0,
        currentUnitId: p.current_unit_id,
        unitsCompleted: p.units_completed ?? 0,
        lessonsCompleted: p.lessons_completed ?? 0,
      };
    }
  }

  return {
    success: true,
    wordMap: {
      id: wordMap.id,
      name: wordMap.name,
      description: wordMap.description,
      cefrLevel: wordMap.cefr_level,
      units,
      progress,
    },
  };
}

export async function activateWordMap(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  message: string;
  progress: {
    mapId: number;
    currentUnitId: number | null;
    unitsUnlocked: number[];
  };
} | { success: false; error: string }> {
  const input = activateWordMapSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Check if map exists
  const mapRows = await db.query<WordMapRow[]>(
    `SELECT * FROM word_maps WHERE id = ? AND is_active = TRUE`,
    [input.mapId]
  );

  if (mapRows.length === 0) {
    return { success: false, error: 'Word Map not found' };
  }

  // Check if already activated
  const existingProgress = await db.query<RowDataPacket[]>(
    `SELECT * FROM user_map_progress WHERE user_id = ? AND map_id = ?`,
    [effectiveUserId, input.mapId]
  );

  if (existingProgress.length > 0) {
    return { success: false, error: 'Word Map already activated' };
  }

  // Get first unit
  const firstUnitRows = await db.query<MapUnitRow[]>(
    `SELECT * FROM map_units WHERE map_id = ? AND is_active = TRUE ORDER BY unit_number ASC LIMIT 1`,
    [input.mapId]
  );

  const firstUnitId = firstUnitRows.length > 0 ? firstUnitRows[0].id : null;

  // Create map progress
  await db.execute(
    `INSERT INTO user_map_progress (user_id, map_id, current_unit_id, current_lesson_id, completion_percentage, units_completed, lessons_completed, total_xp_earned, is_active)
     VALUES (?, ?, ?, NULL, 0, 0, 0, 0, TRUE)`,
    [effectiveUserId, input.mapId, firstUnitId]
  );

  // Get the map progress id for foreign key
  const mapProgressRows = await db.query<RowDataPacket[]>(
    `SELECT id FROM user_map_progress WHERE user_id = ? AND map_id = ?`,
    [effectiveUserId, input.mapId]
  );
  const mapProgressId = mapProgressRows[0]?.id;

  // Unlock first unit
  if (firstUnitId && mapProgressId) {
    await db.execute(
      `INSERT INTO user_unit_progress (user_id, unit_id, map_progress_id, status, completion_percentage, lessons_completed, xp_earned)
       VALUES (?, ?, ?, 'unlocked', 0, 0, 0)`,
      [effectiveUserId, firstUnitId, mapProgressId]
    );

    // Get the unit progress id for foreign key
    const unitProgressRows = await db.query<RowDataPacket[]>(
      `SELECT id FROM user_unit_progress WHERE user_id = ? AND unit_id = ?`,
      [effectiveUserId, firstUnitId]
    );
    const unitProgressId = unitProgressRows[0]?.id;

    // Unlock first lesson of first unit
    const firstLessonRows = await db.query<UnitLessonRow[]>(
      `SELECT * FROM unit_lessons WHERE unit_id = ? AND is_active = TRUE ORDER BY lesson_number ASC LIMIT 1`,
      [firstUnitId]
    );

    if (firstLessonRows.length > 0 && unitProgressId) {
      await db.execute(
        `INSERT INTO user_lesson_progress (user_id, lesson_id, unit_progress_id, status, content_progress_percentage, xp_earned)
         VALUES (?, ?, ?, 'unlocked', 0, 0)`,
        [effectiveUserId, firstLessonRows[0].id, unitProgressId]
      );
    }
  }

  return {
    success: true,
    message: 'Word Map activated successfully',
    progress: {
      mapId: input.mapId,
      currentUnitId: firstUnitId,
      unitsUnlocked: firstUnitId ? [firstUnitId] : [],
    },
  };
}

export async function getLessonContent(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  lesson: {
    id: number;
    title: string;
    lessonType: string;
    description: string | null;
    estimatedMinutes: number;
    videoUrl: string | null;
    audioUrl: string | null;
  };
  content: {
    vocabulary: Array<{
      id: number;
      englishWord: string;
      vietnameseWord: string;
      phonetic: string | null;
      partOfSpeech: string;
      definitions: unknown | null;
    }>;
    grammar: Array<{
      id: number;
      grammarRule: string;
      category: string;
      explanation: string;
      explanationVi: string;
      examples: unknown | null;
    }>;
    exercises: Array<{
      id: number;
      exerciseType: string;
      question: string;
      options: string[] | null;
      correctAnswer: string;
    }>;
  };
  progress?: {
    status: string;
    percentage: number;
    contentCompleted: number;
    totalContent: number;
  };
} | { success: false; error: string }> {
  const input = getLessonContentSchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId;

  // Get lesson details
  const lessonRows = await db.query<UnitLessonRow[]>(
    `SELECT * FROM unit_lessons WHERE id = ? AND is_active = TRUE`,
    [input.lessonId]
  );

  if (lessonRows.length === 0) {
    return { success: false, error: 'Lesson not found' };
  }

  const lesson = lessonRows[0];

  // Get lesson content with joined master data
  const contentRows = await db.query<LessonContentRow[]>(
    `SELECT lc.*,
            mv.english_word, mv.vietnamese_word, mv.phonetic, mv.part_of_speech, mv.definitions,
            mg.grammar_rule, mg.category, mg.explanation, mg.explanation_vi, mg.examples,
            me.exercise_type, me.question, me.options, me.correct_answer
     FROM lesson_content lc
     LEFT JOIN master_vocabulary mv ON lc.content_type = 'vocabulary' AND lc.master_vocabulary_id = mv.id
     LEFT JOIN master_grammar mg ON lc.content_type = 'grammar' AND lc.master_grammar_id = mg.id
     LEFT JOIN master_exercises me ON lc.content_type = 'exercise' AND lc.master_exercise_id = me.id
     WHERE lc.lesson_id = ? AND lc.is_active = TRUE
     ORDER BY lc.display_order ASC`,
    [input.lessonId]
  );

  // Organize content by type
  const vocabulary: Array<{
    id: number;
    englishWord: string;
    vietnameseWord: string;
    phonetic: string | null;
    partOfSpeech: string;
    definitions: unknown | null;
  }> = [];

  const grammar: Array<{
    id: number;
    grammarRule: string;
    category: string;
    explanation: string;
    explanationVi: string;
    examples: unknown | null;
  }> = [];

  const exercises: Array<{
    id: number;
    exerciseType: string;
    question: string;
    options: string[] | null;
    correctAnswer: string;
  }> = [];

  const parseJson = <T>(value: unknown): T | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value as T;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  };

  for (const row of contentRows) {
    if (row.content_type === 'vocabulary' && row.english_word) {
      vocabulary.push({
        id: row.master_vocabulary_id!,
        englishWord: row.english_word,
        vietnameseWord: row.vietnamese_word!,
        phonetic: row.phonetic ?? null,
        partOfSpeech: row.part_of_speech!,
        definitions: parseJson(row.definitions),
      });
    } else if (row.content_type === 'grammar' && row.grammar_rule) {
      grammar.push({
        id: row.master_grammar_id!,
        grammarRule: row.grammar_rule,
        category: row.category!,
        explanation: row.explanation!,
        explanationVi: row.explanation_vi!,
        examples: parseJson(row.examples),
      });
    } else if (row.content_type === 'exercise' && row.question && input.includeExercises) {
      exercises.push({
        id: row.master_exercise_id!,
        exerciseType: row.exercise_type!,
        question: row.question,
        options: parseJson<string[]>(row.options),
        correctAnswer: row.correct_answer!,
      });
    }
  }

  // Get user progress if authenticated
  let progress: {
    status: string;
    percentage: number;
    contentCompleted: number;
    totalContent: number;
  } | undefined;

  if (effectiveUserId) {
    const progressRows = await db.query<RowDataPacket[]>(
      `SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`,
      [effectiveUserId, input.lessonId]
    );

    if (progressRows.length > 0) {
      const p = progressRows[0];
      progress = {
        status: p.status ?? 'locked',
        percentage: p.content_progress_percentage ?? 0,
        contentCompleted: 0, // Not tracked in current schema
        totalContent: contentRows.length,
      };
    }

    // Mark lesson as in_progress if not already
    if (!progress || progress.status === 'unlocked') {
      await db.query(
        `UPDATE user_lesson_progress
         SET status = 'studying', study_started_at = COALESCE(study_started_at, NOW())
         WHERE user_id = ? AND lesson_id = ?`,
        [effectiveUserId, input.lessonId]
      );

      progress = {
        status: 'studying',
        percentage: 0,
        contentCompleted: 0,
        totalContent: contentRows.length,
      };
    }
  }

  return {
    success: true,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      lessonType: lesson.lesson_type,
      description: lesson.description,
      estimatedMinutes: lesson.estimated_minutes,
      videoUrl: lesson.video_url,
      audioUrl: lesson.audio_url,
    },
    content: {
      vocabulary,
      grammar,
      exercises,
    },
    progress,
  };
}

export async function completeLessonStudy(
  args: Record<string, unknown>,
  db: DatabaseConnection
): Promise<{
  success: boolean;
  message: string;
  xpEarned: number;
  progress: {
    lessonStatus: string;
    examUnlocked: boolean;
  };
  nextLesson?: {
    id: number;
    title: string;
    unlocked: boolean;
  };
} | { success: false; error: string }> {
  const input = completeLessonStudySchema.parse(args);
  const effectiveUserId = input.userId ?? input._resolvedUserId ?? 1;

  // Get lesson details
  const lessonRows = await db.query<UnitLessonRow[]>(
    `SELECT * FROM unit_lessons WHERE id = ? AND is_active = TRUE`,
    [input.lessonId]
  );

  if (lessonRows.length === 0) {
    return { success: false, error: 'Lesson not found' };
  }

  const lesson = lessonRows[0];

  // Check if user has progress
  const progressRows = await db.query<RowDataPacket[]>(
    `SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`,
    [effectiveUserId, input.lessonId]
  );

  if (progressRows.length === 0) {
    return { success: false, error: 'Lesson not started. Call get_lesson_content first.' };
  }

  // Update lesson progress
  await db.query(
    `UPDATE user_lesson_progress
     SET status = 'exam_ready',
         content_progress_percentage = 100,
         study_completed_at = NOW(),
         study_time_minutes = study_time_minutes + ?,
         vocabulary_learned = COALESCE(?, vocabulary_learned),
         grammar_learned = COALESCE(?, grammar_learned),
         xp_earned = xp_earned + ?
     WHERE user_id = ? AND lesson_id = ?`,
    [
      Math.round((input.timeSpentSeconds ?? 0) / 60),
      input.vocabularyMastered,
      input.grammarMastered,
      lesson.study_xp,
      effectiveUserId,
      input.lessonId,
    ]
  );

  // Update unit progress
  await db.query(
    `UPDATE user_unit_progress uup
     SET lessons_completed = (
       SELECT COUNT(*) FROM user_lesson_progress ulp
       JOIN unit_lessons ul ON ulp.lesson_id = ul.id
       WHERE ulp.user_id = ? AND ul.unit_id = ? AND ulp.status IN ('exam_ready', 'completed')
     ),
     completion_percentage = (
       SELECT ROUND(COUNT(CASE WHEN ulp.status IN ('exam_ready', 'completed') THEN 1 END) * 100 / COUNT(*))
       FROM user_lesson_progress ulp
       JOIN unit_lessons ul ON ulp.lesson_id = ul.id
       WHERE ulp.user_id = ? AND ul.unit_id = ?
     )
     WHERE user_id = ? AND unit_id = ?`,
    [effectiveUserId, lesson.unit_id, effectiveUserId, lesson.unit_id, effectiveUserId, lesson.unit_id]
  );

  // Check if there's a next lesson to unlock
  const nextLessonRows = await db.query<UnitLessonRow[]>(
    `SELECT * FROM unit_lessons
     WHERE unit_id = ? AND lesson_number = ? AND is_active = TRUE`,
    [lesson.unit_id, lesson.lesson_number + 1]
  );

  let nextLesson: { id: number; title: string; unlocked: boolean } | undefined;

  if (nextLessonRows.length > 0) {
    const next = nextLessonRows[0];

    // Check if already has progress
    const existingProgressRows = await db.query<RowDataPacket[]>(
      `SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?`,
      [effectiveUserId, next.id]
    );

    if (existingProgressRows.length === 0) {
      // Get unit progress id for foreign key
      const unitProgressRows = await db.query<RowDataPacket[]>(
        `SELECT id FROM user_unit_progress WHERE user_id = ? AND unit_id = ?`,
        [effectiveUserId, lesson.unit_id]
      );
      const unitProgressId = unitProgressRows[0]?.id;

      if (unitProgressId) {
        // Unlock next lesson
        await db.execute(
          `INSERT INTO user_lesson_progress (user_id, lesson_id, unit_progress_id, status, content_progress_percentage, xp_earned)
           VALUES (?, ?, ?, 'unlocked', 0, 0)`,
          [effectiveUserId, next.id, unitProgressId]
        );
      }
    } else if (existingProgressRows[0].status === 'locked') {
      await db.query(
        `UPDATE user_lesson_progress SET status = 'unlocked' WHERE user_id = ? AND lesson_id = ?`,
        [effectiveUserId, next.id]
      );
    }

    nextLesson = {
      id: next.id,
      title: next.title,
      unlocked: true,
    };
  }

  return {
    success: true,
    message: 'Lesson study completed!',
    xpEarned: lesson.study_xp,
    progress: {
      lessonStatus: 'completed',
      examUnlocked: Boolean(lesson.has_boss_exam),
    },
    nextLesson,
  };
}
