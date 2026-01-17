// ============================================================
// Grammar V3 Types - Master-User Separation
// ============================================================

import { CEFRLevel } from './vocabulary';
import { DifficultyLevel } from './conversation';

// ============================================================
// Master Grammar (Admin-managed, shared by all users)
// ============================================================

export interface MasterGrammar {
  id: number;
  grammarRule: string;
  explanation: string;
  explanationVi: string;
  category: string;
  cefrLevel: CEFRLevel;
  difficultyLevel: DifficultyLevel;

  // Grammar details
  formula?: string;
  examples?: GrammarExample[];
  commonMistakes?: string[];
  tips?: string;
  relatedGrammar?: string[];

  // Media
  videoUrl?: string;
  audioUrl?: string;

  // Metadata
  tags?: string[];
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface GrammarExample {
  en: string;
  vi: string;
  highlight?: string;
}

export interface MasterGrammarInput {
  grammarRule: string;
  explanation: string;
  explanationVi: string;
  category: string;
  cefrLevel: CEFRLevel;
  difficultyLevel?: DifficultyLevel;
  formula?: string;
  examples?: GrammarExample[];
  commonMistakes?: string[];
  tips?: string;
  relatedGrammar?: string[];
  tags?: string[];
}

// ============================================================
// User Grammar (User-specific progress)
// ============================================================

export type GrammarSourceType = 'conversation' | 'word_map' | 'manual' | 'game' | 'import';
export type GrammarReviewStatusV3 = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface UserGrammar {
  id: number;
  userId: number;
  masterGrammarId: number;

  // Learning source
  sourceType: GrammarSourceType;
  sourceId?: number;

  // SM2 Spaced Repetition fields
  masteryLevel: number;
  timesPracticed: number;
  lastPracticedAt?: Date;
  nextReviewAt?: Date;
  reviewInterval: number;
  easeFactor: number;
  repetitionCount: number;
  lapseCount: number;
  reviewStatus: GrammarReviewStatusV3;

  // User customizations
  userNotes?: string;
  isFavorited: boolean;
  isHidden: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Combined Types (for API responses)
// ============================================================

export interface GrammarWithProgress extends MasterGrammar {
  userProgress?: UserGrammar;
}

export interface GrammarV3Response {
  id: number;
  masterGrammarId: number;
  userGrammarId?: number;

  // Master data
  grammarRule: string;
  explanation: string;
  explanationVi: string;
  category: string;
  cefrLevel: CEFRLevel;
  difficultyLevel: DifficultyLevel;
  formula?: string;
  examples?: GrammarExample[];
  commonMistakes?: string[];
  tips?: string;
  relatedGrammar?: string[];

  // User progress (if authenticated)
  masteryLevel?: number;
  timesPracticed?: number;
  lastPracticedAt?: Date;
  nextReviewAt?: Date;
  reviewStatus?: GrammarReviewStatusV3;
  isFavorited?: boolean;
  userNotes?: string;
}

// ============================================================
// V3 Review Types
// ============================================================

export interface GrammarReviewV3 {
  id: number;
  userId: number;
  userGrammarId: number;
  quality: number;
  easeFactorBefore: number;
  easeFactorAfter: number;
  intervalBefore: number;
  intervalAfter: number;
  reviewType: 'flashcard' | 'quiz' | 'exercise' | 'game';
  timeSpentSeconds: number;
  reviewedAt: Date;
}

export interface GrammarReviewV3Input {
  userGrammarId: number;
  quality: number;
  reviewType?: 'flashcard' | 'quiz' | 'exercise' | 'game';
  timeSpentSeconds?: number;
}

export interface GrammarReviewV3Result {
  userGrammarId: number;
  newInterval: number;
  newEaseFactor: number;
  nextReviewAt: Date;
  reviewStatus: GrammarReviewStatusV3;
  intervalText: string;
}

// ============================================================
// V3 Queue Types
// ============================================================

export type GrammarQueuePriorityV3 = 'overdue' | 'due' | 'new';

export interface GrammarQueueItemV3 {
  id: number;
  userId: number;
  userGrammarId: number;
  queueDate: Date;
  priority: GrammarQueuePriorityV3;
  queueOrder: number;
  isCompleted: boolean;
  completedAt?: Date;
  qualityRating?: number;

  // Joined grammar data
  grammar: GrammarV3Response;
}

export interface GrammarReviewQueueV3 {
  date: Date;
  overdue: GrammarQueueItemV3[];
  due: GrammarQueueItemV3[];
  newItems: GrammarQueueItemV3[];
  totalCount: number;
  completedCount: number;
}

// ============================================================
// Filter & Search Types
// ============================================================

export interface MasterGrammarFilter {
  cefrLevel?: CEFRLevel;
  difficultyLevel?: DifficultyLevel;
  category?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UserGrammarFilter {
  userId: number;
  sourceType?: GrammarSourceType;
  reviewStatus?: GrammarReviewStatusV3;
  isFavorited?: boolean;
  category?: string;
  cefrLevel?: CEFRLevel;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================
// Grammar Tags
// ============================================================

export interface GrammarTag {
  id: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
}

export interface MasterGrammarTag {
  id: number;
  masterGrammarId: number;
  tagId: number;
  createdAt: Date;
}
