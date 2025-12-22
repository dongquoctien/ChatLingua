import { DifficultyLevel } from './conversation';

export type ExerciseType = 'multiple_choice' | 'fill_blank' | 'translation';

export interface Exercise {
  id: number;
  conversationId?: number;
  userId: number;
  exerciseType: ExerciseType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  explanation?: string;
  relatedVocabularyIds?: number[];
  relatedGrammarIds?: number[];
  difficultyLevel: DifficultyLevel;
  isCombined: boolean;
  sourceConversationIds?: number[];
  createdAt: Date;
}

export interface ExerciseGenerateInput {
  userId: number;
  conversationIds: number[];
  exerciseTypes?: ExerciseType[];
  count?: number;
  difficultyLevel?: DifficultyLevel;
}

export interface ExerciseAttempt {
  id: number;
  exerciseId: number;
  userId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
  attemptedAt: Date;
}

export interface ExerciseAttemptInput {
  exerciseId: number;
  userId: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

export interface ExerciseWithAttempts extends Exercise {
  attempts: ExerciseAttempt[];
}
