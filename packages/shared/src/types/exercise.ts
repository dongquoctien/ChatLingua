import { DifficultyLevel } from './conversation';

// Extended exercise types (7 new types added)
export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'translation'
  | 'sentence_building'
  | 'matching'
  | 'spelling'
  | 'listening'
  | 'error_correction'
  | 'verb_conjugation'
  | 'cloze';

// Type-specific data interfaces
export interface SentenceBuildingData {
  words: string[];           // Scrambled words
  correctOrder: number[];    // Indices of correct order
  hint?: string;             // Optional hint
}

export interface MatchingPair {
  en: string;
  vi: string;
}

export interface MatchingData {
  pairs: MatchingPair[];     // Pairs to match (will be shuffled on display)
}

export interface SpellingData {
  word: string;              // Word to spell
  hint?: string;             // Vietnamese hint
  audioText?: string;        // Text for TTS if different from word
}

export interface ListeningData {
  transcript: string;        // Full transcript for dictation
  questionType: 'dictation' | 'comprehension';
  audioUrl?: string;         // Optional audio URL (fallback to TTS)
  playLimit?: number;        // Max number of plays (default: 3)
}

export interface ErrorCorrectionData {
  sentence: string;          // Sentence with error
  errorPosition: number;     // Index of error word
  errorType: 'grammar' | 'spelling' | 'word_choice';
  correctWord: string;       // Correct replacement
}

export interface VerbConjugationData {
  baseVerb: string;          // Infinitive form
  tense: string;             // Target tense (e.g., "past simple", "present perfect")
  subject: string;           // Subject pronoun (e.g., "he", "they")
  context?: string;          // Optional context sentence
}

export interface ClozeBlank {
  index: number;             // Position in passage (word index)
  answer: string;            // Correct answer
  options?: string[];        // Optional multiple choice options
}

export interface ClozeData {
  passage: string;           // Full passage with blanks marked as ___
  blanks: ClozeBlank[];      // Blank definitions
}

// Union type for exercise data
export type ExerciseData =
  | SentenceBuildingData
  | MatchingData
  | SpellingData
  | ListeningData
  | ErrorCorrectionData
  | VerbConjugationData
  | ClozeData;

export interface Exercise {
  id: number;
  conversationId?: number;
  userId: number;
  exerciseType: ExerciseType;
  question: string;
  options?: string[];        // For multiple choice
  correctAnswer: string;
  explanation?: string;
  relatedVocabularyIds?: number[];
  relatedGrammarIds?: number[];
  difficultyLevel: DifficultyLevel;
  isCombined: boolean;
  sourceConversationIds?: number[];
  exerciseData?: ExerciseData;  // Type-specific data
  audioUrl?: string;            // Audio URL for listening/spelling
  timeLimitSeconds?: number;    // Optional time limit
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
