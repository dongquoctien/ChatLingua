import pool from '../../config/database.js';
import type { RowDataPacket } from 'mysql2';
import { gamificationService, type AchievementUnlock } from '../gamification.service.js';

// Re-export AchievementUnlock type for consumers
export type { AchievementUnlock };

// ============================================================
// Types
// ============================================================

export type WordMapEvent =
  | 'lesson_complete'
  | 'unit_complete'
  | 'map_complete'
  | 'exam_pass'
  | 'exam_perfect'
  | 'vocabulary_study'
  | 'grammar_study'
  | 'review_complete'
  | 'daily_activity';

export interface WordMapEventContext {
  lessonId?: number;
  unitId?: number;
  mapId?: number;
  examScore?: number;
  attemptNumber?: number;
  vocabularyCount?: number;
  grammarCount?: number;
  reviewCount?: number;
  timeSpentSeconds?: number;
  cefrLevel?: string;
}

interface CountRow extends RowDataPacket {
  count: number;
}

interface StatRow extends RowDataPacket {
  total_lessons: number;
  total_units: number;
  total_maps: number;
  total_exams_passed: number;
  perfect_exams: number;
  first_try_passes: number;
  total_vocabulary: number;
  consecutive_days: number;
}

// ============================================================
// Service Class
// ============================================================

export class WordMapAchievementsService {
  /**
   * Main entry point - check and award achievements based on event
   */
  async checkAndAwardAchievements(
    userId: number,
    event: WordMapEvent,
    context: WordMapEventContext = {}
  ): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    switch (event) {
      case 'lesson_complete':
        unlocks.push(...await this.checkLessonAchievements(userId));
        unlocks.push(...await this.checkDailyAchievements(userId));
        break;

      case 'unit_complete':
        unlocks.push(...await this.checkUnitAchievements(userId));
        if (context.mapId) {
          unlocks.push(...await this.checkMapAchievements(userId, context.mapId));
        }
        break;

      case 'map_complete':
        if (context.mapId) {
          unlocks.push(...await this.checkMapAchievements(userId, context.mapId));
        }
        if (context.cefrLevel) {
          unlocks.push(...await this.checkCEFRAchievements(userId, context.cefrLevel));
        }
        break;

      case 'exam_pass':
        unlocks.push(...await this.checkExamAchievements(
          userId,
          context.examScore || 0,
          context.attemptNumber || 1
        ));
        break;

      case 'exam_perfect':
        unlocks.push(...await this.checkPerfectExamAchievements(userId));
        break;

      case 'vocabulary_study':
        unlocks.push(...await this.checkVocabAchievements(userId));
        break;

      case 'review_complete':
        unlocks.push(...await this.checkStreakAchievements(userId));
        break;

      case 'daily_activity':
        unlocks.push(...await this.checkDailyAchievements(userId));
        unlocks.push(...await this.checkStreakAchievements(userId));
        break;
    }

    return unlocks;
  }

  /**
   * Check lesson milestone achievements
   */
  async checkLessonAchievements(userId: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Get total completed lessons
    const [rows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM user_lesson_progress
       WHERE user_id = ? AND study_completed = TRUE`,
      [userId]
    );

    const totalLessons = rows[0]?.count || 0;

    // Check lesson milestones
    const lessonMilestones = [
      { count: 1, code: 'WM_LESSON_1' },
      { count: 10, code: 'WM_LESSON_10' },
      { count: 25, code: 'WM_LESSON_25' },
      { count: 50, code: 'WM_LESSON_50' },
      { count: 100, code: 'WM_LESSON_100' },
    ];

    for (const milestone of lessonMilestones) {
      if (totalLessons >= milestone.count) {
        const unlock = await gamificationService.setAchievementProgress(
          userId,
          milestone.code,
          totalLessons
        );
        if (unlock) unlocks.push(unlock);
      }
    }

    return unlocks;
  }

  /**
   * Check unit milestone achievements
   */
  async checkUnitAchievements(userId: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Get total completed units (all lessons in unit completed)
    const [rows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(DISTINCT mu.id) as count
       FROM map_units mu
       WHERE NOT EXISTS (
         SELECT 1 FROM unit_lessons ul
         WHERE ul.unit_id = mu.id
         AND NOT EXISTS (
           SELECT 1 FROM user_lesson_progress ulp
           WHERE ulp.lesson_id = ul.id
           AND ulp.user_id = ?
           AND ulp.exam_passed = TRUE
         )
       )
       AND EXISTS (
         SELECT 1 FROM user_lesson_progress ulp2
         JOIN unit_lessons ul2 ON ulp2.lesson_id = ul2.id
         WHERE ul2.unit_id = mu.id AND ulp2.user_id = ?
       )`,
      [userId, userId]
    );

    const totalUnits = rows[0]?.count || 0;

    // Check unit milestones
    const unitMilestones = [
      { count: 1, code: 'WM_UNIT_1' },
      { count: 5, code: 'WM_UNIT_5' },
      { count: 10, code: 'WM_UNIT_10' },
      { count: 20, code: 'WM_UNIT_20' },
    ];

    for (const milestone of unitMilestones) {
      if (totalUnits >= milestone.count) {
        const unlock = await gamificationService.setAchievementProgress(
          userId,
          milestone.code,
          totalUnits
        );
        if (unlock) unlocks.push(unlock);
      }
    }

    return unlocks;
  }

  /**
   * Check map completion achievements
   */
  async checkMapAchievements(userId: number, mapId: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Check if map is complete (all units complete)
    const [mapProgress] = await pool.execute<RowDataPacket[]>(
      `SELECT wmp.is_completed, wm.cefr_level
       FROM word_map_progress wmp
       JOIN word_maps wm ON wmp.map_id = wm.id
       WHERE wmp.user_id = ? AND wmp.map_id = ?`,
      [userId, mapId]
    );

    if (mapProgress.length > 0 && mapProgress[0].is_completed) {
      // Get total completed maps
      const [mapCount] = await pool.execute<CountRow[]>(
        `SELECT COUNT(*) as count FROM word_map_progress
         WHERE user_id = ? AND is_completed = TRUE`,
        [userId]
      );

      const totalMaps = mapCount[0]?.count || 0;

      // Check map milestones
      const mapMilestones = [
        { count: 1, code: 'WM_MAP_1' },
        { count: 3, code: 'WM_MAP_3' },
        { count: 5, code: 'WM_MAP_5' },
      ];

      for (const milestone of mapMilestones) {
        if (totalMaps >= milestone.count) {
          const unlock = await gamificationService.setAchievementProgress(
            userId,
            milestone.code,
            totalMaps
          );
          if (unlock) unlocks.push(unlock);
        }
      }

      // Check CEFR level completion
      const cefrLevel = mapProgress[0].cefr_level;
      if (cefrLevel) {
        unlocks.push(...await this.checkCEFRAchievements(userId, cefrLevel));
      }
    }

    return unlocks;
  }

  /**
   * Check exam performance achievements
   */
  async checkExamAchievements(
    userId: number,
    score: number,
    attemptNumber: number
  ): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // First exam pass
    const examPassUnlock = await gamificationService.updateAchievementProgress(userId, 'WM_EXAM_PASS');
    if (examPassUnlock) unlocks.push(examPassUnlock);

    // Perfect score (100%)
    if (score === 100) {
      const perfectUnlock = await gamificationService.updateAchievementProgress(userId, 'WM_EXAM_PERFECT');
      if (perfectUnlock) unlocks.push(perfectUnlock);

      // Check 5 perfect exams
      unlocks.push(...await this.checkPerfectExamAchievements(userId));
    }

    // First try pass with 80%+
    if (attemptNumber === 1 && score >= 80) {
      const firstTryUnlock = await gamificationService.updateAchievementProgress(userId, 'WM_EXAM_FIRST_TRY');
      if (firstTryUnlock) unlocks.push(firstTryUnlock);
    }

    // Count total passed exams
    const [passedExams] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM exam_attempts
       WHERE user_id = ? AND passed = TRUE`,
      [userId]
    );

    const totalPassed = passedExams[0]?.count || 0;
    if (totalPassed >= 10) {
      const exam10Unlock = await gamificationService.setAchievementProgress(userId, 'WM_EXAM_10_PASSED', totalPassed);
      if (exam10Unlock) unlocks.push(exam10Unlock);
    }

    return unlocks;
  }

  /**
   * Check perfect exam achievements
   */
  async checkPerfectExamAchievements(userId: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Count perfect exams
    const [perfectExams] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM exam_attempts
       WHERE user_id = ? AND score = 100`,
      [userId]
    );

    const totalPerfect = perfectExams[0]?.count || 0;
    if (totalPerfect >= 5) {
      const unlock = await gamificationService.setAchievementProgress(userId, 'WM_EXAM_5_PERFECT', totalPerfect);
      if (unlock) unlocks.push(unlock);
    }

    return unlocks;
  }

  /**
   * Check vocabulary learning achievements
   */
  async checkVocabAchievements(userId: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Get total vocabulary from Word Maps (user_vocabulary with source_type = 'word_map')
    const [rows] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM user_vocabulary
       WHERE user_id = ? AND source_type = 'word_map'`,
      [userId]
    );

    const totalVocab = rows[0]?.count || 0;

    // Check vocabulary milestones
    const vocabMilestones = [
      { count: 50, code: 'WM_VOCAB_50' },
      { count: 100, code: 'WM_VOCAB_100' },
      { count: 250, code: 'WM_VOCAB_250' },
      { count: 500, code: 'WM_VOCAB_500' },
      { count: 1000, code: 'WM_VOCAB_1000' },
    ];

    for (const milestone of vocabMilestones) {
      if (totalVocab >= milestone.count) {
        const unlock = await gamificationService.setAchievementProgress(
          userId,
          milestone.code,
          totalVocab
        );
        if (unlock) unlocks.push(unlock);
      }
    }

    return unlocks;
  }

  /**
   * Check streak achievements for Word Map study
   */
  async checkStreakAchievements(userId: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Calculate consecutive days of Word Map activity
    const [streakRows] = await pool.execute<RowDataPacket[]>(
      `WITH activity_dates AS (
         SELECT DISTINCT DATE(updated_at) as activity_date
         FROM user_lesson_progress
         WHERE user_id = ?
         UNION
         SELECT DISTINCT DATE(created_at) as activity_date
         FROM exam_attempts
         WHERE user_id = ?
       ),
       numbered AS (
         SELECT activity_date,
                ROW_NUMBER() OVER (ORDER BY activity_date) as rn,
                DATE_SUB(activity_date, INTERVAL ROW_NUMBER() OVER (ORDER BY activity_date) DAY) as grp
         FROM activity_dates
       ),
       streaks AS (
         SELECT grp, MIN(activity_date) as start_date, MAX(activity_date) as end_date, COUNT(*) as streak_length
         FROM numbered
         GROUP BY grp
       )
       SELECT streak_length FROM streaks
       WHERE end_date = CURDATE() OR end_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
       ORDER BY streak_length DESC
       LIMIT 1`,
      [userId, userId]
    );

    const currentStreak = streakRows[0]?.streak_length || 0;

    // Check streak milestones
    const streakMilestones = [
      { days: 7, code: 'WM_STREAK_7' },
      { days: 14, code: 'WM_STREAK_14' },
      { days: 30, code: 'WM_STREAK_30' },
      { days: 60, code: 'WM_STREAK_60' },
      { days: 100, code: 'WM_STREAK_100' },
    ];

    for (const milestone of streakMilestones) {
      if (currentStreak >= milestone.days) {
        const unlock = await gamificationService.setAchievementProgress(
          userId,
          milestone.code,
          currentStreak
        );
        if (unlock) unlocks.push(unlock);
      }
    }

    return unlocks;
  }

  /**
   * Check CEFR level completion achievements
   */
  async checkCEFRAchievements(userId: number, completedLevel: string): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Check if ALL maps of this CEFR level are complete
    const [allMapsComplete] = await pool.execute<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM word_maps WHERE cefr_level = ? AND is_published = TRUE) as total_maps,
         (SELECT COUNT(*) FROM word_map_progress wmp
          JOIN word_maps wm ON wmp.map_id = wm.id
          WHERE wmp.user_id = ? AND wm.cefr_level = ? AND wmp.is_completed = TRUE) as completed_maps`,
      [completedLevel, userId, completedLevel]
    );

    const { total_maps, completed_maps } = allMapsComplete[0] || { total_maps: 0, completed_maps: 0 };

    if (total_maps > 0 && completed_maps >= total_maps) {
      const cefrAchievements: Record<string, string> = {
        'A1': 'CEFR_A1_COMPLETE',
        'A2': 'CEFR_A2_COMPLETE',
        'B1': 'CEFR_B1_COMPLETE',
        'B2': 'CEFR_B2_COMPLETE',
        'C1': 'CEFR_C1_COMPLETE',
        'C2': 'CEFR_C2_COMPLETE',
      };

      const achievementCode = cefrAchievements[completedLevel];
      if (achievementCode) {
        const unlock = await gamificationService.updateAchievementProgress(userId, achievementCode);
        if (unlock) unlocks.push(unlock);
      }
    }

    return unlocks;
  }

  /**
   * Check daily activity achievements (speed, marathon)
   */
  async checkDailyAchievements(userId: number): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    // Check lessons completed today
    const [todayLessons] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM user_lesson_progress
       WHERE user_id = ? AND DATE(updated_at) = CURDATE() AND study_completed = TRUE`,
      [userId]
    );

    const lessonsToday = todayLessons[0]?.count || 0;

    // 5 lessons in a day achievement
    if (lessonsToday >= 5) {
      const marathonUnlock = await gamificationService.updateAchievementProgress(userId, 'WM_5_LESSONS_DAY');
      if (marathonUnlock) unlocks.push(marathonUnlock);
    }

    return unlocks;
  }

  /**
   * Check speed achievements
   */
  async checkSpeedAchievements(
    userId: number,
    type: 'lesson' | 'exam',
    timeSeconds: number,
    score?: number
  ): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    if (type === 'lesson' && timeSeconds < 300) {
      // Quick lesson study (under 5 minutes)
      const unlock = await gamificationService.updateAchievementProgress(userId, 'WM_SPEED_LESSON');
      if (unlock) unlocks.push(unlock);
    }

    if (type === 'exam' && timeSeconds < 120 && score && score >= 90) {
      // Fast exam pass (under 2 minutes with 90%+)
      const unlock = await gamificationService.updateAchievementProgress(userId, 'WM_SPEED_EXAM');
      if (unlock) unlocks.push(unlock);
    }

    return unlocks;
  }

  /**
   * Get user's Word Map achievement statistics
   */
  async getWordMapStats(userId: number): Promise<StatRow> {
    const [rows] = await pool.execute<StatRow[]>(
      `SELECT
         (SELECT COUNT(*) FROM user_lesson_progress WHERE user_id = ? AND study_completed = TRUE) as total_lessons,
         (SELECT COUNT(DISTINCT mu.id) FROM map_units mu
          WHERE NOT EXISTS (
            SELECT 1 FROM unit_lessons ul WHERE ul.unit_id = mu.id
            AND NOT EXISTS (
              SELECT 1 FROM user_lesson_progress ulp
              WHERE ulp.lesson_id = ul.id AND ulp.user_id = ? AND ulp.exam_passed = TRUE
            )
          )
          AND EXISTS (
            SELECT 1 FROM user_lesson_progress ulp2
            JOIN unit_lessons ul2 ON ulp2.lesson_id = ul2.id
            WHERE ul2.unit_id = mu.id AND ulp2.user_id = ?
          )) as total_units,
         (SELECT COUNT(*) FROM word_map_progress WHERE user_id = ? AND is_completed = TRUE) as total_maps,
         (SELECT COUNT(*) FROM exam_attempts WHERE user_id = ? AND passed = TRUE) as total_exams_passed,
         (SELECT COUNT(*) FROM exam_attempts WHERE user_id = ? AND score = 100) as perfect_exams,
         (SELECT COUNT(*) FROM exam_attempts WHERE user_id = ? AND attempt_number = 1 AND score >= 80) as first_try_passes,
         (SELECT COUNT(*) FROM user_vocabulary WHERE user_id = ? AND source_type = 'word_map') as total_vocabulary,
         0 as consecutive_days`,
      [userId, userId, userId, userId, userId, userId, userId, userId]
    );

    return rows[0];
  }
}

export const wordMapAchievementsService = new WordMapAchievementsService();
