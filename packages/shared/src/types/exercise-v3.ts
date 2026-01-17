// ============================================================
// Exercise V3 Types - Master-User Separation
// ============================================================

import { CEFRLevel } from './vocabulary';
import { DifficultyLevel } from './conversation';
import {
  ExerciseType,
  ExerciseData,
  SentenceBuildingData,
  MatchingData,
  SpellingData,
  ListeningData,
  ErrorCorrectionData,
  VerbConjugationData,
  ClozeData,
} from './exercise';

// Re-export exercise data types for convenience
export type {
  ExerciseType,
  ExerciseData,
  SentenceBuildingData,
  MatchingData,
  SpellingData,
  ListeningData,
  ErrorCorrectionData,
  VerbConjugationData,
  ClozeData,
};

// ============================================================
// Master Exercise (Admin-managed, shared by all users)
// ============================================================

export interface MasterExercise {
  id: number;
  exerciseType: ExerciseType;
  question: string;
  correctAnswer: string;
  cefrLevel: CEFRLevel;
  difficultyLevel: DifficultyLevel;

  // Exercise content
  options?: string[];
  exerciseData?: ExerciseData;
  explanation?: string;
  hint?: string;

  // Media
  audioUrl?: string;
  imageUrl?: string;

  // Related content
  relatedVocabularyIds?: number[];
  relatedGrammarIds?: number[];

  // Metadata
  category?: string;
  tags?: string[];
  timeLimitSeconds?: number;
  points: number;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface MasterExerciseInput {
  exerciseType: ExerciseType;
  question: string;
  correctAnswer: string;
  cefrLevel: CEFRLevel;
  difficultyLevel?: DifficultyLevel;
  options?: string[];
  exerciseData?: ExerciseData;
  explanation?: string;
  hint?: string;
  audioUrl?: string;
  imageUrl?: string;
  relatedVocabularyIds?: number[];
  relatedGrammarIds?: number[];
  category?: string;
  tags?: string[];
  timeLimitSeconds?: number;
  points?: number;
}

// ============================================================
// User Exercise Attempts (User-specific history)
// ============================================================

export interface UserExerciseAttempt {
  id: number;
  userId: number;
  masterExerciseId: number;

  // Attempt context
  lessonId?: number;
  examAttemptId?: number;
  gameSessionId?: number;

  // Attempt data
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  pointsEarned: number;

  // Metadata
  attemptNumber: number;
  attemptedAt: Date;
}

export interface UserExerciseAttemptInput {
  masterExerciseId: number;
  lessonId?: number;
  examAttemptId?: number;
  gameSessionId?: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

// ============================================================
// Combined Types (for API responses)
// ============================================================

export interface ExerciseV3Response {
  id: number;
  masterExerciseId: number;

  // Master data
  exerciseType: ExerciseType;
  question: string;
  correctAnswer: string;
  cefrLevel: CEFRLevel;
  difficultyLevel: DifficultyLevel;
  options?: string[];
  exerciseData?: ExerciseData;
  explanation?: string;
  hint?: string;
  audioUrl?: string;
  imageUrl?: string;
  timeLimitSeconds?: number;
  points: number;

  // User stats (if authenticated)
  totalAttempts?: number;
  correctAttempts?: number;
  lastAttemptAt?: Date;
  averageTimeSeconds?: number;
}

export interface ExerciseWithAttemptV3 extends MasterExercise {
  attempt?: UserExerciseAttempt;
}

// ============================================================
// Exam Attempt Types
// ============================================================

export type ExamAttemptStatus = 'in_progress' | 'completed' | 'abandoned' | 'timed_out';

export interface ExamAttempt {
  id: number;
  userId: number;
  lessonExamId: number;
  attemptNumber: number;
  status: ExamAttemptStatus;

  // Results
  score: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;

  // Time tracking
  startedAt: Date;
  completedAt?: Date;
  timeSpentSeconds: number;

  // Rewards
  xpEarned: number;
  coinsEarned: number;
}

export interface ExamAttemptInput {
  lessonExamId: number;
}

export interface ExamAnswerSubmission {
  attemptId: number;
  answers: ExamAnswer[];
  timeSpentSeconds: number;
}

export interface ExamAnswer {
  questionId: number;
  answer: string;
}

export interface ExamResult {
  attemptId: number;
  score: number;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  xpEarned: number;
  coinsEarned: number;
  timeSpentSeconds: number;

  // Question results
  questionResults: ExamQuestionResult[];

  // Next steps
  unlockedContent?: {
    type: 'lesson' | 'unit' | 'map';
    id: number;
    title: string;
  };
}

export interface ExamQuestionResult {
  questionId: number;
  masterExerciseId: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  explanation?: string;
}

// ============================================================
// Filter & Search Types
// ============================================================

export interface MasterExerciseFilter {
  exerciseType?: ExerciseType;
  cefrLevel?: CEFRLevel;
  difficultyLevel?: DifficultyLevel;
  category?: string;
  tags?: string[];
  relatedVocabularyId?: number;
  relatedGrammarId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UserExerciseHistoryFilter {
  userId: number;
  lessonId?: number;
  examAttemptId?: number;
  exerciseType?: ExerciseType;
  isCorrect?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================
// Exercise Tags
// ============================================================

export interface ExerciseTag {
  id: number;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
}

export interface MasterExerciseTag {
  id: number;
  masterExerciseId: number;
  tagId: number;
  createdAt: Date;
}
