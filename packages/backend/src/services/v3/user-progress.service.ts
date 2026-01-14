import pool from '../../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

interface UserMapProgressRow extends RowDataPacket {
  id: number;
  user_id: number;
  map_id: number;
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
  unit_id: number;
  map_progress_id: number;
  status: string;
  completion_percentage: number;
  lessons_completed: number;
  xp_earned: number;
  started_at: Date | null;
  completed_at: Date | null;
  boss_exams_passed: number;
  total_exam_attempts: number;
}

interface UserLessonProgressRow extends RowDataPacket {
  id: number;
  user_id: number;
  lesson_id: number;
  unit_progress_id: number;
  status: string;
  content_progress_percentage: number;
  vocabulary_learned: number;
  grammar_learned: number;
  xp_earned: number;
  study_time_minutes: number;
  study_started_at: Date | null;
  study_completed_at: Date | null;
  exam_passed_at: Date | null;
  boss_exam_passed: boolean;
  exam_attempts: number;
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
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
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
  status: 'locked' | 'unlocked' | 'studying' | 'exam_ready' | 'completed';
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
      `SELECT ump.*, wm.name as map_name, wm.cefr_level as map_level,
              (SELECT COUNT(*) FROM map_units WHERE map_id = wm.id AND is_active = TRUE) as total_units
       FROM user_map_progress ump
       JOIN word_maps wm ON ump.map_id = wm.id
       WHERE ump.user_id = ?
       ORDER BY wm.cefr_level ASC`,
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
      'SELECT * FROM user_map_progress WHERE user_id = ? AND map_id = ?',
      [userId, wordMapId]
    );

    if (existing.length > 0) {
      // Map progress exists, but ensure unit/lesson progress is also initialized
      // This handles cases where map progress was created before unit/lesson initialization was added
      await this.ensureUnitLessonProgressExists(userId, wordMapId);
      return this.mapToUserMapProgress(existing[0]);
    }

    // Create new progress
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO user_map_progress (user_id, map_id, completion_percentage, total_xp_earned, units_completed, lessons_completed, is_active)
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
   * Ensure unit and lesson progress exists for a map
   * This is used to fix cases where map progress exists but unit/lesson progress doesn't
   */
  private async ensureUnitLessonProgressExists(userId: number, wordMapId: number): Promise<void> {
    // Check if unit progress exists
    const [unitProgress] = await pool.execute<RowDataPacket[]>(
      `SELECT uup.id FROM user_unit_progress uup
       JOIN map_units mu ON uup.unit_id = mu.id
       WHERE uup.user_id = ? AND mu.map_id = ?
       LIMIT 1`,
      [userId, wordMapId]
    );

    if (unitProgress.length === 0) {
      // No unit progress found, initialize it
      console.log(`[UserProgress] Initializing missing unit/lesson progress for user ${userId}, map ${wordMapId}`);
      await this.initializeUnitProgress(userId, wordMapId);
    }
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
      `UPDATE user_map_progress SET ${updateFields.join(', ')} WHERE user_id = ? AND map_id = ?`,
      params
    );

    const [rows] = await pool.execute<UserMapProgressRow[]>(
      'SELECT * FROM user_map_progress WHERE user_id = ? AND map_id = ?',
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
    // Get map progress id first
    const [mapProgress] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM user_map_progress WHERE user_id = ? AND map_id = ?',
      [userId, wordMapId]
    );

    if (mapProgress.length === 0) return;

    const mapProgressId = mapProgress[0].id as number;

    const [units] = await pool.execute<RowDataPacket[]>(
      'SELECT id, unit_number FROM map_units WHERE map_id = ? AND is_active = TRUE ORDER BY unit_number',
      [wordMapId]
    );

    if (units.length === 0) return;

    // First unit is unlocked, rest are locked
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const status = i === 0 ? 'unlocked' : 'locked';

      await pool.execute(
        `INSERT INTO user_unit_progress (user_id, unit_id, map_progress_id, status, completion_percentage, lessons_completed, xp_earned, boss_exams_passed, total_exam_attempts)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0)
         ON DUPLICATE KEY UPDATE user_id = user_id`,
        [userId, unit.id, mapProgressId, status]
      );
    }

    // Initialize lesson progress for first unit
    const firstUnitId = units[0].id as number;
    await this.initializeLessonProgress(userId, firstUnitId, mapProgressId);
  }

  /**
   * Get user's unit progress for a map
   */
  async getUnitProgress(userId: number, wordMapId: number): Promise<UnitProgressWithDetails[]> {
    const [rows] = await pool.execute<(UserUnitProgressRow & RowDataPacket)[]>(
      `SELECT uup.*, mu.title as unit_name, mu.unit_number, mu.description as unit_theme
       FROM user_unit_progress uup
       JOIN map_units mu ON uup.unit_id = mu.id
       WHERE uup.user_id = ? AND mu.map_id = ?
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
      'SELECT * FROM user_unit_progress WHERE user_id = ? AND unit_id = ?',
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
      status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
      progressPercentage: number;
      lessonsCompleted: number;
      xpEarned: number;
      bossExamsPassed: number;
      totalExamAttempts: number;
      completedAt: Date | null;
    }>
  ): Promise<UserUnitProgress | null> {
    const updateFields: string[] = [];
    const params: (string | number | null | Date)[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updates.status);
      if (updates.status === 'in_progress' && !updates.completedAt) {
        updateFields.push('started_at = COALESCE(started_at, NOW())');
      }
    }
    if (updates.progressPercentage !== undefined) {
      updateFields.push('completion_percentage = ?');
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
    if (updates.bossExamsPassed !== undefined) {
      updateFields.push('boss_exams_passed = ?');
      params.push(updates.bossExamsPassed);
    }
    if (updates.totalExamAttempts !== undefined) {
      updateFields.push('total_exam_attempts = ?');
      params.push(updates.totalExamAttempts);
    }
    if (updates.completedAt !== undefined) {
      updateFields.push('completed_at = ?');
      params.push(updates.completedAt);
    }

    if (updateFields.length === 0) return this.getSingleUnitProgress(userId, unitId);

    params.push(userId, unitId);

    await pool.execute(
      `UPDATE user_unit_progress SET ${updateFields.join(', ')} WHERE user_id = ? AND unit_id = ?`,
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
      'SELECT map_id, unit_number FROM map_units WHERE id = ?',
      [completedUnitId]
    );

    if (unitInfo.length === 0) return null;

    // Find next unit
    const [nextUnit] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM map_units
       WHERE map_id = ? AND unit_number = ? AND is_active = TRUE`,
      [unitInfo[0].map_id, (unitInfo[0].unit_number as number) + 1]
    );

    if (nextUnit.length === 0) return null;

    // Get map progress id
    const [mapProgress] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM user_map_progress WHERE user_id = ? AND map_id = ?',
      [userId, unitInfo[0].map_id]
    );

    if (mapProgress.length === 0) return null;

    const mapProgressId = mapProgress[0].id as number;

    // Check if progress exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM user_unit_progress WHERE user_id = ? AND unit_id = ?',
      [userId, nextUnit[0].id]
    );

    if (existing.length === 0) {
      // Create new progress
      await pool.execute(
        `INSERT INTO user_unit_progress (user_id, unit_id, map_progress_id, status, completion_percentage, lessons_completed, xp_earned, boss_exams_passed, total_exam_attempts)
         VALUES (?, ?, ?, 'unlocked', 0, 0, 0, 0, 0)`,
        [userId, nextUnit[0].id, mapProgressId]
      );
    } else {
      // Update status to unlocked
      await pool.execute(
        `UPDATE user_unit_progress SET status = 'unlocked', unlocked_at = NOW() WHERE user_id = ? AND unit_id = ? AND status = 'locked'`,
        [userId, nextUnit[0].id]
      );
    }

    // Initialize lesson progress for the new unit
    await this.initializeLessonProgress(userId, nextUnit[0].id as number, mapProgressId);

    return this.getSingleUnitProgress(userId, nextUnit[0].id as number);
  }

  // ============================================================
  // Lesson Progress
  // ============================================================

  /**
   * Initialize lesson progress for a unit
   */
  private async initializeLessonProgress(userId: number, unitId: number, mapProgressId?: number): Promise<void> {
    // Get unit progress id
    const [unitProgress] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM user_unit_progress WHERE user_id = ? AND unit_id = ?',
      [userId, unitId]
    );

    if (unitProgress.length === 0) return;

    const unitProgressId = unitProgress[0].id as number;

    const [lessons] = await pool.execute<RowDataPacket[]>(
      'SELECT id, lesson_number FROM unit_lessons WHERE unit_id = ? AND is_active = TRUE ORDER BY lesson_number',
      [unitId]
    );

    if (lessons.length === 0) return;

    // First lesson is unlocked, rest are locked
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const status = i === 0 ? 'unlocked' : 'locked';

      await pool.execute(
        `INSERT INTO user_lesson_progress (user_id, lesson_id, unit_progress_id, status, content_progress_percentage, vocabulary_learned, grammar_learned, xp_earned, study_time_minutes, exam_attempts, boss_exam_passed)
         VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, FALSE)
         ON DUPLICATE KEY UPDATE user_id = user_id`,
        [userId, lesson.id, unitProgressId, status]
      );
    }
  }

  /**
   * Get user's lesson progress for a unit
   */
  async getLessonProgress(userId: number, unitId: number): Promise<LessonProgressWithDetails[]> {
    const [rows] = await pool.execute<(UserLessonProgressRow & RowDataPacket)[]>(
      `SELECT ulp.*, ul.title as lesson_title, ul.lesson_number, ul.lesson_type
       FROM user_lesson_progress ulp
       JOIN unit_lessons ul ON ulp.lesson_id = ul.id
       WHERE ulp.user_id = ? AND ul.unit_id = ?
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
      'SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?',
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
      status: 'locked' | 'unlocked' | 'studying' | 'exam_ready' | 'completed';
      progressPercentage: number;
      vocabularyLearned: number;
      grammarLearned: number;
      xpEarned: number;
      studyTimeMinutes: number;
      studyCompletedAt: Date | null;
      examPassedAt: Date | null;
    }>
  ): Promise<UserLessonProgress | null> {
    const updateFields: string[] = [];
    const params: (string | number | null | Date)[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updates.status);
      if (updates.status === 'studying') {
        updateFields.push('study_started_at = COALESCE(study_started_at, NOW())');
      }
    }
    if (updates.progressPercentage !== undefined) {
      updateFields.push('content_progress_percentage = ?');
      params.push(updates.progressPercentage);
    }
    if (updates.vocabularyLearned !== undefined) {
      updateFields.push('vocabulary_learned = ?');
      params.push(updates.vocabularyLearned);
    }
    if (updates.grammarLearned !== undefined) {
      updateFields.push('grammar_learned = ?');
      params.push(updates.grammarLearned);
    }
    if (updates.xpEarned !== undefined) {
      updateFields.push('xp_earned = ?');
      params.push(updates.xpEarned);
    }
    if (updates.studyTimeMinutes !== undefined) {
      updateFields.push('study_time_minutes = study_time_minutes + ?');
      params.push(updates.studyTimeMinutes);
    }
    if (updates.studyCompletedAt !== undefined) {
      updateFields.push('study_completed_at = ?');
      params.push(updates.studyCompletedAt);
    }
    if (updates.examPassedAt !== undefined) {
      updateFields.push('exam_passed_at = ?');
      params.push(updates.examPassedAt);
    }

    if (updateFields.length === 0) return this.getSingleLessonProgress(userId, lessonId);

    params.push(userId, lessonId);

    await pool.execute(
      `UPDATE user_lesson_progress SET ${updateFields.join(', ')} WHERE user_id = ? AND lesson_id = ?`,
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
      examPassedAt: new Date(),
      xpEarned,
    });

    if (!lessonProgress) {
      throw new Error('Failed to update lesson progress');
    }

    // Get lesson info
    const [lessonInfo] = await pool.execute<RowDataPacket[]>(
      'SELECT unit_id, lesson_number FROM unit_lessons WHERE id = ?',
      [lessonId]
    );

    if (lessonInfo.length === 0) {
      return { lessonProgress, nextLesson: null };
    }

    // Find next lesson
    const [nextLesson] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM unit_lessons
       WHERE unit_id = ? AND lesson_number = ? AND is_active = TRUE`,
      [lessonInfo[0].unit_id, (lessonInfo[0].lesson_number as number) + 1]
    );

    let nextLessonProgress: UserLessonProgress | null = null;

    if (nextLesson.length > 0) {
      // Unlock next lesson
      await pool.execute(
        `UPDATE user_lesson_progress SET status = 'unlocked', unlocked_at = NOW()
         WHERE user_id = ? AND lesson_id = ? AND status = 'locked'`,
        [userId, nextLesson[0].id]
      );
      nextLessonProgress = await this.getSingleLessonProgress(userId, nextLesson[0].id as number);
    }

    // Update unit progress
    await this.recalculateUnitProgress(userId, lessonInfo[0].unit_id as number);

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
       JOIN unit_lessons ul ON ulp.lesson_id = ul.id
       WHERE ulp.user_id = ? AND ul.unit_id = ?`,
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
    // Map session types to match the enum in study_sessions table
    const dbSessionType = sessionType === 'lesson' ? 'study' : sessionType;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO study_sessions (user_id, session_type, map_id, unit_id, lesson_id, started_at)
       VALUES (?, ?, NULL, NULL, ?, NOW())`,
      [userId, dbSessionType, targetId || null]
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
         vocabulary_studied = ?,
         correct_answers = ?,
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
      itemsStudied: row.vocabulary_studied as number,
      itemsCorrect: row.correct_answers as number,
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
         COALESCE(SUM(vocabulary_studied), 0) as total_items,
         COALESCE(SUM(xp_earned), 0) as total_xp,
         CASE WHEN SUM(vocabulary_studied) > 0
              THEN ROUND(SUM(correct_answers) / SUM(vocabulary_studied) * 100, 1)
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
      wordMapId: row.map_id,
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
      mapUnitId: row.unit_id,
      status: row.status as 'locked' | 'unlocked' | 'in_progress' | 'completed',
      progressPercentage: Number(row.completion_percentage) || 0,
      lessonsCompleted: row.lessons_completed,
      totalLessons: 0, // Not stored in DB, computed when needed
      xpEarned: row.xp_earned,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      bossExamPassed: row.boss_exams_passed > 0,
      bossExamAttempts: row.total_exam_attempts,
    };
  }

  private mapToUserLessonProgress(row: UserLessonProgressRow): UserLessonProgress {
    return {
      id: row.id,
      userId: row.user_id,
      unitLessonId: row.lesson_id,
      status: row.status as 'locked' | 'unlocked' | 'studying' | 'exam_ready' | 'completed',
      progressPercentage: Number(row.content_progress_percentage) || 0,
      contentCompleted: 0, // Not stored in DB
      totalContent: 0, // Not stored in DB
      vocabularyMastered: row.vocabulary_learned,
      grammarMastered: row.grammar_learned,
      exercisesCompleted: 0, // Not stored in DB
      xpEarned: row.xp_earned,
      timeSpentSeconds: row.study_time_minutes * 60,
      startedAt: row.study_started_at,
      completedAt: row.exam_passed_at,
      lastActivityAt: null, // Not stored in DB
    };
  }

  // ============================================================
  // Step Progress Tracking (Continue Learning & Replay)
  // ============================================================

  /**
   * Save lesson step progress
   * Called every time user completes a vocabulary card, grammar point, or exercise
   */
  async saveLessonStepProgress(
    userId: number,
    lessonId: number,
    stepData: {
      currentStep: 'overview' | 'vocabulary' | 'grammar' | 'exercises' | 'exam' | 'complete';
      currentStepIndex: number;
      stepProgress: {
        vocabulary?: { studied: number[]; total: number; currentIndex: number; completed: boolean };
        grammar?: { viewed: number[]; total: number; currentIndex: number; completed: boolean };
        exercises?: { answered: number[]; correct: number[]; total: number; currentIndex: number; completed: boolean };
      };
    }
  ): Promise<void> {
    const stepProgressJson = JSON.stringify(stepData.stepProgress);

    // Determine if user can continue (not completed and has made progress)
    const canContinue = stepData.currentStep !== 'complete' && (
      stepData.currentStep !== 'overview' ||
      stepData.currentStepIndex > 0 ||
      Object.keys(stepData.stepProgress).length > 0
    );

    await pool.execute(
      `UPDATE user_lesson_progress
       SET current_step = ?,
           current_step_index = ?,
           step_progress = ?,
           can_continue = ?,
           last_step_at = NOW(),
           status = CASE
             WHEN status = 'unlocked' THEN 'studying'
             ELSE status
           END,
           study_started_at = COALESCE(study_started_at, NOW())
       WHERE user_id = ? AND lesson_id = ?`,
      [stepData.currentStep, stepData.currentStepIndex, stepProgressJson, canContinue, userId, lessonId]
    );
  }

  /**
   * Get lesson step progress for continuation
   */
  async getLessonStepProgress(
    userId: number,
    lessonId: number
  ): Promise<{
    canContinue: boolean;
    currentStep: string;
    currentStepIndex: number;
    stepProgress: {
      vocabulary?: { studied: number[]; total: number; currentIndex: number; completed: boolean };
      grammar?: { viewed: number[]; total: number; currentIndex: number; completed: boolean };
      exercises?: { answered: number[]; correct: number[]; total: number; currentIndex: number; completed: boolean };
    } | null;
    lastStepAt: Date | null;
    status: string;
  }> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT current_step, current_step_index, step_progress, can_continue, last_step_at, status
       FROM user_lesson_progress
       WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );

    if (rows.length === 0) {
      return {
        canContinue: false,
        currentStep: 'overview',
        currentStepIndex: 0,
        stepProgress: null,
        lastStepAt: null,
        status: 'locked',
      };
    }

    const row = rows[0];
    let stepProgress = null;

    if (row.step_progress) {
      try {
        stepProgress = typeof row.step_progress === 'string'
          ? JSON.parse(row.step_progress)
          : row.step_progress;
      } catch (e) {
        console.error('Error parsing step_progress:', e);
      }
    }

    return {
      canContinue: Boolean(row.can_continue),
      currentStep: row.current_step || 'overview',
      currentStepIndex: row.current_step_index || 0,
      stepProgress,
      lastStepAt: row.last_step_at || null,
      status: row.status || 'locked',
    };
  }

  /**
   * Reset lesson progress to allow replay
   * Keeps completion status but resets step progress for a fresh playthrough
   */
  async resetLessonForReplay(
    userId: number,
    lessonId: number
  ): Promise<{ success: boolean; message: string }> {
    // Check if lesson exists and is completed or at least unlocked
    const [lesson] = await pool.execute<RowDataPacket[]>(
      `SELECT status, allow_replay FROM user_lesson_progress
       WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );

    if (lesson.length === 0) {
      return { success: false, message: 'Lesson progress not found' };
    }

    if (lesson[0].status === 'locked') {
      return { success: false, message: 'Cannot replay a locked lesson' };
    }

    if (!lesson[0].allow_replay) {
      return { success: false, message: 'Replay is not allowed for this lesson' };
    }

    // Reset step progress for replay but keep the original completion status
    await pool.execute(
      `UPDATE user_lesson_progress
       SET current_step = 'overview',
           current_step_index = 0,
           step_progress = NULL,
           can_continue = FALSE,
           last_step_at = NOW()
       WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );

    return { success: true, message: 'Lesson reset for replay' };
  }

  /**
   * Check if user can access a lesson (for replay or continue)
   */
  async canAccessLesson(
    userId: number,
    lessonId: number
  ): Promise<{ canAccess: boolean; reason: string; status: string }> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, allow_replay, can_continue FROM user_lesson_progress
       WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );

    if (rows.length === 0) {
      return { canAccess: false, reason: 'Lesson progress not found', status: 'not_found' };
    }

    const row = rows[0];
    const status = row.status as string;

    if (status === 'locked') {
      return { canAccess: false, reason: 'Lesson is locked', status };
    }

    return { canAccess: true, reason: 'Access granted', status };
  }

  /**
   * Get lesson with continue learning info for a user in a map
   * Returns the first lesson that can be continued
   */
  async getContinuableLessonForMap(
    userId: number,
    mapId: number
  ): Promise<{
    lessonId: number;
    lessonTitle: string;
    unitId: number;
    unitName: string;
    currentStep: string;
    currentStepIndex: number;
    lastStepAt: Date;
    progressPercentage: number;
  } | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         ulp.lesson_id,
         ul.title as lesson_title,
         mu.id as unit_id,
         mu.title as unit_name,
         ulp.current_step,
         ulp.current_step_index,
         ulp.last_step_at,
         ulp.content_progress_percentage
       FROM user_lesson_progress ulp
       JOIN unit_lessons ul ON ulp.lesson_id = ul.id
       JOIN map_units mu ON ul.unit_id = mu.id
       WHERE ulp.user_id = ?
         AND mu.map_id = ?
         AND ulp.can_continue = TRUE
       ORDER BY ulp.last_step_at DESC
       LIMIT 1`,
      [userId, mapId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      lessonId: row.lesson_id as number,
      lessonTitle: row.lesson_title as string,
      unitId: row.unit_id as number,
      unitName: row.unit_name as string,
      currentStep: row.current_step as string,
      currentStepIndex: row.current_step_index as number,
      lastStepAt: row.last_step_at as Date,
      progressPercentage: Number(row.content_progress_percentage) || 0,
    };
  }

  /**
   * Mark lesson study as complete and disable can_continue
   */
  async markLessonStudyComplete(
    userId: number,
    lessonId: number
  ): Promise<void> {
    await pool.execute(
      `UPDATE user_lesson_progress
       SET current_step = 'complete',
           can_continue = FALSE,
           step_progress = NULL,
           study_completed_at = COALESCE(study_completed_at, NOW()),
           last_step_at = NOW()
       WHERE user_id = ? AND lesson_id = ?`,
      [userId, lessonId]
    );
  }
}

export const userProgressService = new UserProgressService();
