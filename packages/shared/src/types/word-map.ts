// ============================================================
// Word Map Types for Version 3
// Curriculum-based learning structure
// ============================================================

import { CEFRLevel } from './vocabulary';
import { DifficultyLevel } from './conversation';

// ============================================================
// Word Map (Top-level curriculum container)
// ============================================================

export interface WordMap {
  id: number;
  name: string;
  description?: string;
  coverImageUrl?: string;
  cefrLevel: CEFRLevel;
  publisher?: string;

  // Stats (cached)
  totalUnits: number;
  totalLessons: number;
  totalVocabulary: number;
  totalGrammar: number;
  estimatedHours?: number;

  // Pricing/Access
  isFree: boolean;
  priceCoins: number;
  priceGems: number;

  // Display & Status
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  isPublished: boolean;

  // Metadata
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordMapSummary {
  id: number;
  name: string;
  description?: string;
  coverImageUrl?: string;
  cefrLevel: CEFRLevel;
  publisher?: string;
  totalUnits: number;
  totalLessons: number;
  estimatedHours?: number;
  isFree: boolean;
  priceCoins: number;
  isFeatured: boolean;
}

// ============================================================
// Map Units
// ============================================================

export interface MapUnit {
  id: number;
  mapId: number;
  unitNumber: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;

  // Unit type
  isReviewUnit: boolean;
  reviewUnitIds?: number[];

  // Progression
  prerequisiteUnitId?: number;

  // Boss Exams configuration
  bossExamCount: number;
  bossPassingScore: number;

  // Content stats (cached)
  totalLessons: number;
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;

  // Rewards
  completionXp: number;
  completionCoins: number;

  // Display
  displayOrder: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface MapUnitWithLessons extends MapUnit {
  lessons: UnitLesson[];
}

// ============================================================
// Unit Lessons
// ============================================================

export type LessonType =
  | 'vocabulary'
  | 'grammar'
  | 'listening'
  | 'speaking'
  | 'reading'
  | 'writing'
  | 'mixed'
  | 'review'
  | 'project';

export interface UnitLesson {
  id: number;
  unitId: number;
  lessonNumber: number;
  title: string;
  lessonType: LessonType;
  description?: string;
  thumbnailUrl?: string;

  // Media content
  videoUrl?: string;
  audioUrl?: string;
  pdfPageStart?: number;
  pdfPageEnd?: number;

  // Progression
  prerequisiteLessonId?: number;

  // Boss Exam configuration
  hasBossExam: boolean;
  bossPassingScore: number;

  // Content stats (cached)
  totalVocabulary: number;
  totalGrammar: number;
  totalExercises: number;

  // Time & Rewards
  estimatedMinutes: number;
  studyXp: number;
  examXp: number;
  coinsReward: number;

  // Display
  displayOrder: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Lesson Content
// ============================================================

export type ContentType = 'vocabulary' | 'grammar' | 'exercise' | 'text' | 'audio' | 'video' | 'image';
export type ContentSection = 'warmup' | 'study' | 'practice' | 'review' | 'extension';

export interface LessonContent {
  id: number;
  lessonId: number;
  contentType: ContentType;

  // Reference to master content (mutually exclusive)
  masterVocabularyId?: number;
  masterGrammarId?: number;
  masterExerciseId?: number;

  // For custom content
  customContent?: CustomLessonContent;

  // Organization
  section: ContentSection;
  displayOrder: number;
  customInstructions?: string;

  isActive: boolean;
  createdAt: Date;
}

export interface CustomLessonContent {
  title?: string;
  content?: string;
  url?: string;
  transcript?: string;
}

// ============================================================
// Lesson Exams (Boss Exams)
// ============================================================

export interface LessonExam {
  id: number;
  lessonId?: number;
  unitId?: number;
  examNumber: number;

  title: string;
  description?: string;

  // Exam configuration
  timeLimitSeconds: number;
  passingScore: number;
  maxAttempts?: number;
  shuffleQuestions: boolean;
  showAnswersAfter: boolean;

  // Questions
  exerciseIds: number[];
  totalQuestions: number;
  totalPoints: number;
  randomQuestionCount?: number;

  // Rewards
  passXp: number;
  perfectScoreBonusXp: number;
  passCoins: number;
  perfectScoreBonusCoins: number;

  displayOrder: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Map Prerequisites
// ============================================================

export interface MapPrerequisite {
  id: number;
  mapId: number;
  prerequisiteMapId?: number;
  prerequisiteCefrLevel?: CEFRLevel;
  createdAt: Date;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface GetWordMapsParams {
  cefrLevel?: CEFRLevel;
  includeProgress?: boolean;
  userId?: number;
}

export interface GetWordMapDetailParams {
  mapId: number;
  userId?: number;
}

export interface ActivateWordMapParams {
  mapId: number;
  userId?: number;
}

export interface GetLessonContentParams {
  lessonId: number;
  includeExercises?: boolean;
  userId?: number;
}

export interface WordMapWithProgress extends WordMapSummary {
  userProgress?: {
    isActivated: boolean;
    completionPercentage: number;
    currentUnitId?: number;
    currentLessonId?: number;
    unitsCompleted: number;
    lessonsCompleted: number;
    totalXpEarned: number;
    lastActivityAt?: Date;
  };
}

export interface UnitWithProgress extends MapUnit {
  userProgress?: {
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    lessonsCompleted: number;
    completionPercentage: number;
    bestBossExamScore: number;
    xpEarned: number;
  };
  lessons?: LessonWithProgress[];
}

export interface LessonWithProgress extends UnitLesson {
  userProgress?: {
    status: 'locked' | 'unlocked' | 'studying' | 'exam_ready' | 'completed';
    contentProgressPercentage: number;
    bossExamPassed: boolean;
    bestExamScore: number;
    examAttempts: number;
    xpEarned: number;
  };
}

// ============================================================
// Admin Types (for content creation)
// ============================================================

export interface CreateWordMapInput {
  name: string;
  description?: string;
  cefrLevel: CEFRLevel;
  publisher?: string;
  coverImageUrl?: string;
  isFree?: boolean;
  priceCoins?: number;
  priceGems?: number;
  isFeatured?: boolean;
  estimatedHours?: number;
  units?: CreateUnitInput[];
}

export interface CreateUnitInput {
  unitNumber: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isReviewUnit?: boolean;
  bossExamCount?: number;
  bossPassingScore?: number;
  completionXp?: number;
  completionCoins?: number;
  lessons?: CreateLessonInput[];
}

export interface CreateLessonInput {
  lessonNumber: number;
  title: string;
  lessonType: LessonType;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  hasBossExam?: boolean;
  bossPassingScore?: number;
  estimatedMinutes?: number;
  studyXp?: number;
  examXp?: number;
  coinsReward?: number;
}

export interface AddLessonContentInput {
  lessonId: number;
  content: {
    contentType: ContentType;
    masterContentId?: number;
    customContent?: CustomLessonContent;
    section?: ContentSection;
  }[];
}
