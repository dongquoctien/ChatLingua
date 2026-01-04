import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { gamificationService, XP_REWARDS } from './gamification.service.js';

// ============================================================
// Types
// ============================================================

export type ChallengeType =
  | 'spelling'
  | 'speed_quiz'
  | 'translation'
  | 'streak'
  | 'vocabulary'
  | 'perfect_score'
  | 'review'
  | 'exercise'
  | 'quiz';

export type ChallengeStatus = 'pending' | 'in_progress' | 'completed' | 'expired';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface ChallengeTemplate {
  id: number;
  challengeType: ChallengeType;
  name: string;
  description: string;
  targetValue: number;
  xpReward: number;
  difficulty: ChallengeDifficulty;
  dayOfWeek: number | null; // null = any day, 0-6 = specific day
  isActive: boolean;
}

export interface DailyChallenge {
  id: number;
  userId: number;
  templateId: number;
  template: ChallengeTemplate;
  challengeDate: Date;
  status: ChallengeStatus;
  currentProgress: number;
  targetValue: number;
  xpReward: number;
  completedAt?: Date;
  expiresAt: Date;
}

export interface ChallengeProgress {
  challengeId: number;
  progressDelta: number;
  newProgress: number;
  isCompleted: boolean;
  xpAwarded?: number;
}

// ============================================================
// Row Interfaces
// ============================================================

interface ChallengeTemplateRow extends RowDataPacket {
  id: number;
  challenge_type: ChallengeType;
  name: string;
  description: string;
  target_value: number;
  xp_reward: number;
  difficulty: ChallengeDifficulty;
  day_of_week: number | null;
  is_active: boolean;
}

interface DailyChallengeRow extends RowDataPacket {
  id: number;
  user_id: number;
  template_id: number;
  challenge_date: Date;
  status: ChallengeStatus;
  current_progress: number;
  target_value: number;
  xp_reward: number;
  completed_at: Date | null;
  expires_at: Date;
  // Joined template fields
  challenge_type?: ChallengeType;
  name?: string;
  description?: string;
  difficulty?: ChallengeDifficulty;
  day_of_week?: number | null;
  is_active?: boolean;
}

interface CountRow extends RowDataPacket {
  count: number;
}

// ============================================================
// Service Class
// ============================================================

export class ChallengeService {
  // --------------------------------------------------------
  // Challenge Templates
  // --------------------------------------------------------

  /**
   * Get all active challenge templates
   */
  async getTemplates(): Promise<ChallengeTemplate[]> {
    const [rows] = await pool.execute<ChallengeTemplateRow[]>(
      `SELECT * FROM challenge_templates WHERE is_active = TRUE ORDER BY difficulty, id`
    );

    if (rows.length === 0) {
      await this.seedTemplates();
      return this.getTemplates();
    }

    return rows.map(row => ({
      id: row.id,
      challengeType: row.challenge_type,
      name: row.name,
      description: row.description,
      targetValue: row.target_value,
      xpReward: row.xp_reward,
      difficulty: row.difficulty,
      dayOfWeek: row.day_of_week,
      isActive: row.is_active,
    }));
  }

  /**
   * Seed default challenge templates
   */
  private async seedTemplates(): Promise<void> {
    const templates = [
      // Easy challenges
      { type: 'exercise', name: 'Daily Practice', desc: 'Complete 5 exercises', target: 5, xp: 20, difficulty: 'easy' },
      { type: 'review', name: 'Review Session', desc: 'Review 10 vocabulary words', target: 10, xp: 25, difficulty: 'easy' },
      { type: 'vocabulary', name: 'Word Learner', desc: 'Learn 3 new words', target: 3, xp: 15, difficulty: 'easy' },

      // Medium challenges
      { type: 'exercise', name: 'Exercise Enthusiast', desc: 'Complete 15 exercises', target: 15, xp: 50, difficulty: 'medium' },
      { type: 'spelling', name: 'Spelling Bee', desc: 'Get 10 spelling exercises correct', target: 10, xp: 40, difficulty: 'medium' },
      { type: 'translation', name: 'Translator', desc: 'Complete 10 translation exercises', target: 10, xp: 45, difficulty: 'medium' },
      { type: 'streak', name: 'Consistency King', desc: 'Maintain your streak', target: 1, xp: 30, difficulty: 'medium' },

      // Hard challenges
      { type: 'perfect_score', name: 'Perfectionist', desc: 'Get 100% on 3 quizzes', target: 3, xp: 100, difficulty: 'hard' },
      { type: 'speed_quiz', name: 'Speed Demon', desc: 'Complete a quiz in under 2 minutes', target: 1, xp: 75, difficulty: 'hard' },
      { type: 'exercise', name: 'Marathon Runner', desc: 'Complete 30 exercises', target: 30, xp: 100, difficulty: 'hard' },
      { type: 'vocabulary', name: 'Vocabulary Master', desc: 'Learn 10 new words', target: 10, xp: 80, difficulty: 'hard' },
    ];

    for (const t of templates) {
      await pool.execute(
        `INSERT IGNORE INTO challenge_templates
         (challenge_type, name, description, target_value, xp_reward, difficulty, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [t.type, t.name, t.desc, t.target, t.xp, t.difficulty]
      );
    }
  }

  // --------------------------------------------------------
  // Daily Challenges
  // --------------------------------------------------------

  /**
   * Get local date string in YYYY-MM-DD format
   */
  private getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generate daily challenges for a user
   */
  async generateDailyChallenges(userId: number): Promise<DailyChallenge[]> {
    const today = new Date();
    const todayStr = this.getLocalDateString(today);
    const dayOfWeek = today.getDay();

    // Check if already generated today
    const [existing] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM daily_challenges
       WHERE user_id = ? AND challenge_date = ?`,
      [userId, todayStr]
    );

    if (Number(existing[0].count) > 0) {
      return this.getTodaysChallenges(userId);
    }

    // Get templates for today
    const templates = await this.getTemplates();

    // Filter templates: those with no specific day OR matching today's day
    const eligibleTemplates = templates.filter(
      t => t.dayOfWeek === null || t.dayOfWeek === dayOfWeek
    );

    // Select 3 challenges: 1 easy, 1 medium, 1 hard
    const easyTemplates = eligibleTemplates.filter(t => t.difficulty === 'easy');
    const mediumTemplates = eligibleTemplates.filter(t => t.difficulty === 'medium');
    const hardTemplates = eligibleTemplates.filter(t => t.difficulty === 'hard');

    const selectedTemplates: ChallengeTemplate[] = [];

    if (easyTemplates.length > 0) {
      selectedTemplates.push(easyTemplates[Math.floor(Math.random() * easyTemplates.length)]);
    }
    if (mediumTemplates.length > 0) {
      selectedTemplates.push(mediumTemplates[Math.floor(Math.random() * mediumTemplates.length)]);
    }
    if (hardTemplates.length > 0) {
      selectedTemplates.push(hardTemplates[Math.floor(Math.random() * hardTemplates.length)]);
    }

    // Calculate expiration (end of day)
    const expiresAt = new Date(today);
    expiresAt.setHours(23, 59, 59, 999);

    // Create daily challenges
    for (const template of selectedTemplates) {
      await pool.execute(
        `INSERT INTO daily_challenges
         (user_id, template_id, challenge_date, status, current_progress, target_value, xp_reward, expires_at)
         VALUES (?, ?, ?, 'pending', 0, ?, ?, ?)`,
        [userId, template.id, todayStr, template.targetValue, template.xpReward, expiresAt]
      );
    }

    return this.getTodaysChallenges(userId);
  }

  /**
   * Get today's challenges for a user
   */
  async getTodaysChallenges(userId: number): Promise<DailyChallenge[]> {
    const todayStr = this.getLocalDateString();

    // Expire old challenges before loading today's
    await this.expireOldChallenges();

    // Generate if not exists
    const [existing] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM daily_challenges
       WHERE user_id = ? AND challenge_date = ?`,
      [userId, todayStr]
    );

    if (Number(existing[0].count) === 0) {
      await this.generateDailyChallenges(userId);
    }

    const [rows] = await pool.execute<DailyChallengeRow[]>(
      `SELECT dc.*, ct.challenge_type, ct.name, ct.description, ct.difficulty, ct.day_of_week, ct.is_active
       FROM daily_challenges dc
       JOIN challenge_templates ct ON dc.template_id = ct.id
       WHERE dc.user_id = ? AND dc.challenge_date = ?
       ORDER BY
         FIELD(ct.difficulty, 'easy', 'medium', 'hard'),
         dc.id`,
      [userId, todayStr]
    );

    return rows.map(row => this.mapToChallenge(row));
  }

  /**
   * Get challenge history
   */
  async getChallengeHistory(
    userId: number,
    days: number = 7
  ): Promise<DailyChallenge[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = this.getLocalDateString(startDate);

    const [rows] = await pool.execute<DailyChallengeRow[]>(
      `SELECT dc.*, ct.challenge_type, ct.name, ct.description, ct.difficulty, ct.day_of_week, ct.is_active
       FROM daily_challenges dc
       JOIN challenge_templates ct ON dc.template_id = ct.id
       WHERE dc.user_id = ? AND dc.challenge_date >= ?
       ORDER BY dc.challenge_date DESC, dc.id`,
      [userId, startDateStr]
    );

    return rows.map(row => this.mapToChallenge(row));
  }

  /**
   * Update challenge progress
   */
  async updateProgress(
    userId: number,
    challengeType: ChallengeType,
    progressDelta: number = 1
  ): Promise<ChallengeProgress[]> {
    const todayStr = this.getLocalDateString();
    const results: ChallengeProgress[] = [];

    console.log(`[Challenge] updateProgress called: userId=${userId}, type=${challengeType}, delta=${progressDelta}, date=${todayStr}`);

    // Get matching challenges for today that aren't completed
    const [challenges] = await pool.execute<DailyChallengeRow[]>(
      `SELECT dc.*, ct.challenge_type
       FROM daily_challenges dc
       JOIN challenge_templates ct ON dc.template_id = ct.id
       WHERE dc.user_id = ?
         AND dc.challenge_date = ?
         AND dc.status != 'completed'
         AND dc.status != 'expired'
         AND ct.challenge_type = ?`,
      [userId, todayStr, challengeType]
    );

    console.log(`[Challenge] Found ${challenges.length} matching challenges for type=${challengeType}`);

    for (const challenge of challenges) {
      const newProgress = Math.min(
        challenge.current_progress + progressDelta,
        challenge.target_value
      );
      const isCompleted = newProgress >= challenge.target_value;

      // Update progress
      if (isCompleted) {
        await pool.execute(
          `UPDATE daily_challenges
           SET current_progress = ?, status = 'completed', completed_at = NOW()
           WHERE id = ?`,
          [newProgress, challenge.id]
        );

        // Award XP
        await gamificationService.awardXP(
          userId,
          challenge.xp_reward,
          'challenge',
          challenge.id,
          `Challenge: ${challenge.name || 'Daily Challenge'}`
        );

        // Update leaderboard
        await gamificationService.updateLeaderboard(userId, { xp: challenge.xp_reward });

        // Create notification
        await gamificationService.createNotification(userId, {
          notificationType: 'challenge',
          title: 'Challenge Completed!',
          message: `You completed "${challenge.name || 'Daily Challenge'}" and earned ${challenge.xp_reward} XP!`,
          icon: 'fa-flag-checkered',
          metadata: { challengeId: challenge.id, xpReward: challenge.xp_reward },
        });

        results.push({
          challengeId: challenge.id,
          progressDelta,
          newProgress,
          isCompleted: true,
          xpAwarded: challenge.xp_reward,
        });
      } else {
        // Update in progress
        await pool.execute(
          `UPDATE daily_challenges
           SET current_progress = ?, status = 'in_progress'
           WHERE id = ?`,
          [newProgress, challenge.id]
        );

        results.push({
          challengeId: challenge.id,
          progressDelta,
          newProgress,
          isCompleted: false,
        });
      }
    }

    return results;
  }

  /**
   * Check and update progress for an action
   */
  async checkProgress(
    userId: number,
    action: 'exercise_complete' | 'review_complete' | 'quiz_complete' | 'vocabulary_learned' | 'spelling_correct' | 'translation_complete' | 'perfect_quiz' | 'speed_quiz',
    context?: { isCorrect?: boolean; isPerfect?: boolean; timeSeconds?: number }
  ): Promise<ChallengeProgress[]> {
    const allProgress: ChallengeProgress[] = [];

    switch (action) {
      case 'exercise_complete':
        const exerciseProgress = await this.updateProgress(userId, 'exercise');
        allProgress.push(...exerciseProgress);
        break;

      case 'review_complete':
        const reviewProgress = await this.updateProgress(userId, 'review');
        allProgress.push(...reviewProgress);
        break;

      case 'vocabulary_learned':
        const vocabProgress = await this.updateProgress(userId, 'vocabulary');
        allProgress.push(...vocabProgress);
        break;

      case 'spelling_correct':
        if (context?.isCorrect) {
          const spellingProgress = await this.updateProgress(userId, 'spelling');
          allProgress.push(...spellingProgress);
        }
        break;

      case 'translation_complete':
        const translationProgress = await this.updateProgress(userId, 'translation');
        allProgress.push(...translationProgress);
        break;

      case 'perfect_quiz':
        if (context?.isPerfect) {
          const perfectProgress = await this.updateProgress(userId, 'perfect_score');
          allProgress.push(...perfectProgress);
        }
        break;

      case 'speed_quiz':
        // Speed quiz: complete in under 2 minutes (120 seconds)
        if (context?.timeSeconds && context.timeSeconds < 120) {
          const speedProgress = await this.updateProgress(userId, 'speed_quiz');
          allProgress.push(...speedProgress);
        }
        break;

      case 'quiz_complete':
        // Check multiple challenge types
        if (context?.isPerfect) {
          const perfectProgress = await this.updateProgress(userId, 'perfect_score');
          allProgress.push(...perfectProgress);
        }
        if (context?.timeSeconds && context.timeSeconds < 120) {
          const speedProgress = await this.updateProgress(userId, 'speed_quiz');
          allProgress.push(...speedProgress);
        }
        break;
    }

    // Also update streak challenge if user has reviewed today
    if (action === 'review_complete' || action === 'exercise_complete') {
      const streakProgress = await this.updateProgress(userId, 'streak');
      allProgress.push(...streakProgress);
    }

    return allProgress;
  }

  /**
   * Expire old challenges
   */
  async expireOldChallenges(): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE daily_challenges
       SET status = 'expired'
       WHERE status IN ('pending', 'in_progress')
         AND expires_at < NOW()`
    );

    return result.affectedRows;
  }

  /**
   * Get challenge statistics
   */
  async getChallengeStats(userId: number): Promise<{
    totalCompleted: number;
    currentStreak: number;
    totalXpEarned: number;
    completionRate: number;
  }> {
    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'completed' THEN xp_reward ELSE 0 END) as xp_earned,
         COUNT(*) as total
       FROM daily_challenges
       WHERE user_id = ?`,
      [userId]
    );

    // Calculate streak (consecutive days with at least one completed challenge)
    const [streakData] = await pool.execute<RowDataPacket[]>(
      `SELECT challenge_date
       FROM daily_challenges
       WHERE user_id = ? AND status = 'completed'
       GROUP BY challenge_date
       ORDER BY challenge_date DESC`,
      [userId]
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const row of streakData) {
      const challengeDate = new Date(row.challenge_date);
      challengeDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);

      if (challengeDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (streak === 0 && challengeDate.getTime() === today.getTime() - 86400000) {
        // Allow yesterday if no completion today
        streak = 1;
      } else {
        break;
      }
    }

    const completed = Number(stats[0].completed) || 0;
    const total = Number(stats[0].total) || 0;
    const xpEarned = Number(stats[0].xp_earned) || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalCompleted: completed,
      currentStreak: streak,
      totalXpEarned: xpEarned,
      completionRate,
    };
  }

  // --------------------------------------------------------
  // Helpers
  // --------------------------------------------------------

  private mapToChallenge(row: DailyChallengeRow): DailyChallenge {
    return {
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      template: {
        id: row.template_id,
        challengeType: row.challenge_type || 'exercise',
        name: row.name || '',
        description: row.description || '',
        targetValue: row.target_value,
        xpReward: row.xp_reward,
        difficulty: row.difficulty || 'easy',
        dayOfWeek: row.day_of_week || null,
        isActive: row.is_active || true,
      },
      challengeDate: row.challenge_date,
      status: row.status,
      currentProgress: row.current_progress,
      targetValue: row.target_value,
      xpReward: row.xp_reward,
      completedAt: row.completed_at || undefined,
      expiresAt: row.expires_at,
    };
  }
}

export const challengeService = new ChallengeService();
