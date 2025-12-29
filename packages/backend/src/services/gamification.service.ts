import pool from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================================
// Types
// ============================================================

export type AchievementCategory = 'learning' | 'streak' | 'quiz' | 'speed' | 'milestone';
export type XPSource = 'exercise' | 'quiz' | 'review' | 'streak' | 'achievement' | 'challenge' | 'bonus';
export type NotificationType = 'achievement' | 'level_up' | 'challenge' | 'streak' | 'leaderboard';

export interface Achievement {
  id: number;
  achievementCode: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  xpReward: number;
  sortOrder: number;
  isHidden: boolean;
}

export interface UserAchievement {
  id: number;
  achievementId: number;
  achievement: Achievement;
  unlockedAt: Date | null;
  progressValue: number;
  progressTarget: number;
  isUnlocked: boolean;
  notified: boolean;
}

export interface AchievementUnlock {
  achievement: Achievement;
  xpAwarded: number;
  unlockedAt: Date;
}

export interface LevelDefinition {
  level: number;
  title: string;
  xpRequired: number;
  badgeColor: string;
}

export interface UserXP {
  id: number;
  userId: number;
  totalXp: number;
  currentLevel: number;
  title: string;
  xpToNextLevel: number;
  progressPercentage: number;
}

export interface XPTransaction {
  id: number;
  xpAmount: number;
  source: XPSource;
  sourceId?: number;
  description?: string;
  createdAt: Date;
}

export interface LevelUpEvent {
  previousLevel: number;
  newLevel: number;
  newTitle: string;
  xpAtLevelUp: number;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  displayName?: string;
  nickname?: string;
  avatar?: string;
  weekStart: Date;
  totalXp: number;
  exercisesCompleted: number;
  reviewsCompleted: number;
  quizzesCompleted: number;
  rankPosition: number;
  isCurrentUser: boolean;
}

export interface LeaderboardSummary {
  weekStart: Date;
  weekEnd: Date;
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  totalParticipants: number;
}

export interface Notification {
  id: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationBadge {
  unreadCount: number;
  hasNewAchievements: boolean;
  hasNewChallenges: boolean;
}

export interface GamificationSummary {
  xp: UserXP;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastReviewDate?: Date;
  };
  todaysChallenges: any[];
  recentAchievements: UserAchievement[];
  leaderboardRank?: number;
  notifications: NotificationBadge;
}

// ============================================================
// XP Reward Constants
// ============================================================

export const XP_REWARDS = {
  EXERCISE_CORRECT: 5,
  EXERCISE_INCORRECT: 1,
  EXERCISE_ADVANCED_BONUS: 2,
  EXERCISE_FIRST_ATTEMPT_BONUS: 3,
  REVIEW_GOOD: 3,
  REVIEW_EASY: 4,
  REVIEW_OVERDUE_BONUS: 1,
  QUIZ_BASE: 10,
  QUIZ_PERFECT_BONUS: 25,
  STREAK_DAILY: 10,
  STREAK_30_DAY_MULTIPLIER: 1.5,
} as const;

// ============================================================
// Row Interfaces
// ============================================================

interface AchievementRow extends RowDataPacket {
  id: number;
  achievement_code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  xp_reward: number;
  sort_order: number;
  is_hidden: boolean;
}

interface UserAchievementRow extends RowDataPacket {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: Date | null;
  progress_value: number;
  progress_target: number;
  notified: boolean;
  // Joined achievement fields
  achievement_code?: string;
  name?: string;
  description?: string;
  category?: AchievementCategory;
  icon?: string;
  xp_reward?: number;
  sort_order?: number;
  is_hidden?: boolean;
}

interface UserXPRow extends RowDataPacket {
  id: number;
  user_id: number;
  total_xp: number;
  current_level: number;
  title: string;
}

interface LevelDefinitionRow extends RowDataPacket {
  level: number;
  title: string;
  xp_required: number;
  badge_color: string;
}

interface XPTransactionRow extends RowDataPacket {
  id: number;
  user_id: number;
  xp_amount: number;
  source: XPSource;
  source_id: number | null;
  description: string | null;
  created_at: Date;
}

interface LeaderboardRow extends RowDataPacket {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  nickname: string | null;
  avatar: string | null;
  week_start: Date;
  total_xp: number;
  exercises_completed: number;
  reviews_completed: number;
  quizzes_completed: number;
  rank_position: number | null;
}

interface NotificationRow extends RowDataPacket {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  icon: string | null;
  action_url: string | null;
  metadata: string | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
  expires_at: Date | null;
}

interface CountRow extends RowDataPacket {
  count: number;
}

// ============================================================
// Service Class
// ============================================================

export class GamificationService {
  // --------------------------------------------------------
  // XP Management
  // --------------------------------------------------------

  /**
   * Get user's XP and level info
   */
  async getUserXP(userId: number): Promise<UserXP> {
    const [rows] = await pool.execute<UserXPRow[]>(
      `SELECT * FROM user_xp WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // Create default XP record
      await pool.execute(
        `INSERT INTO user_xp (user_id, total_xp, current_level, title)
         VALUES (?, 0, 1, 'Beginner')`,
        [userId]
      );
      return this.getUserXP(userId);
    }

    const row = rows[0];
    const levels = await this.getLevelDefinitions();
    const { xpToNextLevel, progressPercentage } = this.calculateProgress(row.total_xp, row.current_level, levels);

    return {
      id: row.id,
      userId: row.user_id,
      totalXp: row.total_xp,
      currentLevel: row.current_level,
      title: row.title,
      xpToNextLevel,
      progressPercentage,
    };
  }

  /**
   * Award XP to a user
   */
  async awardXP(
    userId: number,
    amount: number,
    source: XPSource,
    sourceId?: number,
    description?: string
  ): Promise<{ newTotal: number; levelUp?: LevelUpEvent }> {
    // Ensure user has XP record
    await this.getUserXP(userId);

    // Record transaction
    await pool.execute(
      `INSERT INTO xp_transactions (user_id, xp_amount, source, source_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, amount, source, sourceId || null, description || null]
    );

    // Update total XP
    await pool.execute(
      `UPDATE user_xp SET total_xp = total_xp + ? WHERE user_id = ?`,
      [amount, userId]
    );

    // Check for level up
    const [rows] = await pool.execute<UserXPRow[]>(
      `SELECT * FROM user_xp WHERE user_id = ?`,
      [userId]
    );

    const currentXP = rows[0];
    const levels = await this.getLevelDefinitions();
    const newLevel = this.calculateLevel(currentXP.total_xp, levels);

    let levelUp: LevelUpEvent | undefined;

    if (newLevel > currentXP.current_level) {
      const newLevelDef = levels.find(l => l.level === newLevel);
      const newTitle = newLevelDef?.title || `Level ${newLevel}`;

      // Update level
      await pool.execute(
        `UPDATE user_xp SET current_level = ?, title = ? WHERE user_id = ?`,
        [newLevel, newTitle, userId]
      );

      levelUp = {
        previousLevel: currentXP.current_level,
        newLevel,
        newTitle,
        xpAtLevelUp: currentXP.total_xp,
      };

      // Create level up notification
      await this.createNotification(userId, {
        notificationType: 'level_up',
        title: `Level Up! ${newTitle}`,
        message: `Congratulations! You've reached level ${newLevel}!`,
        icon: 'fa-arrow-up',
        metadata: { level: newLevel, title: newTitle },
      });

      // Update leaderboard
      await this.updateLeaderboard(userId, { xp: amount });
    }

    return { newTotal: currentXP.total_xp, levelUp };
  }

  /**
   * Get XP transaction history
   */
  async getXPHistory(
    userId: number,
    limit: number = 20
  ): Promise<XPTransaction[]> {
    const [rows] = await pool.query<XPTransactionRow[]>(
      `SELECT * FROM xp_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ${Number(limit)}`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      xpAmount: row.xp_amount,
      source: row.source,
      sourceId: row.source_id || undefined,
      description: row.description || undefined,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get level definitions from database
   */
  async getLevelDefinitions(): Promise<LevelDefinition[]> {
    const [rows] = await pool.execute<LevelDefinitionRow[]>(
      `SELECT * FROM level_definitions ORDER BY level ASC`
    );

    if (rows.length === 0) {
      // Insert default levels
      await this.seedLevelDefinitions();
      return this.getLevelDefinitions();
    }

    return rows.map(row => ({
      level: row.level,
      title: row.title,
      xpRequired: row.xp_required,
      badgeColor: row.badge_color,
    }));
  }

  /**
   * Seed default level definitions
   */
  private async seedLevelDefinitions(): Promise<void> {
    const levels = [
      { level: 1, title: 'Beginner', xpRequired: 0, badgeColor: '#9E9E9E' },
      { level: 2, title: 'Novice', xpRequired: 100, badgeColor: '#8BC34A' },
      { level: 3, title: 'Learner', xpRequired: 300, badgeColor: '#4CAF50' },
      { level: 4, title: 'Student', xpRequired: 600, badgeColor: '#00BCD4' },
      { level: 5, title: 'Apprentice', xpRequired: 1000, badgeColor: '#2196F3' },
      { level: 6, title: 'Practitioner', xpRequired: 1500, badgeColor: '#3F51B5' },
      { level: 7, title: 'Adept', xpRequired: 2200, badgeColor: '#9C27B0' },
      { level: 8, title: 'Expert', xpRequired: 3000, badgeColor: '#E91E63' },
      { level: 9, title: 'Master', xpRequired: 4000, badgeColor: '#FF9800' },
      { level: 10, title: 'Grandmaster', xpRequired: 5500, badgeColor: '#FFD700' },
    ];

    for (const level of levels) {
      await pool.execute(
        `INSERT IGNORE INTO level_definitions (level, title, xp_required, badge_color)
         VALUES (?, ?, ?, ?)`,
        [level.level, level.title, level.xpRequired, level.badgeColor]
      );
    }
  }

  /**
   * Calculate level from XP
   */
  private calculateLevel(totalXp: number, levels: LevelDefinition[]): number {
    let currentLevel = 1;
    for (const level of levels) {
      if (totalXp >= level.xpRequired) {
        currentLevel = level.level;
      } else {
        break;
      }
    }
    return currentLevel;
  }

  /**
   * Calculate progress to next level
   */
  private calculateProgress(
    totalXp: number,
    currentLevel: number,
    levels: LevelDefinition[]
  ): { xpToNextLevel: number; progressPercentage: number } {
    const currentLevelDef = levels.find(l => l.level === currentLevel);
    const nextLevelDef = levels.find(l => l.level === currentLevel + 1);

    if (!nextLevelDef) {
      // Max level reached
      return { xpToNextLevel: 0, progressPercentage: 100 };
    }

    const currentLevelXp = currentLevelDef?.xpRequired || 0;
    const nextLevelXp = nextLevelDef.xpRequired;
    const xpInCurrentLevel = totalXp - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;

    return {
      xpToNextLevel: nextLevelXp - totalXp,
      progressPercentage: Math.round((xpInCurrentLevel / xpNeededForLevel) * 100),
    };
  }

  // --------------------------------------------------------
  // Achievements
  // --------------------------------------------------------

  /**
   * Get all achievements with user progress
   */
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    // Ensure user has achievement records
    await this.initUserAchievements(userId);

    const [rows] = await pool.execute<UserAchievementRow[]>(
      `SELECT ua.*, a.achievement_code, a.name, a.description, a.category,
              a.icon, a.xp_reward, a.sort_order, a.is_hidden
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ?
       ORDER BY
         ua.unlocked_at IS NOT NULL DESC,
         a.sort_order ASC`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      achievementId: row.achievement_id,
      achievement: {
        id: row.achievement_id,
        achievementCode: row.achievement_code || '',
        name: row.name || '',
        description: row.description || '',
        category: row.category || 'learning',
        icon: row.icon || '',
        xpReward: row.xp_reward || 0,
        sortOrder: row.sort_order || 0,
        isHidden: row.is_hidden || false,
      },
      unlockedAt: row.unlocked_at,
      progressValue: row.progress_value,
      progressTarget: row.progress_target,
      isUnlocked: row.unlocked_at !== null,
      notified: row.notified,
    }));
  }

  /**
   * Mark an achievement as notified (user has seen the unlock notification)
   */
  async markAchievementNotified(userId: number, achievementId: number): Promise<void> {
    await pool.execute(
      `UPDATE user_achievements SET notified = TRUE WHERE user_id = ? AND achievement_id = ?`,
      [userId, achievementId]
    );
  }

  /**
   * Initialize user achievement records
   */
  private async initUserAchievements(userId: number): Promise<void> {
    // Check if already initialized
    const [existing] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?`,
      [userId]
    );

    if (Number(existing[0].count) > 0) {
      return;
    }

    // Get all achievements and create user records
    const [achievements] = await pool.execute<AchievementRow[]>(
      `SELECT * FROM achievements`
    );

    if (achievements.length === 0) {
      // Seed achievements first
      await this.seedAchievements();
      return this.initUserAchievements(userId);
    }

    for (const achievement of achievements) {
      await pool.execute(
        `INSERT IGNORE INTO user_achievements
         (user_id, achievement_id, progress_value, progress_target)
         VALUES (?, ?, 0, ?)`,
        [userId, achievement.id, this.getAchievementTarget(achievement.achievement_code)]
      );
    }
  }

  /**
   * Update achievement progress
   */
  async updateAchievementProgress(
    userId: number,
    achievementCode: string,
    progressDelta: number = 1
  ): Promise<AchievementUnlock | null> {
    // Get achievement
    const [achievements] = await pool.execute<AchievementRow[]>(
      `SELECT * FROM achievements WHERE achievement_code = ?`,
      [achievementCode]
    );

    if (achievements.length === 0) {
      return null;
    }

    const achievement = achievements[0];

    // Update progress
    await pool.execute(
      `UPDATE user_achievements
       SET progress_value = progress_value + ?
       WHERE user_id = ? AND achievement_id = ? AND unlocked_at IS NULL`,
      [progressDelta, userId, achievement.id]
    );

    // Check if unlocked
    const [userAchievements] = await pool.execute<UserAchievementRow[]>(
      `SELECT * FROM user_achievements
       WHERE user_id = ? AND achievement_id = ?`,
      [userId, achievement.id]
    );

    if (userAchievements.length === 0) {
      return null;
    }

    const userAchievement = userAchievements[0];

    if (userAchievement.unlocked_at === null &&
        userAchievement.progress_value >= userAchievement.progress_target) {
      // Unlock achievement
      const now = new Date();
      await pool.execute(
        `UPDATE user_achievements SET unlocked_at = ? WHERE id = ?`,
        [now, userAchievement.id]
      );

      // Award XP
      if (achievement.xp_reward > 0) {
        await this.awardXP(userId, achievement.xp_reward, 'achievement', achievement.id, `Achievement: ${achievement.name}`);
      }

      // Create notification
      await this.createNotification(userId, {
        notificationType: 'achievement',
        title: `Achievement Unlocked!`,
        message: achievement.name,
        icon: achievement.icon,
        metadata: { achievementId: achievement.id, achievementCode: achievement.achievement_code },
      });

      return {
        achievement: {
          id: achievement.id,
          achievementCode: achievement.achievement_code,
          name: achievement.name,
          description: achievement.description,
          category: achievement.category,
          icon: achievement.icon,
          xpReward: achievement.xp_reward,
          sortOrder: achievement.sort_order,
          isHidden: achievement.is_hidden,
        },
        xpAwarded: achievement.xp_reward,
        unlockedAt: now,
      };
    }

    return null;
  }

  /**
   * Check and update multiple achievement types based on action
   */
  async checkAchievements(
    userId: number,
    action: 'exercise_complete' | 'review_complete' | 'quiz_complete' | 'streak_update' | 'vocabulary_learned',
    context?: { isCorrect?: boolean; isPerfect?: boolean; streakDays?: number; vocabularyCount?: number }
  ): Promise<AchievementUnlock[]> {
    const unlocks: AchievementUnlock[] = [];

    switch (action) {
      case 'exercise_complete':
        // Check exercise-related achievements
        const exerciseUnlock = await this.updateAchievementProgress(userId, 'FIRST_EXERCISE');
        if (exerciseUnlock) unlocks.push(exerciseUnlock);

        if (context?.isCorrect) {
          const correctUnlock = await this.updateAchievementProgress(userId, 'EXERCISES_10');
          if (correctUnlock) unlocks.push(correctUnlock);
        }
        break;

      case 'vocabulary_learned':
        const vocab100 = await this.updateAchievementProgress(userId, 'VOCAB_100');
        if (vocab100) unlocks.push(vocab100);
        const vocab500 = await this.updateAchievementProgress(userId, 'VOCAB_500');
        if (vocab500) unlocks.push(vocab500);
        break;

      case 'streak_update':
        if (context?.streakDays) {
          if (context.streakDays >= 7) {
            const streak7 = await this.updateAchievementProgress(userId, 'STREAK_7', context.streakDays);
            if (streak7) unlocks.push(streak7);
          }
          if (context.streakDays >= 30) {
            const streak30 = await this.updateAchievementProgress(userId, 'STREAK_30', context.streakDays);
            if (streak30) unlocks.push(streak30);
          }
        }
        break;

      case 'quiz_complete':
        if (context?.isPerfect) {
          const perfectQuiz = await this.updateAchievementProgress(userId, 'PERFECT_QUIZ');
          if (perfectQuiz) unlocks.push(perfectQuiz);
        }
        break;
    }

    return unlocks;
  }

  /**
   * Get achievement target based on code
   */
  private getAchievementTarget(code: string): number {
    const targets: Record<string, number> = {
      'FIRST_EXERCISE': 1,
      'FIRST_STEPS': 1,
      'EXERCISES_10': 10,
      'EXERCISES_50': 50,
      'EXERCISES_100': 100,
      'VOCAB_100': 100,
      'VOCAB_500': 500,
      'VOCAB_1000': 1000,
      'STREAK_7': 7,
      'STREAK_30': 30,
      'STREAK_100': 100,
      'PERFECT_QUIZ': 1,
      'PERFECT_STREAK_5': 5,
      'SPEED_DEMON': 1,
      'NIGHT_OWL': 1,
      'EARLY_BIRD': 1,
    };
    return targets[code] || 1;
  }

  /**
   * Seed default achievements
   */
  private async seedAchievements(): Promise<void> {
    const achievements = [
      { code: 'FIRST_STEPS', name: 'First Steps', description: 'Complete your first exercise', category: 'learning', icon: 'fa-shoe-prints', xpReward: 10, sortOrder: 1, isHidden: false },
      { code: 'EXERCISES_10', name: 'Getting Started', description: 'Complete 10 exercises correctly', category: 'learning', icon: 'fa-tasks', xpReward: 25, sortOrder: 2, isHidden: false },
      { code: 'EXERCISES_50', name: 'Dedicated Learner', description: 'Complete 50 exercises correctly', category: 'learning', icon: 'fa-book-reader', xpReward: 50, sortOrder: 3, isHidden: false },
      { code: 'EXERCISES_100', name: 'Exercise Master', description: 'Complete 100 exercises correctly', category: 'milestone', icon: 'fa-medal', xpReward: 100, sortOrder: 4, isHidden: false },
      { code: 'VOCAB_100', name: 'Word Collector', description: 'Learn 100 vocabulary words', category: 'milestone', icon: 'fa-book', xpReward: 100, sortOrder: 10, isHidden: false },
      { code: 'VOCAB_500', name: 'Vocabulary Builder', description: 'Learn 500 vocabulary words', category: 'milestone', icon: 'fa-books', xpReward: 250, sortOrder: 11, isHidden: false },
      { code: 'VOCAB_1000', name: 'Word Master', description: 'Learn 1000 vocabulary words', category: 'milestone', icon: 'fa-crown', xpReward: 500, sortOrder: 12, isHidden: true },
      { code: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day learning streak', category: 'streak', icon: 'fa-fire', xpReward: 70, sortOrder: 20, isHidden: false },
      { code: 'STREAK_30', name: 'Monthly Champion', description: 'Maintain a 30-day learning streak', category: 'streak', icon: 'fa-fire-alt', xpReward: 300, sortOrder: 21, isHidden: false },
      { code: 'STREAK_100', name: 'Unstoppable', description: 'Maintain a 100-day learning streak', category: 'streak', icon: 'fa-meteor', xpReward: 1000, sortOrder: 22, isHidden: true },
      { code: 'PERFECT_QUIZ', name: 'Perfect Score', description: 'Get 100% on a quiz', category: 'quiz', icon: 'fa-star', xpReward: 50, sortOrder: 30, isHidden: false },
      { code: 'PERFECT_STREAK_5', name: 'Perfectionist', description: 'Get 5 perfect quizzes in a row', category: 'quiz', icon: 'fa-trophy', xpReward: 150, sortOrder: 31, isHidden: false },
      { code: 'SPEED_DEMON', name: 'Speed Demon', description: 'Complete a quiz in under 2 minutes with 80%+ accuracy', category: 'speed', icon: 'fa-bolt', xpReward: 75, sortOrder: 40, isHidden: false },
    ];

    for (const a of achievements) {
      await pool.execute(
        `INSERT IGNORE INTO achievements
         (achievement_code, name, description, category, icon, xp_reward, sort_order, is_hidden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.code, a.name, a.description, a.category, a.icon, a.xpReward, a.sortOrder, a.isHidden]
      );
    }
  }

  // --------------------------------------------------------
  // Leaderboard
  // --------------------------------------------------------

  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(
    userId: number,
    limit: number = 10
  ): Promise<LeaderboardSummary> {
    const weekStart = this.getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get top entries
    const [rows] = await pool.query<LeaderboardRow[]>(
      `SELECT wl.*, u.username, u.display_name, u.nickname, u.avatar
       FROM weekly_leaderboards wl
       JOIN users u ON wl.user_id = u.id
       WHERE wl.week_start = ?
       ORDER BY wl.total_xp DESC
       LIMIT ${Number(limit)}`,
      [weekStartStr]
    );

    // Assign ranks
    const entries: LeaderboardEntry[] = rows.map((row, index) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name || undefined,
      nickname: row.nickname || undefined,
      avatar: row.avatar || undefined,
      weekStart: row.week_start,
      totalXp: row.total_xp,
      exercisesCompleted: row.exercises_completed,
      reviewsCompleted: row.reviews_completed,
      quizzesCompleted: row.quizzes_completed,
      rankPosition: index + 1,
      isCurrentUser: row.user_id === userId,
    }));

    // Get current user's rank if not in top
    let currentUserRank: number | undefined;
    const userEntry = entries.find(e => e.isCurrentUser);
    if (userEntry) {
      currentUserRank = userEntry.rankPosition;
    } else {
      const [userRankRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) + 1 as rank_position
         FROM weekly_leaderboards
         WHERE week_start = ? AND total_xp > (
           SELECT COALESCE(total_xp, 0) FROM weekly_leaderboards WHERE user_id = ? AND week_start = ?
         )`,
        [weekStartStr, userId, weekStartStr]
      );
      currentUserRank = Number(userRankRows[0]?.rank_position) || undefined;
    }

    // Get total participants
    const [countResult] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) as count FROM weekly_leaderboards WHERE week_start = ?`,
      [weekStartStr]
    );

    return {
      weekStart,
      weekEnd,
      entries,
      currentUserRank,
      totalParticipants: Number(countResult[0].count) || 0,
    };
  }

  /**
   * Update leaderboard entry
   */
  async updateLeaderboard(
    userId: number,
    activity: { xp?: number; exercises?: number; reviews?: number; quizzes?: number }
  ): Promise<void> {
    const weekStart = this.getWeekStart().toISOString().split('T')[0];

    // Ensure entry exists
    await pool.execute(
      `INSERT IGNORE INTO weekly_leaderboards (user_id, week_start)
       VALUES (?, ?)`,
      [userId, weekStart]
    );

    // Build update
    const updates: string[] = [];
    const values: number[] = [];

    if (activity.xp) {
      updates.push('total_xp = total_xp + ?');
      values.push(activity.xp);
    }
    if (activity.exercises) {
      updates.push('exercises_completed = exercises_completed + ?');
      values.push(activity.exercises);
    }
    if (activity.reviews) {
      updates.push('reviews_completed = reviews_completed + ?');
      values.push(activity.reviews);
    }
    if (activity.quizzes) {
      updates.push('quizzes_completed = quizzes_completed + ?');
      values.push(activity.quizzes);
    }

    if (updates.length > 0) {
      values.push(userId);
      await pool.execute(
        `UPDATE weekly_leaderboards SET ${updates.join(', ')} WHERE user_id = ? AND week_start = ?`,
        [...values, weekStart]
      );
    }
  }

  /**
   * Get start of current week (Monday)
   */
  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // --------------------------------------------------------
  // Notifications
  // --------------------------------------------------------

  /**
   * Create a notification
   */
  async createNotification(
    userId: number,
    notification: Omit<Notification, 'id' | 'isRead' | 'readAt' | 'createdAt'>
  ): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO notification_queue
       (user_id, notification_type, title, message, icon, action_url, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        notification.notificationType,
        notification.title,
        notification.message,
        notification.icon || null,
        notification.actionUrl || null,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
      ]
    );

    return result.insertId;
  }

  /**
   * Get user notifications
   */
  async getNotifications(
    userId: number,
    unreadOnly: boolean = false,
    limit: number = 20
  ): Promise<Notification[]> {
    const unreadCondition = unreadOnly ? 'AND is_read = FALSE' : '';

    const [rows] = await pool.query<NotificationRow[]>(
      `SELECT * FROM notification_queue
       WHERE user_id = ? ${unreadCondition}
       ORDER BY created_at DESC
       LIMIT ${Number(limit)}`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      notificationType: row.notification_type,
      title: row.title,
      message: row.message,
      icon: row.icon || undefined,
      actionUrl: row.action_url || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      isRead: row.is_read,
      readAt: row.read_at || undefined,
      createdAt: row.created_at,
    }));
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(userId: number, notificationId: number): Promise<void> {
    await pool.execute(
      `UPDATE notification_queue SET is_read = TRUE, read_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId: number): Promise<void> {
    await pool.execute(
      `UPDATE notification_queue SET is_read = TRUE, read_at = NOW()
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
  }

  /**
   * Get notification badge (counts)
   */
  async getNotificationBadge(userId: number): Promise<NotificationBadge> {
    const [result] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) as unread_count,
         SUM(CASE WHEN notification_type = 'achievement' THEN 1 ELSE 0 END) as achievement_count,
         SUM(CASE WHEN notification_type = 'challenge' THEN 1 ELSE 0 END) as challenge_count
       FROM notification_queue
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    const row = result[0];
    return {
      unreadCount: Number(row.unread_count) || 0,
      hasNewAchievements: Number(row.achievement_count) > 0,
      hasNewChallenges: Number(row.challenge_count) > 0,
    };
  }

  // --------------------------------------------------------
  // Gamification Summary
  // --------------------------------------------------------

  /**
   * Get complete gamification summary for dashboard
   */
  async getGamificationSummary(userId: number): Promise<GamificationSummary> {
    const xp = await this.getUserXP(userId);

    // Get streak from review_streaks table
    const [streakRows] = await pool.execute<RowDataPacket[]>(
      `SELECT current_streak, longest_streak, last_review_date
       FROM review_streaks WHERE user_id = ?`,
      [userId]
    );

    const streak = streakRows.length > 0
      ? {
          currentStreak: streakRows[0].current_streak,
          longestStreak: streakRows[0].longest_streak,
          lastReviewDate: streakRows[0].last_review_date || undefined,
        }
      : { currentStreak: 0, longestStreak: 0 };

    // Get recent achievements
    const achievements = await this.getUserAchievements(userId);
    const recentAchievements = achievements
      .filter(a => a.isUnlocked)
      .slice(0, 5);

    // Get leaderboard rank
    const leaderboard = await this.getWeeklyLeaderboard(userId, 1);

    // Get notification badge
    const notifications = await this.getNotificationBadge(userId);

    return {
      xp,
      streak,
      todaysChallenges: [], // Will be populated by ChallengeService
      recentAchievements,
      leaderboardRank: leaderboard.currentUserRank,
      notifications,
    };
  }
}

export const gamificationService = new GamificationService();
