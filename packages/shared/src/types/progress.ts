// ============================================================
// Progress Types for Version 3
// User progress tracking across Word Maps, Units, Lessons
// ============================================================

import { CEFRLevel } from './vocabulary';
import { ReviewStatus } from './vocabulary-v3';
import { GrammarReviewStatusV3 } from './grammar-v3';

// ============================================================
// User Map Progress
// ============================================================

export type MapProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface UserMapProgress {
  id: number;
  userId: number;
  mapId: number;

  // Progress tracking
  status: MapProgressStatus;
  currentUnitId?: number;
  currentLessonId?: number;

  // Completion stats
  unitsCompleted: number;
  lessonsCompleted: number;
  vocabularyMastered: number;
  grammarMastered: number;
  exercisesCompleted: number;

  // Progress percentage (0-100)
  completionPercentage: number;

  // Rewards earned
  totalXpEarned: number;
  totalCoinsEarned: number;

  // Time tracking
  totalStudyTimeSeconds: number;
  activatedAt: Date;
  lastActivityAt?: Date;
  completedAt?: Date;
}

export interface UserMapProgressSummary {
  mapId: number;
  mapName: string;
  cefrLevel: CEFRLevel;
  status: MapProgressStatus;
  completionPercentage: number;
  unitsCompleted: number;
  totalUnits: number;
  lastActivityAt?: Date;
}

// ============================================================
// User Unit Progress
// ============================================================

export type UnitProgressStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface UserUnitProgress {
  id: number;
  userId: number;
  unitId: number;
  mapProgressId: number;

  // Progress tracking
  status: UnitProgressStatus;
  currentLessonId?: number;

  // Completion stats
  lessonsCompleted: number;
  totalLessons: number;
  completionPercentage: number;

  // Boss exam results
  bossExamAttempts: number;
  bestBossExamScore: number;
  bossExamPassed: boolean;

  // Rewards earned
  xpEarned: number;
  coinsEarned: number;

  // Time tracking
  studyTimeSeconds: number;
  unlockedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================
// User Lesson Progress
// ============================================================

export type LessonProgressStatus = 'locked' | 'unlocked' | 'studying' | 'exam_ready' | 'completed';

export interface UserLessonProgress {
  id: number;
  userId: number;
  lessonId: number;
  unitProgressId: number;

  // Progress tracking
  status: LessonProgressStatus;
  contentProgress: number; // 0-100 percentage

  // Content completion
  vocabularyStudied: number;
  grammarStudied: number;
  exercisesCompleted: number;

  // Boss exam results
  bossExamAttempts: number;
  bestBossExamScore: number;
  bossExamPassed: boolean;

  // Rewards earned
  studyXpEarned: number;
  examXpEarned: number;
  coinsEarned: number;

  // Time tracking
  studyTimeSeconds: number;
  unlockedAt?: Date;
  startedAt?: Date;
  studyCompletedAt?: Date;
  examPassedAt?: Date;
}

// ============================================================
// Aggregated Progress Stats
// ============================================================

export interface UserProgressOverview {
  userId: number;

  // Overall stats
  totalMapsActivated: number;
  totalMapsCompleted: number;
  totalUnitsCompleted: number;
  totalLessonsCompleted: number;

  // Content mastery
  vocabularyStats: {
    total: number;
    mastered: number;
    reviewing: number;
    learning: number;
    new: number;
  };
  grammarStats: {
    total: number;
    mastered: number;
    reviewing: number;
    learning: number;
    new: number;
  };

  // Exercise performance
  exerciseStats: {
    totalAttempted: number;
    totalCorrect: number;
    accuracyRate: number;
    averageTimeSeconds: number;
  };

  // Exam performance
  examStats: {
    totalAttempts: number;
    totalPassed: number;
    averageScore: number;
    perfectScores: number;
  };

  // Rewards
  totalXpEarned: number;
  totalCoinsEarned: number;
  currentLevel: number;

  // Time tracking
  totalStudyTimeSeconds: number;
  currentStreak: number;
  longestStreak: number;

  // Active learning
  currentMap?: UserMapProgressSummary;
  dueVocabularyCount: number;
  dueGrammarCount: number;
}

// ============================================================
// Study Session Types
// ============================================================

export type StudySessionType = 'lesson' | 'review' | 'exam' | 'game' | 'free_practice';

export interface StudySession {
  id: number;
  userId: number;
  sessionType: StudySessionType;

  // Context
  mapId?: number;
  unitId?: number;
  lessonId?: number;
  gameType?: string;

  // Session data
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;

  // Activity
  vocabularyStudied: number;
  grammarStudied: number;
  exercisesCompleted: number;
  exercisesCorrect: number;

  // Rewards
  xpEarned: number;
  coinsEarned: number;
}

export interface StudySessionInput {
  sessionType: StudySessionType;
  mapId?: number;
  unitId?: number;
  lessonId?: number;
  gameType?: string;
}

// ============================================================
// Daily Progress & Goals
// ============================================================

export interface DailyProgress {
  userId: number;
  date: Date;

  // Goals
  targetVocabularyReviews: number;
  targetGrammarReviews: number;
  targetExercises: number;
  targetStudyMinutes: number;

  // Actual
  vocabularyReviewsCompleted: number;
  grammarReviewsCompleted: number;
  exercisesCompleted: number;
  studyMinutes: number;

  // Rewards
  xpEarned: number;
  coinsEarned: number;
  streakMaintained: boolean;
}

export interface UserLearningGoals {
  id: number;
  userId: number;

  // Daily targets
  dailyVocabularyReviews: number;
  dailyGrammarReviews: number;
  dailyNewVocabulary: number;
  dailyNewGrammar: number;
  dailyExercises: number;
  dailyStudyMinutes: number;

  // Preferences
  reviewReminder: boolean;
  reminderTime?: string;

  updatedAt: Date;
}

// ============================================================
// Leaderboard Types
// ============================================================

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';
export type LeaderboardMetric = 'xp' | 'vocabulary' | 'streak' | 'accuracy';

export interface MapLeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  value: number;
  metric: LeaderboardMetric;
}

export interface MapLeaderboard {
  mapId: number;
  period: LeaderboardPeriod;
  entries: MapLeaderboardEntry[];
  userRank?: MapLeaderboardEntry;
  totalParticipants: number;
  updatedAt: Date;
}

// ============================================================
// Achievement Progress Types
// ============================================================

export interface AchievementProgress {
  achievementId: number;
  userId: number;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  completedAt?: Date;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface GetUserProgressParams {
  userId?: number;
  includeActiveMaps?: boolean;
  includeDueReviews?: boolean;
}

export interface GetMapProgressParams {
  mapId: number;
  userId?: number;
  includeUnits?: boolean;
}

export interface GetUnitProgressParams {
  unitId: number;
  userId?: number;
  includeLessons?: boolean;
}

export interface CompleteLessonStudyParams {
  lessonId: number;
  userId?: number;
  vocabularyMastered?: number;
  grammarMastered?: number;
  timeSpentSeconds?: number;
}

export interface CompleteLessonStudyResult {
  lessonProgress: UserLessonProgress;
  xpEarned: number;
  coinsEarned: number;
  unlockedExam: boolean;
  levelUp?: {
    newLevel: number;
    xpRequired: number;
  };
}
