// ============================================================
// Vocabulary V3 Types - Master-User Separation
// ============================================================

import {
  PartOfSpeech,
  CEFRLevel,
  Register,
  Definition,
  WordForms,
  WordFamily,
  Collocations,
  Idiom,
  GrammarInfo,
  TopicTag,
  DefinitionExample,
} from './vocabulary';
import { DifficultyLevel } from './conversation';

// ============================================================
// Master Vocabulary (Admin-managed, shared by all users)
// ============================================================

export interface MasterVocabulary {
  id: number;
  englishWord: string;
  vietnameseWord: string;
  phonetic?: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
  audioUkUrl?: string;
  audioUsUrl?: string;
  partOfSpeech: PartOfSpeech;
  cefrLevel: CEFRLevel;
  difficultyLevel: DifficultyLevel;

  // Oxford-style dictionary fields
  definitions?: Definition[];
  wordForms?: WordForms;
  wordFamily?: WordFamily;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: Collocations;
  idioms?: Idiom[];
  usageNotes?: string;
  grammarInfo?: GrammarInfo;
  register?: Register;
  extraExamples?: DefinitionExample[];
  frequencyRank?: number;
  topics?: TopicTag[];
  wordOrigin?: string;
  seeAlso?: string[];

  // Metadata
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface MasterVocabularyInput {
  englishWord: string;
  vietnameseWord: string;
  phonetic?: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
  partOfSpeech: PartOfSpeech;
  cefrLevel: CEFRLevel;
  difficultyLevel?: DifficultyLevel;
  definitions?: Omit<Definition, 'senseId'>[];
  wordForms?: WordForms;
  wordFamily?: WordFamily;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: Collocations;
  idioms?: Idiom[];
  usageNotes?: string;
  grammarInfo?: GrammarInfo;
  register?: Register;
  extraExamples?: DefinitionExample[];
  topics?: TopicTag[];
  wordOrigin?: string;
  seeAlso?: string[];
  tags?: string[];
}

// ============================================================
// User Vocabulary (User-specific progress)
// ============================================================

export type VocabularySourceType = 'conversation' | 'word_map' | 'manual' | 'game' | 'import';
export type ReviewStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface UserVocabulary {
  id: number;
  userId: number;
  masterVocabularyId: number;

  // Learning source
  sourceType: VocabularySourceType;
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
  reviewStatus: ReviewStatus;

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

export interface VocabularyWithProgress extends MasterVocabulary {
  userProgress?: UserVocabulary;
}

export interface VocabularyV3Response {
  id: number;
  masterVocabularyId: number;
  userVocabularyId?: number;

  // Master data
  englishWord: string;
  vietnameseWord: string;
  phonetic?: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
  audioUkUrl?: string;
  audioUsUrl?: string;
  partOfSpeech: PartOfSpeech;
  cefrLevel: CEFRLevel;
  difficultyLevel: DifficultyLevel;

  // Dictionary data
  definitions?: Definition[];
  wordForms?: WordForms;
  wordFamily?: WordFamily;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: Collocations;
  idioms?: Idiom[];
  usageNotes?: string;
  grammarInfo?: GrammarInfo;
  register?: Register;
  extraExamples?: DefinitionExample[];
  topics?: TopicTag[];

  // User progress (if authenticated)
  masteryLevel?: number;
  timesPracticed?: number;
  lastPracticedAt?: Date;
  nextReviewAt?: Date;
  reviewStatus?: ReviewStatus;
  isFavorited?: boolean;
  userNotes?: string;
}

// ============================================================
// V3 Review Types
// ============================================================

export interface VocabularyReviewV3 {
  id: number;
  userId: number;
  userVocabularyId: number;
  quality: number;
  easeFactorBefore: number;
  easeFactorAfter: number;
  intervalBefore: number;
  intervalAfter: number;
  reviewType: 'flashcard' | 'quiz' | 'exercise' | 'game';
  direction: 'vi_to_en' | 'en_to_vi';
  timeSpentSeconds: number;
  reviewedAt: Date;
}

export interface VocabularyReviewV3Input {
  userVocabularyId: number;
  quality: number;
  reviewType?: 'flashcard' | 'quiz' | 'exercise' | 'game';
  direction?: 'vi_to_en' | 'en_to_vi';
  timeSpentSeconds?: number;
}

export interface VocabularyReviewV3Result {
  userVocabularyId: number;
  newInterval: number;
  newEaseFactor: number;
  nextReviewAt: Date;
  reviewStatus: ReviewStatus;
  intervalText: string;
}

// ============================================================
// V3 Queue Types
// ============================================================

export type QueuePriority = 'overdue' | 'due' | 'new';

export interface VocabularyQueueItemV3 {
  id: number;
  userId: number;
  userVocabularyId: number;
  queueDate: Date;
  priority: QueuePriority;
  queueOrder: number;
  isCompleted: boolean;
  completedAt?: Date;
  qualityRating?: number;

  // Joined vocabulary data
  vocabulary: VocabularyV3Response;
}

export interface VocabularyReviewQueueV3 {
  date: Date;
  overdue: VocabularyQueueItemV3[];
  due: VocabularyQueueItemV3[];
  newItems: VocabularyQueueItemV3[];
  totalCount: number;
  completedCount: number;
}

// ============================================================
// Filter & Search Types
// ============================================================

export interface MasterVocabularyFilter {
  cefrLevel?: CEFRLevel;
  difficultyLevel?: DifficultyLevel;
  partOfSpeech?: PartOfSpeech;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UserVocabularyFilter {
  userId: number;
  sourceType?: VocabularySourceType;
  reviewStatus?: ReviewStatus;
  isFavorited?: boolean;
  cefrLevel?: CEFRLevel;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================
// Vocabulary Tags
// ============================================================

export interface VocabularyTag {
  id: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
}

export interface MasterVocabularyTag {
  id: number;
  masterVocabularyId: number;
  tagId: number;
  createdAt: Date;
}
