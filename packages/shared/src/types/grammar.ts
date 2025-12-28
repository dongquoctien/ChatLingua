import { DifficultyLevel } from './conversation';

// ============================================================
// SM2 Review Status (same as vocabulary)
// ============================================================

export type GrammarReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

// ============================================================
// Grammar Point (Extended with SM2 fields)
// ============================================================

export interface GrammarPoint {
  id: number;
  conversationId: number;
  userId: number;
  grammarRule: string;
  explanation: string;
  exampleVi?: string;
  exampleEn?: string;
  category?: string; // e.g., "tense", "article", "preposition"
  difficultyLevel: DifficultyLevel;
  timesPracticed: number;
  createdAt: Date;
}

export interface GrammarPointWithReview extends GrammarPoint {
  // SM2 Spaced Repetition fields
  nextReviewAt?: Date;
  reviewInterval: number;     // Days until next review
  easeFactor: number;         // 1.3-5.0 (default 2.5)
  repetitionCount: number;
  lapseCount: number;
  reviewStatus: GrammarReviewStatus;
  masteryLevel: number;       // 0-100
  lastReviewedAt?: Date;
}

export interface GrammarPointInput {
  grammarRule: string;
  explanation: string;
  exampleVi?: string;
  exampleEn?: string;
  category?: string;
  difficultyLevel?: DifficultyLevel;
}

// ============================================================
// Grammar Exercise Types
// ============================================================

export type GrammarExerciseType =
  | 'error_correction'
  | 'verb_conjugation'
  | 'tense_selection'
  | 'article_usage'
  | 'preposition_fill'
  | 'sentence_transformation'
  | 'word_order';

export interface VerbData {
  base: string;              // Infinitive form (e.g., "go")
  tense: string;             // Target tense (e.g., "past simple")
  subject: string;           // Subject (e.g., "he", "they")
}

export interface GrammarExercise {
  id: number;
  userId: number;
  grammarPointId?: number;
  exerciseType: GrammarExerciseType;
  question: string;
  options?: string[];        // For selection-based exercises
  correctAnswer: string;
  explanation?: string;
  category?: string;
  difficultyLevel: DifficultyLevel;
  errorPosition?: number;    // For error_correction
  verbData?: VerbData;       // For verb_conjugation
  createdAt: Date;
}

export interface GrammarExerciseAttempt {
  id: number;
  grammarExerciseId: number;
  userId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  attemptedAt: Date;
}

// ============================================================
// Grammar Review (SM2 History)
// ============================================================

export type GrammarReviewType = 'flashcard' | 'quiz' | 'exercise';

export interface GrammarReview {
  id: number;
  userId: number;
  grammarPointId: number;
  quality: number;           // 0-5 rating
  easeFactorBefore: number;
  easeFactorAfter: number;
  intervalBefore: number;
  intervalAfter: number;
  reviewType: GrammarReviewType;
  timeSpentSeconds: number;
  reviewedAt: Date;
}

export interface GrammarReviewSubmission {
  grammarPointId: number;
  quality: number;           // 0-5: 0=blackout, 1=again, 2=hard, 3=good, 4=easy, 5=perfect
  reviewType?: GrammarReviewType;
  timeSpentSeconds?: number;
}

export interface GrammarReviewResult {
  grammarPointId: number;
  newInterval: number;
  newEaseFactor: number;
  nextReviewAt: Date;
  reviewStatus: GrammarReviewStatus;
}

// ============================================================
// Grammar Review Queue
// ============================================================

export type GrammarQueuePriority = 'overdue' | 'due' | 'new';

export interface GrammarQueueItem {
  id: number;
  userId: number;
  grammarPointId: number;
  grammarPoint: GrammarPointWithReview;
  queueDate: Date;
  priority: GrammarQueuePriority;
  queueOrder: number;
  isCompleted: boolean;
  completedAt?: Date;
  qualityRating?: number;
}

export interface GrammarReviewQueue {
  date: Date;
  overdue: GrammarQueueItem[];
  due: GrammarQueueItem[];
  newItems: GrammarQueueItem[];
  totalCount: number;
  completedCount: number;
}

// ============================================================
// Grammar Learning Goals
// ============================================================

export interface GrammarLearningGoals {
  id: number;
  userId: number;
  dailyNewRules: number;     // New grammar rules per day
  dailyReviews: number;      // Total reviews per day
  focusCategories?: string[]; // Categories to focus on
  isActive: boolean;
}

// ============================================================
// Grammar Statistics
// ============================================================

export interface GrammarStats {
  totalGrammarPoints: number;
  masteredCount: number;
  reviewingCount: number;
  learningCount: number;
  newCount: number;
  averageMastery: number;
  dueToday: number;
  overdueCount: number;
}
