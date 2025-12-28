// Gamification Types
// Achievements, XP/Levels, Daily Challenges, Leaderboards, Adaptive Difficulty

// ============================================================
// Achievement System
// ============================================================

export type AchievementCategory = 'learning' | 'streak' | 'quiz' | 'speed' | 'milestone';

export interface Achievement {
  id: number;
  achievementCode: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;              // FontAwesome icon class
  xpReward: number;
  sortOrder: number;
  isHidden: boolean;         // Hidden until unlocked
}

export interface UserAchievement {
  id: number;
  userId: number;
  achievementId: number;
  achievement: Achievement;
  unlockedAt: Date | null;   // null = not yet unlocked
  progressValue: number;     // Current progress
  progressTarget: number;    // Target to unlock
  isUnlocked: boolean;       // Computed: progressValue >= progressTarget
  notified: boolean;         // User has been notified
}

export interface AchievementUnlock {
  achievement: Achievement;
  xpAwarded: number;
  unlockedAt: Date;
}

// ============================================================
// XP & Level System
// ============================================================

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
  xpToNextLevel: number;     // XP needed to reach next level
  progressPercentage: number; // Computed: progress toward next level
}

export type XPSource = 'exercise' | 'quiz' | 'review' | 'streak' | 'achievement' | 'challenge' | 'bonus';

export interface XPTransaction {
  id: number;
  userId: number;
  xpAmount: number;
  source: XPSource;
  sourceId?: number;         // Related entity ID
  description?: string;
  createdAt: Date;
}

export interface LevelUpEvent {
  previousLevel: number;
  newLevel: number;
  newTitle: string;
  xpAtLevelUp: number;
}

// ============================================================
// Daily Challenges
// ============================================================

export type ChallengeType =
  | 'spelling'
  | 'speed_quiz'
  | 'translation'
  | 'streak'
  | 'vocabulary'
  | 'perfect_score'
  | 'review'
  | 'exercise';

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
  dayOfWeek: number | null;  // null = any day, 0-6 = specific day
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
  progressDelta: number;     // Amount to add to current progress
}

// ============================================================
// Leaderboard
// ============================================================

export interface WeeklyLeaderboardEntry {
  id: number;
  userId: number;
  username: string;
  displayName?: string;
  weekStart: Date;
  totalXp: number;
  exercisesCompleted: number;
  reviewsCompleted: number;
  quizzesCompleted: number;
  rankPosition: number;
  isCurrentUser: boolean;    // Computed for display
}

export interface LeaderboardSummary {
  weekStart: Date;
  weekEnd: Date;
  entries: WeeklyLeaderboardEntry[];
  currentUserRank?: number;
  totalParticipants: number;
}

// ============================================================
// Adaptive Difficulty
// ============================================================

import { DifficultyLevel } from './conversation';

export interface UserDifficultyProfile {
  id: number;
  userId: number;
  currentDifficulty: DifficultyLevel;
  performanceScore: number;  // 0-100 rolling accuracy
  exercisesAtLevel: number;  // Exercises completed at current level
  autoAdjustEnabled: boolean;
  lastAdjustmentAt?: Date;
}

export interface DifficultyAdjustment {
  previousDifficulty: DifficultyLevel;
  newDifficulty: DifficultyLevel;
  reason: string;
  performanceScore: number;
}

// ============================================================
// Notifications
// ============================================================

export type NotificationType = 'achievement' | 'level_up' | 'challenge' | 'streak' | 'leaderboard';

export interface Notification {
  id: number;
  userId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationBadge {
  unreadCount: number;
  hasNewAchievements: boolean;
  hasNewChallenges: boolean;
}

// ============================================================
// Gamification Summary (Dashboard)
// ============================================================

export interface GamificationSummary {
  xp: UserXP;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastReviewDate?: Date;
  };
  todaysChallenges: DailyChallenge[];
  recentAchievements: UserAchievement[];
  leaderboardRank?: number;
  notifications: NotificationBadge;
}

// ============================================================
// XP Calculation Constants
// ============================================================

export const XP_REWARDS = {
  // Exercise rewards
  EXERCISE_CORRECT: 5,
  EXERCISE_INCORRECT: 1,
  EXERCISE_ADVANCED_BONUS: 2,
  EXERCISE_FIRST_ATTEMPT_BONUS: 3,

  // Review rewards
  REVIEW_GOOD: 3,
  REVIEW_EASY: 4,
  REVIEW_OVERDUE_BONUS: 1,

  // Quiz rewards
  QUIZ_BASE: 10,
  QUIZ_PERFECT_BONUS: 25,

  // Streak rewards
  STREAK_DAILY: 10,
  STREAK_30_DAY_MULTIPLIER: 1.5,

  // Challenge completion varies by template
} as const;
