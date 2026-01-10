import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

interface UserMapProgressRow extends RowDataPacket {
  id: number;
  user_id: number;
  word_map_id: number;
  current_unit_id: number | null;
  progress_percentage: number;
  total_xp_earned: number;
  units_completed: number;
  lessons_completed: number;
  started_at: Date;
  last_activity_at: Date | null;
  completed_at: Date | null;
  is_active: boolean;
}

interface UserUnitProgressRow extends RowDataPacket {
  id: number;
  user_id: number;
  map_unit_id: number;
  status: string;
  progress_percentage: number;
  lessons_completed: number;
  total_lessons: number;
  xp_earned: number;
  started_at: Date | null;
  completed_at: Date | null;
  boss_exam_passed: boolean;
  boss_exam_attempts: number;
}

interface UserLessonProgressRow extends RowDataPacket {
  id: number;
  user_id: number;
  unit_lesson_id: number;
  status: string;
  progress_percentage: number;
  content_completed: number;
  total_content: number;
  vocabulary_mastered: number;
  grammar_mastered: number;
  exercises_completed: number;
  xp_earned: number;
  time_spent_seconds: number;
  started_at: Date | null;
  completed_at: Date | null;
  last_activity_at: Date | null;
}

export interface UserMapProgress {
  id: number;
  userId: number;
  wordMapId: number;
  currentUnitId: number | null;
  progressPercentage: number;
  totalXpEarned: number;
  unitsCompleted: number;
  lessonsCompleted: number;
  startedAt: Date;
  lastActivityAt: Date | null;
  completedAt: Date | null;
  isActive: boolean;
}

export interface UserUnitProgress {
  id: number;
  userId: number;
  mapUnitId: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  progressPercentage: number;
  lessonsCompleted: number;
  totalLessons: number;
  xpEarned: number;
  startedAt: Date | null;
  completedAt: Date | null;
  bossExamPassed: boolean;
  bossExamAttempts: number;
}

export interface UserLessonProgress {
  id: number;
  userId: number;
  unitLessonId: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  progressPercentage: number;
  contentCompleted: number;
  totalContent: number;
  vocabularyMastered: number;
  grammarMastered: number;
  exercisesCompleted: number;
  xpEarned: number;
  timeSpentSeconds: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lastActivityAt: Date | null;
}

export interface MapProgressWithDetails extends UserMapProgress {
  mapName: string;
  mapLevel: string;
  totalUnits: number;
}

export interface UnitProgressWithDetails extends UserUnitProgress {
  unitName: string;
  unitNumber: number;
  unitTheme: string | null;
}

export interface LessonProgressWithDetails extends UserLessonProgress {
  lessonTitle: string;
  lessonNumber: number;
  lessonType: string;
}

// ============================================================
// Service
// ============================================================

export class UserProgressService {
  // ============================================================
  // Map Progress
  // ============================================================

  /**
   * Get user's progress for all maps
   */
  async getUserMapProgress(userId: number): Promise<MapProgressWithDetails[]> {
    const [rows] = await pool.execute<(UserMapProgressRow & RowDataPacket)[]>(
      `SELECT ump.*, wm.name as map_name, wm.level as map_level,
              (SELECT COUNT(*) FROM map_units WHERE word_map_id = wm.id AND is_active = TRUE) as total_units
       FROM user_map_progress ump
       JOIN word_maps wm ON ump.word_map_id = wm.id
       WHERE ump.user_id = ?
       ORDER BY wm.level ASC`,
      [userId]
    );

    return rows.map(row => ({
      ...this.mapToUserMapProgress(row),
      mapName: row.map_name as string,
      mapLevel: row.map_level as string,
      totalUnits: row.total_units as number,
    }));
  }

  /**
   * Get or create user's progress for a specific map
   */
  async getOrCreateMapProgress(userId: number, wordMapId: number): Promise<UserMapProgress> {
    // Check existing
    const [existing] = await pool.execute<UserMapProgressRow[]>(
      'SELECT * FROM user_map_progress WHERE user_id = ? AND word_map_id = ?',
      [userId, wordMapId]
    );

    if (existing.length > 0) {
      return this.mapToUserMapProgress(existing[0]);
    }

    // Create new progress
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO user_map_progress (user_id, word_map_id, progress_percentage, total_xp_earned, units_completed, lessons_completed, is_active)
       VALUES (?, ?, 0, 0, 0, 0, TRUE)`,
      [userId, wordMapId]
    );

    // Initialize unit progress for all units
    await this.initializeUnitProgress(userId, wordMapId);

    const [rows] = await pool.execute<UserMapProgressRow[]>(
      'SELECT * FROM user_map_progress WHERE id = ?',
      [result.insertId]
    );

    return this.mapToUserMapProgress(rows[0]);
  }

  /**
   * Update map progress
   */
  async updateMapProgress(
    userId: number,
    wordMapId: number,
    updates: Partial<{
      currentUnitId: number | null;
      progressPercentage: number;
      totalXpEarned: number;
      unitsCompleted: number;
      lessonsCompleted: number;
      completedAt: Date | null;
    }>
  ): Promise<UserMapProgress | null> {
    const updateFields: string[] = ['last_activity_at = NOW()'];
    const params: (number | null | Date)[] = [];

    if (updates.currentUnitId !== undefined) {
      updateFields.push('current_unit_id = ?');
      params.push(updates.currentUnitId);
    }
    if (updates.progressPercentage !== undefined) {
      updateFields.push('progress_percentage = ?');
      params.push(updates.progressPercentage);
    }
    if (updates.totalXpEarned !== undefined) {
      updateFields.push('total_xp_earned = ?');
      params.push(updates.totalXpEarned);
    }
    if (updates.unitsCompleted !== undefined) {
      updateFields.push('units_completed = ?');
      params.push(updates.unitsCompleted);
    }
    if (updates.lessonsCompleted !== undefined) {
      updateFields.push('lessons_completed = ?');
      params.push(updates.lessonsCompleted);
    }
    if (updates.completedAt !== undefined) {
      updateFields.push('completed_at = ?');
      params.push(updates.completedAt);
    }

    params.push(userId, wordMapId);

    await pool.execute(
      `UPDATE user_map_progress SET ${updateFields.join(', ')} WHERE user_id = ? AND word_map_id = ?`,
      params
    );

    const [rows] = await pool.execute<UserMapProgressRow[]>(
      'SELECT * FROM user_map_progress WHERE user_id = ? AND word_map_id = ?',
      [userId, wordMapId]
    );

    return rows.length > 0 ? this.mapToUserMapProgress(rows[0]) : null;
  }

  // ============================================================
  // Unit Progress
  // ============================================================

  /**
   * Initialize unit progress for a map
   */
  private async initializeUnitProgress(userId: number, wordMapId: number): Promise<void> {
    const [units] = await pool.execute<RowDataPacket[]>(
      'SELECT id, unit_number FROM map_units WHERE word_map_id = ? AND is_active = TRUE ORDER BY unit_number',
      [wordMapId]
    );

    if (units.length === 0) return;

    // First unit is available, rest are locked
    const values = units.map((unit, index) => {
      const status = index === 0 ? 'available' : 'locked';
      return `(${userId}, ${unit.id}, '${status}', 0, 0, 0, 0, FALSE, 0)`;
    }).join(', ');

    await pool.execute(
      `INSERT INTO user_unit_progress (user_id, map_unit_id, status, progress_percentage, lessons_completed, total_lessons, xp_earned, boss_exam_passed, boss_exam_attempts)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE user_id = user_id`
    );

    // Initialize lesson progress for first unit
    const firstUnitId = units[0].id;
    await this.initializeLessonProgress(userId, firstUnitId as number);
  }

  /**
   * Get user's unit progress for a map
   */
  async getUnitProgress(userId: number, wordMapId: number): Promise<UnitProgressWithDetails[]> {
    const [rows] = await pool.execute<(UserUnitProgressRow & RowDataPacket)[]>(
      `SELECT uup.*, mu.name as unit_name, mu.unit_number, mu.theme as unit_theme
       FROM user_unit_progress uup
       JOIN map_units mu ON uup.map_unit_id = mu.id
       WHERE uup.user_id = ? AND mu.word_map_id = ?
       ORDER BY mu.unit_number ASC`,
      [userId, wordMapId]
    );

    return rows.map(row => ({
      ...this.mapToUserUnitProgress(row),
      unitName: row.unit_name as string,
      unitNumber: row.unit_number as number,
      unitTheme: row.unit_theme as string | null,
    }));
  }

  /**
   * Get single unit progress
   */
  async getSingleUnitProgress(userId: number, unitId: number): Promise<UserUnitProgress | null> {
    const [rows] = await pool.execute<UserUnitProgressRow[]>(
      'SELECT * FROM user_unit_progress WHERE user_id = ? AND map_unit_id = ?',
      [userId, unitId]
    );

    return rows.length > 0 ? this.mapToUserUnitProgress(rows[0]) : null;
  }

  /**
   * Update unit progress
   */
  async updateUnitProgress(
    userId: number,
    unitId: number,
    updates: Partial<{
      status: 'locked' | 'available' | 'in_progress' | 'completed';
      progressPercentage: number;
      lessonsCompleted: number;
      xpEarned: number;
      bossExamPassed: boolean;
      bossExamAttempts: number;
      completedAt: Date | null;
    }>
  ): Promise<UserUnitProgress | null> {
    const updateFields: string[] = [];
    const params: (string | number | boolean | null | Date)[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updates.status);
      if (updates.status === 'in_progress' && !updates.completedAt) {
        updateFields.push('started_at = COALESCE(started_at, NOW())');
      }
    }
    if (updates.progressPercentage !== undefined) {
      updateFields.push('progress_percentage = ?');
      params.push(updates.progressPercentage);
    }
    if (updates.lessonsCompleted !== undefined) {
      updateFields.push('lessons_completed = ?');
      params.push(updates.lessonsCompleted);
    }
    if (updates.xpEarned !== undefined) {
      updateFields.push('xp_earned = ?');
      params.push(updates.xpEarned);
    }
    if (updates.bossExamPassed !== undefined) {
      updateFields.push('boss_exam_passed = ?');
      params.push(updates.bossExamPassed);
    }
    if (updates.bossExamAttempts !== undefined) {
      updateFields.push('boss_exam_attempts = ?');
      params.push(updates.bossExamAttempts);
    }
    if (updates.completedAt !== undefined) {
      updateFields.push('completed_at = ?');
      params.push(updates.completedAt);
    }

    if (updateFields.length === 0) return this.getSingleUnitProgress(userId, unitId);

    params.push(userId, unitId);

    await pool.execute(
      `UPDATE user_unit_progress SET ${updateFields.join(', ')} WHERE user_id = ? AND map_unit_id = ?`,
      params
    );

    return this.getSingleUnitProgress(userId, unitId);
  }

  /**
   * Unlock next unit
   */
  async unlockNextUnit(userId: number, completedUnitId: number): Promise<UserUnitProgress | null> {
    // Get the completed unit's map and number
    const [unitInfo] = await pool.execute<RowDataPacket[]>(
      'SELECT word_map_id, unit_number FROM map_units WHERE id = ?',
      [completedUnitId]
    );

    if (unitInfo.length === 0) return null;

    // Find next unit
    const [nextUnit] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM map_units
       WHERE word_map_id = ? AND unit_number = ? AND is_active = TRUE`,
      [unitInfo[0].word_map_id, (unitInfo[0].unit_number as number) + 1]
    );

    if (nextUnit.length === 0) return null;

    // Check if progress exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM user_unit_progress WHERE user_id = ? AND map_unit_id = ?',
      [userId, nextUnit[0].id]
    );

    if (existing.length === 0) {
      // Create new progress
      await pool.execute(
        `INSERT INTO user_unit_progress (user_id, map_unit_id, status, progress_percentage, lessons_completed, total_lessons, xp_earned, boss_exam_passed, boss_exam_attempts)
         VALUES (?, ?, 'available', 0, 0, 0, 0, FALSE, 0)`,
        [userId, nextUnit[0].id]
      );
    } else {
      // Update status to available
      await pool.execute(
        `UPDATE user_unit_progress SET status = 'available' WHERE user_id = ? AND map_unit_id = ? AND status = 'locked'`,
        [userId, nextUnit[0].id]
      );
    }

    // Initialize lesson progress for the new unit
    await this.initializeLessonProgress(userId, nextUnit[0].id as number);

    return this.getSingleUnitProgress(userId, nextUnit[0].id as number);
  }

  // ============================================================
  // Lesson Progress
  // ============================================================

  /**
   * Initialize lesson progress for a unit
   */
  private async initializeLessonProgress(userId: number, unitId: number): Promise<void> {
    const [lessons] = await pool.execute<RowDataPacket[]>(
      'SELECT id, lesson_number FROM unit_lessons WHERE map_unit_id = ? AND is_active = TRUE ORDER BY lesson_number',
      [unitId]
    );

    if (lessons.length === 0) return;

    // First lesson is available, rest are locked
    const values = lessons.map((lesson, index) => {
      const status = index === 0 ? 'available' : 'locked';
      return `(${userId}, ${lesson.id}, '${status}', 0, 0, 0, 0, 0, 0, 0, 0)`;
    }).join(', ');

    await pool.execute(
      `INSERT INTO user_lesson_progress (user_id, unit_lesson_id, status, progress_percentage, content_completed, total_content, vocabulary_mastered, grammar_mastered, exercises_completed, xp_earned, time_spent_seconds)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE user_id = user_id`
    );
  }

  /**
   * Get user's lesson progress for a unit
   */
  async getLessonProgress(userId: number, unitId: number): Promise<LessonProgressWithDetails[]> {
    const [rows] = await pool.execute<(UserLessonProgressRow & RowDataPacket)[]>(
      `SELECT ulp.*, ul.title as lesson_title, ul.lesson_number, ul.lesson_type
       FROM user_lesson_progress ulp
       JOIN unit_lessons ul ON ulp.unit_lesson_id = ul.id
       WHERE ulp.user_id = ? AND ul.map_unit_id = ?
       ORDER BY ul.lesson_number ASC`,
      [userId, unitId]
    );

    return rows.map(row => ({
      ...this.mapToUserLessonProgress(row),
      lessonTitle: row.lesson_title as string,
      lessonNumber: row.lesson_number as number,
      lessonType: row.lesson_type as string,
    }));
  }

  /**
   * Get single lesson progress
   */
  async getSingleLessonProgress(userId: number, lessonId: number): Promise<UserLessonProgress | null> {
    const [rows] = await pool.execute<UserLessonProgressRow[]>(
      'SELECT * FROM user_lesson_progress WHERE user_id = ? AND unit_lesson_id = ?',
      [userId, lessonId]
    );

    return rows.length > 0 ? this.mapToUserLessonProgress(rows[0]) : null;
  }

  /**
   * Update lesson progress
   */
  async updateLessonProgress(
    userId: number,
    lessonId: number,
    updates: Partial<{
      status: 'locked' | 'available' | 'in_progress' | 'completed';
      progressPercentage: number;
      contentCompleted: number;
      totalContent: number;
      vocabularyMastered: number;
      grammarMastered: number;
      exercisesCompleted: number;
      xpEarned: number;
      timeSpentSeconds: number;
      completedAt: Date | null;
    }>
  ): Promise<UserLessonProgress | null> {
    const updateFields: string[] = ['last_activity_at = NOW()'];
    const params: (string | number | null | Date)[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updates.status);
      if (updates.status === 'in_progress') {
        updateFields.push('started_at = COALESCE(started_at, NOW())');
      }
    }
    if (updates.progressPercentage !== undefined) {
      updateFields.push('progress_percentage = ?');
      params.push(updates.progressPercentage);
    }
    if (updates.contentCompleted !== undefined) {
      updateFields.push('content_completed = ?');
      params.push(updates.contentCompleted);
    }
    if (updates.totalContent !== undefined) {
      updateFields.push('total_content = ?');
      params.push(updates.totalContent);
    }
    if (updates.vocabularyMastered !== undefined) {
      updateFields.push('vocabulary_mastered = ?');
      params.push(updates.vocabularyMastered);
    }
    if (updates.grammarMastered !== undefined) {
      updateFields.push('grammar_mastered = ?');
      params.push(updates.grammarMastered);
    }
    if (updates.exercisesCompleted !== undefined) {
      updateFields.push('exercises_completed = ?');
      params.push(updates.exercisesCompleted);
    }
    if (updates.xpEarned !== undefined) {
      updateFields.push('xp_earned = ?');
      params.push(updates.xpEarned);
    }
    if (updates.timeSpentSeconds !== undefined) {
      updateFields.push('time_spent_seconds = time_spent_seconds + ?');
      params.push(updates.timeSpentSeconds);
    }
    if (updates.completedAt !== undefined) {
      updateFields.push('completed_at = ?');
      params.push(updates.completedAt);
    }

    params.push(userId, lessonId);

    await pool.execute(
      `UPDATE user_lesson_progress SET ${updateFields.join(', ')} WHERE user_id = ? AND unit_lesson_id = ?`,
      params
    );

    return this.getSingleLessonProgress(userId, lessonId);
  }

  /**
   * Complete a lesson and unlock next
   */
  async completeLesson(
    userId: number,
    lessonId: number,
    xpEarned: number
  ): Promise<{ lessonProgress: UserLessonProgress; nextLesson: UserLessonProgress | null }> {
    // Mark lesson as completed
    const lessonProgress = await this.updateLessonProgress(userId, lessonId, {
      status: 'completed',
      progressPercentage: 100,
      completedAt: new Date(),
      xpEarned,
    });

    if (!lessonProgress) {
      throw new Error('Failed to update lesson progress');
    }

    // Get lesson info
    const [lessonInfo] = await pool.execute<RowDataPacket[]>(
      'SELECT map_unit_id, lesson_number FROM unit_lessons WHERE id = ?',
      [lessonId]
    );

    if (lessonInfo.length === 0) {
      return { lessonProgress, nextLesson: null };
    }

    // Find next lesson
    const [nextLesson] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM unit_lessons
       WHERE map_unit_id = ? AND lesson_number = ? AND is_active = TRUE`,
      [lessonInfo[0].map_unit_id, (lessonInfo[0].lesson_number as number) + 1]
    );

    let nextLessonProgress: UserLessonProgress | null = null;

    if (nextLesson.length > 0) {
      // Unlock next lesson
      await pool.execute(
        `UPDATE user_lesson_progress SET status = 'available'
         WHERE user_id = ? AND unit_lesson_id = ? AND status = 'locked'`,
        [userId, nextLesson[0].id]
      );
      nextLessonProgress = await this.getSingleLessonProgress(userId, nextLesson[0].id as number);
    }

    // Update unit progress
    await this.recalculateUnitProgress(userId, lessonInfo[0].map_unit_id as number);

    return { lessonProgress, nextLesson: nextLessonProgress };
  }

  /**
   * Recalculate unit progress based on lessons
   */
  async recalculateUnitProgress(userId: number, unitId: number): Promise<void> {
    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(xp_earned) as total_xp
       FROM user_lesson_progress ulp
       JOIN unit_lessons ul ON ulp.unit_lesson_id = ul.id
       WHERE ulp.user_id = ? AND ul.map_unit_id = ?`,
      [userId, unitId]
    );

    const total = stats[0].total as number;
    const completed = stats[0].completed as number;
    const totalXp = stats[0].total_xp as number;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    await this.updateUnitProgress(userId, unitId, {
      lessonsCompleted: completed,
      progressPercentage: percentage,
      xpEarned: totalXp,
    });
  }

  // ============================================================
  // Study Sessions
  // ============================================================

  /**
   * Start a study session
   */
  async startStudySession(
    userId: number,
    sessionType: 'lesson' | 'review' | 'practice' | 'exam',
    targetId?: number
  ): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO study_sessions (user_id, session_type, word_map_id, map_unit_id, unit_lesson_id, started_at)
       VALUES (?, ?, NULL, NULL, ?, NOW())`,
      [userId, sessionType, targetId || null]
    );

    return result.insertId;
  }

  /**
   * End a study session
   */
  async endStudySession(
    sessionId: number,
    stats: {
      itemsStudied?: number;
      itemsCorrect?: number;
      xpEarned?: number;
    }
  ): Promise<void> {
    await pool.execute(
      `UPDATE study_sessions SET
         ended_at = NOW(),
         duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
         items_studied = ?,
         items_correct = ?,
         xp_earned = ?
       WHERE id = ?`,
      [stats.itemsStudied || 0, stats.itemsCorrect || 0, stats.xpEarned || 0, sessionId]
    );
  }

  /**
   * Get user's recent study sessions
   */
  async getRecentStudySessions(userId: number, limit: number = 10): Promise<{
    id: number;
    sessionType: string;
    startedAt: Date;
    endedAt: Date | null;
    durationSeconds: number;
    itemsStudied: number;
    itemsCorrect: number;
    xpEarned: number;
  }[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM study_sessions
       WHERE user_id = ?
       ORDER BY started_at DESC
       LIMIT ?`,
      [userId, Number(limit)]
    );

    return rows.map(row => ({
      id: row.id as number,
      sessionType: row.session_type as string,
      startedAt: row.started_at as Date,
      endedAt: row.ended_at as Date | null,
      durationSeconds: row.duration_seconds as number,
      itemsStudied: row.items_studied as number,
      itemsCorrect: row.items_correct as number,
      xpEarned: row.xp_earned as number,
    }));
  }

  /**
   * Get user's study statistics
   */
  async getStudyStats(userId: number, days: number = 30): Promise<{
    totalSessions: number;
    totalTimeSeconds: number;
    totalItemsStudied: number;
    totalXpEarned: number;
    averageAccuracy: number;
    sessionsPerDay: { date: string; count: number }[];
  }> {
    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) as total_sessions,
         COALESCE(SUM(duration_seconds), 0) as total_time,
         COALESCE(SUM(items_studied), 0) as total_items,
         COALESCE(SUM(xp_earned), 0) as total_xp,
         CASE WHEN SUM(items_studied) > 0
              THEN ROUND(SUM(items_correct) / SUM(items_studied) * 100, 1)
              ELSE 0 END as avg_accuracy
       FROM study_sessions
       WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [userId, days]
    );

    const [daily] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(started_at) as date, COUNT(*) as count
       FROM study_sessions
       WHERE user_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(started_at)
       ORDER BY date ASC`,
      [userId, days]
    );

    return {
      totalSessions: stats[0].total_sessions as number,
      totalTimeSeconds: stats[0].total_time as number,
      totalItemsStudied: stats[0].total_items as number,
      totalXpEarned: stats[0].total_xp as number,
      averageAccuracy: stats[0].avg_accuracy as number,
      sessionsPerDay: daily.map(row => ({
        date: (row.date as Date).toISOString().split('T')[0],
        count: row.count as number,
      })),
    };
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private mapToUserMapProgress(row: UserMapProgressRow): UserMapProgress {
    return {
      id: row.id,
      userId: row.user_id,
      wordMapId: row.word_map_id,
      currentUnitId: row.current_unit_id,
      progressPercentage: row.progress_percentage,
      totalXpEarned: row.total_xp_earned,
      unitsCompleted: row.units_completed,
      lessonsCompleted: row.lessons_completed,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      completedAt: row.completed_at,
      isActive: row.is_active,
    };
  }

  private mapToUserUnitProgress(row: UserUnitProgressRow): UserUnitProgress {
    return {
      id: row.id,
      userId: row.user_id,
      mapUnitId: row.map_unit_id,
      status: row.status as 'locked' | 'available' | 'in_progress' | 'completed',
      progressPercentage: row.progress_percentage,
      lessonsCompleted: row.lessons_completed,
      totalLessons: row.total_lessons,
      xpEarned: row.xp_earned,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      bossExamPassed: row.boss_exam_passed,
      bossExamAttempts: row.boss_exam_attempts,
    };
  }

  private mapToUserLessonProgress(row: UserLessonProgressRow): UserLessonProgress {
    return {
      id: row.id,
      userId: row.user_id,
      unitLessonId: row.unit_lesson_id,
      status: row.status as 'locked' | 'available' | 'in_progress' | 'completed',
      progressPercentage: row.progress_percentage,
      contentCompleted: row.content_completed,
      totalContent: row.total_content,
      vocabularyMastered: row.vocabulary_mastered,
      grammarMastered: row.grammar_mastered,
      exercisesCompleted: row.exercises_completed,
      xpEarned: row.xp_earned,
      timeSpentSeconds: row.time_spent_seconds,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      lastActivityAt: row.last_activity_at,
    };
  }
}

export const userProgressService = new UserProgressService();
