// Spaced Repetition & Review Types

// ============================================================
// Enums & Basic Types
// ============================================================

export type ReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
export type ReviewType = 'flashcard' | 'quiz' | 'exercise';
export type FlashcardDirection = 'vi_to_en' | 'en_to_vi' | 'mixed';
export type QueuePriority = 'overdue' | 'due' | 'new';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

// ============================================================
// Queue Types
// ============================================================

export interface QueueItem {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic: string | null;
  pronunciationUk: string | null;
  pronunciationUs: string | null;
  partOfSpeech: string | null;
  difficultyLevel: string;
  cefrLevel: string | null;
  definitions: unknown[] | null;
  // SM2 info
  reviewStatus: ReviewStatus;
  easeFactor: number;
  reviewInterval: number;
  nextReviewAt: Date | null;
  // Queue info
  priority: QueuePriority;
}

export interface QueueStats {
  due: number;
  overdue: number;
  new: number;
  completed: number;
  total: number;
}

// ============================================================
// Review Submission Types
// ============================================================

export interface ReviewSubmission {
  vocabularyId: number;
  rating?: ReviewRating;
  quality?: number; // 0-5 (alternative to rating)
  direction?: 'vi_to_en' | 'en_to_vi';
  timeSpentSeconds?: number;
  reviewType?: ReviewType;
}

export interface ReviewResult {
  success: boolean;
  nextReviewAt: Date;
  newInterval: number;
  newEaseFactor: number;
  newStatus: ReviewStatus;
  intervalText: string;
}

export interface BatchReviewSubmission {
  reviews: Array<{
    vocabularyId: number;
    rating?: ReviewRating;
    quality?: number;
    timeSpentSeconds?: number;
  }>;
  reviewType?: ReviewType;
}

export interface BatchReviewResult {
  success: boolean;
  processed: number;
  results: Array<{
    vocabularyId: number;
    nextReviewAt: Date;
    newStatus: ReviewStatus;
  }>;
}

// ============================================================
// Statistics Types
// ============================================================

export interface ReviewStats {
  dueToday: number;
  overdueCount: number;
  newAvailable: number;
  completedToday: number;
  totalReviews: number;
  averageEaseFactor: number;
  masteredCount: number;
  learningCount: number;
  reviewingCount: number;
}

export interface ReviewHistoryItem {
  id: number;
  vocabularyId: number;
  englishWord: string;
  vietnameseWord: string;
  quality: number;
  qualityLabel: string;
  easeFactorBefore: number;
  easeFactorAfter: number;
  intervalBefore: number;
  intervalAfter: number;
  reviewType: ReviewType;
  direction: 'vi_to_en' | 'en_to_vi';
  timeSpentSeconds: number;
  reviewedAt: Date;
}

export interface ReviewHistoryResponse {
  data: ReviewHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Streak Types
// ============================================================

export interface ReviewStreak {
  currentStreak: number;
  longestStreak: number;
  lastReviewDate: Date | null;
  streakStartDate: Date | null;
  totalReviewDays: number;
}

// ============================================================
// Learning Goals Types
// ============================================================

export interface LearningGoals {
  id: number;
  userId: number;
  dailyNewWords: number;
  dailyReviews: number;
  reminderEnabled: boolean;
  reminderTime: string;
  preferredDirection: FlashcardDirection;
  isActive: boolean;
}

export interface LearningGoalsUpdate {
  dailyNewWords?: number;
  dailyReviews?: number;
  reminderEnabled?: boolean;
  reminderTime?: string;
  preferredDirection?: FlashcardDirection;
}

// ============================================================
// Flashcard Session Types
// ============================================================

export interface FlashcardSession {
  items: QueueItem[];
  currentIndex: number;
  direction: FlashcardDirection;
  startedAt: Date;
  completedCount: number;
  correctCount: number;
}

export interface FlashcardCard {
  item: QueueItem;
  direction: 'vi_to_en' | 'en_to_vi';
  isFlipped: boolean;
}

// ============================================================
// SM2 Algorithm Types (for reference)
// ============================================================

export interface SM2Parameters {
  quality: number;        // 0-5 rating
  interval: number;       // Current interval in days
  easeFactor: number;     // Current ease factor (1.3-5.0)
  repetitionCount: number;// Number of successful reviews
  lapseCount: number;     // Number of times forgotten
}

export interface SM2Result {
  nextReviewAt: Date;
  newInterval: number;
  newEaseFactor: number;
  newRepetitionCount: number;
  newLapseCount: number;
  newStatus: ReviewStatus;
}

/**
 * SM2 Quality Rating Guide:
 *
 * For UI with 4 buttons (Anki-style):
 * - Again (1): Complete failure, need to relearn
 * - Hard (2):  Recalled with serious difficulty
 * - Good (3):  Recalled with some effort (normal)
 * - Easy (5):  Perfect, instant recall
 *
 * Internal quality scale (0-5):
 * 0 - Complete blackout (not used in 4-button UI)
 * 1 - Wrong, but recognized answer (Again)
 * 2 - Wrong, seemed easy to recall (Hard)
 * 3 - Correct with serious difficulty (Good)
 * 4 - Correct with some hesitation
 * 5 - Perfect, instant recall (Easy)
 */
