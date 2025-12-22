import { DifficultyLevel } from './conversation';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'interjection'
  | 'phrase';

export interface Vocabulary {
  id: number;
  conversationId: number;
  userId: number;
  vietnameseWord: string;
  englishWord: string;
  phonetic?: string;
  partOfSpeech: PartOfSpeech;
  exampleSentenceVi?: string;
  exampleSentenceEn?: string;
  difficultyLevel: DifficultyLevel;
  masteryLevel: number; // 0-100
  timesPracticed: number;
  lastPracticedAt?: Date;
  createdAt: Date;
}

export interface VocabularyInput {
  vietnameseWord: string;
  englishWord: string;
  phonetic?: string;
  partOfSpeech: PartOfSpeech;
  exampleSentenceVi?: string;
  exampleSentenceEn?: string;
  difficultyLevel?: DifficultyLevel;
}

export interface VocabularyFilter {
  userId: number;
  conversationId?: number;
  difficultyLevel?: DifficultyLevel;
  partOfSpeech?: PartOfSpeech;
  limit?: number;
  offset?: number;
}
